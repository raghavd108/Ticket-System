const prisma = require("../config/prisma");
const { uploadImage } = require("../services/imagekitService");
const { getSignedImageUrl } = require("../services/fileService");
const { sendNotification } = require("../services/fcmService");

// =====================================================
// COMMON HELPERS
// =====================================================

const complaintInclude = {
  user: {
    select: {
      id: true,
      userName: true,
      email: true,
      mobileNumber: true,
    },
  },
  organisation: {
    select: {
      id: true,
      name: true,
      orgType: true,
    },
  },
  assignedEmployee: {
    select: {
      id: true,
      userName: true,
      email: true,
      mobileNumber: true,
      designation: true,
    },
  },
  images: {
    select: {
      id: true,
      fileName: true,
    },
  },
};

function getOrganisationId(user) {
  if (!user) return null;

  const id =
    user.organisationId ??
    user.organisation?.id ??
    user.organisation?._id ??
    user.organisation;

  return id ? String(id) : null;
}

function normalizeStatus(status) {
  return status === "in-progress" ? "in_progress" : status;
}

function displayStatus(status) {
  return status === "in_progress" ? "in-progress" : status;
}

function isValidStatus(status) {
  return ["pending", "in-progress", "in_progress", "resolved"].includes(status);
}

function getUserId(user) {
  const id = user?.id ?? user?._id;
  return id ? String(id) : null;
}

// Clients assigned to employees belonging to an organisation.
async function getAssignedClientIds(organisationId) {
  if (!organisationId) return [];

  const assignments = await prisma.userAssignment.findMany({
    where: {
      employee: {
        role: "employee",
        organisationId,
      },
      client: {
        role: "client",
      },
    },
    select: {
      clientId: true,
    },
  });

  return [...new Set(assignments.map((item) => item.clientId))];
}

// Clients assigned to a particular employee.
async function getEmployeeClientIds(employeeId, organisationId) {
  const assignments = await prisma.userAssignment.findMany({
    where: {
      employeeId,
      employee: {
        id: employeeId,
        role: "employee",
        ...(organisationId ? { organisationId } : {}),
      },
      client: {
        role: "client",
      },
    },
    select: {
      clientId: true,
    },
  });

  return [...new Set(assignments.map((item) => item.clientId))];
}

// Check whether an employee is assigned to the ticket's client.
async function isEmployeeAssignedToClient(employeeId, clientId) {
  const assignment = await prisma.userAssignment.findUnique({
    where: {
      clientId_employeeId: {
        clientId,
        employeeId,
      },
    },
    select: {
      clientId: true,
    },
  });

  return Boolean(assignment);
}

// Convert Prisma complaint records into the existing API response format.
async function formatComplaint(complaint) {
  if (!complaint) return null;

  const {
    userId,
    organisationId,
    assignedEmployeeId,
    images,
    user,
    organisation,
    assignedEmployee,
    status,
    ...rest
  } = complaint;

  const formattedImages = await Promise.all(
    (images || []).map(async (image) => ({
      ...image,
      _id: image.id,
      url: await getSignedImageUrl(image.fileName),
    })),
  );

  return {
    ...rest,
    _id: complaint.id,
    status: displayStatus(status),

    user: user
      ? {
          ...user,
          _id: user.id,
        }
      : userId,

    organisation: organisation
      ? {
          ...organisation,
          _id: organisation.id,
        }
      : organisationId,

    assignedEmployeeId: assignedEmployeeId || null,

    assignedEmployee: assignedEmployee
      ? {
          ...assignedEmployee,
          _id: assignedEmployee.id,
        }
      : null,

    image: formattedImages,
  };
}

// =====================================================
// CREATE COMPLAINT
// POST /complain
// =====================================================

async function complain(req, res) {
  try {
    const { module, problem } = req.body;

    if (
      typeof module !== "string" ||
      !module.trim() ||
      typeof problem !== "string" ||
      !problem.trim()
    ) {
      return res.status(400).json({
        message: "Module and problem are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Complaint image is required",
      });
    }

    const userId = getUserId(req.user);
    const organisationId = getOrganisationId(req.user);

    if (!userId || !organisationId) {
      return res.status(400).json({
        message: "User or organisation not found",
      });
    }

    // Only clients can create complaints.
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organisationId,
        role: "client",
      },
      select: {
        id: true,
        userName: true,
        organisationId: true,
      },
    });

    if (!user) {
      return res.status(403).json({
        message: "Only an organisation client can create a complaint",
      });
    }

    // Upload images and store file names, not permanent public URLs.
    const uploadedImages = [];

    for (const file of req.files) {
      if (!file.buffer || !file.originalname) {
        return res.status(400).json({
          message: "Invalid complaint image",
        });
      }

      const result = await uploadImage(file.buffer, file.originalname);

      if (!result?.fileName) {
        throw new Error("Image upload did not return a file name");
      }

      uploadedImages.push({
        fileName: result.fileName,
      });
    }

    const complaint = await prisma.complaint.create({
      data: {
        module: module.trim(),
        problem: problem.trim(),
        userId,
        organisationId,
        status: "pending",
        images: {
          create: uploadedImages,
        },
      },
      include: complaintInclude,
    });

    // Notify organisation admins and employees assigned to this client.
    try {
      const [admins, assignments] = await Promise.all([
        prisma.user.findMany({
          where: {
            role: "admin",
            organisationId,
          },
          select: {
            id: true,
            userName: true,
            role: true,
            fcmToken: true,
          },
        }),

        prisma.userAssignment.findMany({
          where: {
            clientId: userId,
            employee: {
              role: "employee",
            },
          },
          select: {
            employee: {
              select: {
                id: true,
                userName: true,
                role: true,
                fcmToken: true,
              },
            },
          },
        }),
      ]);

      const assignedEmployees = assignments
        .map((assignment) => assignment.employee)
        .filter(Boolean);

      const recipients = [
        ...new Map(
          [...admins, ...assignedEmployees].map((recipient) => [
            recipient.id,
            recipient,
          ]),
        ).values(),
      ];

      for (const recipient of recipients) {
        const title = "New Ticket Created";
        const body = `${user.userName || "A client"} created a new ticket`;

        try {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title,
              body,
              type: "NEW_TICKET",
              complaintId: complaint.id,
            },
          });

          if (recipient.fcmToken) {
            await sendNotification({
              fcmToken: recipient.fcmToken,
              title,
              body,
              type: "NEW_TICKET",
              targetRole: recipient.role,
            });
          }
        } catch (notificationError) {
          console.error(
            `Notification failed for ${recipient.id}:`,
            notificationError.message,
          );
        }
      }
    } catch (notificationError) {
      console.error("Complaint notification error:", notificationError.message);
    }

    return res.status(201).json({
      message: "Complaint registered successfully",
      complaint: await formatComplaint(complaint),
    });
  } catch (error) {
    console.error("Complaint creation error:", error);

    return res.status(500).json({
      message: "Server error while creating complaint",
    });
  }
}

// =====================================================
// GET COMPLAINTS
// GET /complain
// =====================================================

async function getComplain(req, res) {
  try {
    const userId = getUserId(req.user);
    const role = req.user?.role;
    const organisationId = getOrganisationId(req.user);

    if (!userId) {
      return res.status(401).json({
        message: "Authenticated user not found",
      });
    }

    let where;

    if (role === "admin") {
      if (!organisationId) {
        return res.status(400).json({
          message: "Your account is not linked to an organisation",
        });
      }

      const assignedClientIds = await getAssignedClientIds(organisationId);

      where = {
        OR: [
          {
            organisationId,
          },
          ...(assignedClientIds.length
            ? [
                {
                  userId: {
                    in: assignedClientIds,
                  },
                },
              ]
            : []),
        ],
      };
    } else if (role === "employee") {
      const clientIds = await getEmployeeClientIds(userId, organisationId);

      // Employees can see tickets for their assigned clients and
      // tickets explicitly assigned to them using assignedEmployeeId.
      where = {
        OR: [
          {
            assignedEmployeeId: userId,
          },
          ...(clientIds.length
            ? [
                {
                  userId: {
                    in: clientIds,
                  },
                },
              ]
            : []),
        ],
      };
    } else if (role === "client") {
      where = {
        userId,
        organisationId,
      };
    } else {
      return res.status(403).json({
        message: "You are not authorized to view complaints",
      });
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: complaintInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedComplaints = await Promise.all(
      complaints.map(formatComplaint),
    );

    return res.status(200).json({
      complains: formattedComplaints,
    });
  } catch (error) {
    console.error("Get complaints error:", error);

    return res.status(500).json({
      message: "Unable to fetch complaints",
    });
  }
}

// =====================================================
// UPDATE COMPLAINT STATUS
// PATCH /complain/:id/status
// =====================================================

async function updateComplaintStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Complaint ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    if (!isValidStatus(status)) {
      return res.status(400).json({
        message: "Invalid complaint status",
      });
    }

    const userId = getUserId(req.user);
    const role = req.user?.role;
    const organisationId = getOrganisationId(req.user);

    const complaint = await prisma.complaint.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            role: true,
            organisationId: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (role === "employee") {
      const directlyAssigned = complaint.assignedEmployeeId === userId;

      const assignedClient = await isEmployeeAssignedToClient(
        userId,
        complaint.userId,
      );

      if (!directlyAssigned && !assignedClient) {
        return res.status(403).json({
          message: "You are not authorized to update this complaint",
        });
      }
    } else if (role === "admin") {
      if (!organisationId) {
        return res.status(403).json({
          message: "Your account is not linked to an organisation",
        });
      }

      const assignedClientIds = await getAssignedClientIds(organisationId);

      const isOwnOrganisationComplaint =
        complaint.organisationId === organisationId;

      const isAssignedClientComplaint = assignedClientIds.includes(
        complaint.userId,
      );

      // Also allow the admin's organisation to manage tickets
      // explicitly assigned to its employees.
      const isAssignedToOrganisationEmployee = complaint.assignedEmployeeId
        ? Boolean(
            await prisma.user.findFirst({
              where: {
                id: complaint.assignedEmployeeId,
                role: "employee",
                organisationId,
              },
              select: {
                id: true,
              },
            }),
          )
        : false;

      if (
        !isOwnOrganisationComplaint &&
        !isAssignedClientComplaint &&
        !isAssignedToOrganisationEmployee
      ) {
        return res.status(403).json({
          message: "You are not authorized to update this complaint",
        });
      }
    } else {
      return res.status(403).json({
        message: "You are not authorized to update complaint status",
      });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: {
        id,
      },
      data: {
        status: normalizeStatus(status),
      },
      include: complaintInclude,
    });

    // Notify the client about the status change.
    try {
      const client = complaint.user;

      if (client) {
        const normalizedDisplayStatus = displayStatus(normalizeStatus(status));

        const title = "Ticket Status Updated";
        const body = `Your ticket status is now ${normalizedDisplayStatus}`;

        await prisma.notification.create({
          data: {
            userId: client.id,
            title,
            body,
            type: "STATUS_UPDATE",
            complaintId: complaint.id,
          },
        });

        if (client.fcmToken) {
          await sendNotification({
            fcmToken: client.fcmToken,
            title,
            body,
            type: "STATUS_UPDATE",
            targetRole: "client",
          });
        }
      }
    } catch (notificationError) {
      console.error("Client notification error:", notificationError.message);
    }

    return res.status(200).json({
      message: "Status updated successfully",
      complaint: await formatComplaint(updatedComplaint),
    });
  } catch (error) {
    console.error("Status update error:", error);

    return res.status(500).json({
      message: "Server error while updating complaint status",
    });
  }
}

// =====================================================
// ASSIGN COMPLAINT TO EMPLOYEE
// PATCH /complain/:id/assign
// Admin only
// =====================================================

async function assignComplaint(req, res) {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    const adminId = getUserId(req.user);
    const organisationId = getOrganisationId(req.user);

    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can assign complaints",
      });
    }

    if (!adminId || !organisationId) {
      return res.status(400).json({
        message: "Admin or organisation not found",
      });
    }

    if (!id || !employeeId || typeof employeeId !== "string") {
      return res.status(400).json({
        message: "Complaint ID and employeeId are required",
      });
    }

    const [complaint, employee] = await Promise.all([
      prisma.complaint.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          userId: true,
          organisationId: true,
          assignedEmployeeId: true,
        },
      }),

      prisma.user.findFirst({
        where: {
          id: employeeId,
          role: "employee",
          organisationId,
        },
        select: {
          id: true,
          userName: true,
          role: true,
          fcmToken: true,
        },
      }),
    ]);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found in your organisation",
      });
    }

    // The admin must be authorized to manage the ticket.
    const assignedClientIds = await getAssignedClientIds(organisationId);

    const isOwnOrganisationComplaint =
      complaint.organisationId === organisationId;

    const isAssignedClientComplaint = assignedClientIds.includes(
      complaint.userId,
    );

    if (!isOwnOrganisationComplaint && !isAssignedClientComplaint) {
      return res.status(403).json({
        message: "You are not authorized to assign this complaint",
      });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: {
        id,
      },
      data: {
        assignedEmployeeId: employee.id,
      },
      include: complaintInclude,
    });

    // Notify the newly assigned employee.
    try {
      const title = "Ticket Assigned to You";
      const body = `A ticket has been assigned to you: ${updatedComplaint.module}`;

      await prisma.notification.create({
        data: {
          userId: employee.id,
          title,
          body,
          type: "NEW_TICKET",
          complaintId: complaint.id,
        },
      });

      if (employee.fcmToken) {
        await sendNotification({
          fcmToken: employee.fcmToken,
          title,
          body,
          type: "NEW_TICKET",
          targetRole: "employee",
        });
      }
    } catch (notificationError) {
      console.error(
        "Assignment notification error:",
        notificationError.message,
      );
    }

    return res.status(200).json({
      message: "Complaint assigned successfully",
      complaint: await formatComplaint(updatedComplaint),
    });
  } catch (error) {
    console.error("Assign complaint error:", error);

    return res.status(500).json({
      message: "Server error while assigning complaint",
    });
  }
}

// =====================================================
// SEARCH COMPLAINTS
// GET /complain/search?q=searchValue
// =====================================================

async function searchComplaint(req, res) {
  try {
    const { q } = req.query;

    if (typeof q !== "string" || !q.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const searchText = q.trim();
    const userId = getUserId(req.user);
    const role = req.user?.role;
    const organisationId = getOrganisationId(req.user);

    const searchCondition = {
      OR: [
        {
          module: {
            contains: searchText,
          },
        },
        {
          problem: {
            contains: searchText,
          },
        },
      ],
    };

    let accessCondition;

    if (role === "admin") {
      if (!organisationId) {
        return res.status(400).json({
          message: "Your account is not linked to an organisation",
        });
      }

      const assignedClientIds = await getAssignedClientIds(organisationId);

      accessCondition = {
        OR: [
          {
            organisationId,
          },
          ...(assignedClientIds.length
            ? [
                {
                  userId: {
                    in: assignedClientIds,
                  },
                },
              ]
            : []),
          {
            assignedEmployee: {
              is: {
                role: "employee",
                organisationId,
              },
            },
          },
        ],
      };
    } else if (role === "employee") {
      const clientIds = await getEmployeeClientIds(userId, organisationId);

      accessCondition = {
        OR: [
          {
            assignedEmployeeId: userId,
          },
          ...(clientIds.length
            ? [
                {
                  userId: {
                    in: clientIds,
                  },
                },
              ]
            : []),
        ],
      };
    } else if (role === "client") {
      accessCondition = {
        userId,
        organisationId,
      };
    } else {
      return res.status(403).json({
        message: "You are not authorized to search complaints",
      });
    }

    const complaints = await prisma.complaint.findMany({
      where: {
        AND: [accessCondition, searchCondition],
      },
      include: complaintInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedComplaints = await Promise.all(
      complaints.map(formatComplaint),
    );

    return res.status(200).json({
      message: "Complaint fetched successfully",
      complaint: formattedComplaints,
    });
  } catch (error) {
    console.error("Complaint search error:", error);

    return res.status(500).json({
      message: "Unable to search complaints",
    });
  }
}

// =====================================================
// EXPORT CONTROLLERS
// =====================================================

module.exports = {
  complain,
  getComplain,
  updateComplaintStatus,
  assignComplaint,
  searchComplaint,
};
