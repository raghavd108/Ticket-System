const prisma = require("../config/prisma");
const { uploadImage } = require("../services/imagekitService");
const { getImageUrl } = require("../services/fileService");
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
    },
  },
  organisation: {
    select: {
      id: true,
      name: true,
      orgType: true,
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

// Get all clients assigned to employees belonging to this organisation.
// A client may belong to a different organisation.
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

// Get clients assigned to one particular employee.
async function getEmployeeClientIds(employeeId, organisationId) {
  const assignments = await prisma.userAssignment.findMany({
    where: {
      employeeId,
      employee: {
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

function formatComplaint(complaint) {
  if (!complaint) return null;

  const {
    userId,
    organisationId,
    images,
    user,
    organisation,
    status,
    ...rest
  } = complaint;

  return {
    ...rest,
    _id: complaint.id,
    status: status === "in_progress" ? "in-progress" : status,

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

    image: (images || []).map((image) => ({
      ...image,
      _id: image.id,
      url: getImageUrl(image.fileName),
    })),
  };
}

function normalizeStatus(status) {
  return status === "in-progress" ? "in_progress" : status;
}

function isValidStatus(status) {
  return ["pending", "in-progress", "in_progress", "resolved"].includes(status);
}

// =====================================================
// CREATE COMPLAINT
// POST /complain
// =====================================================

async function complain(req, res) {
  try {
    const { module, problem } = req.body;

    if (!module || !problem) {
      return res.status(400).json({
        message: "Module and problem are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Complaint image is required",
      });
    }

    const userId = req.user.id;
    const organisationId = getOrganisationId(req.user);

    if (!organisationId) {
      return res.status(400).json({
        message: "Organisation not found",
      });
    }

    // Only a valid client can create a complaint.
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

    // Upload images.
    const uploadedImages = [];

    for (const file of req.files) {
      const result = await uploadImage(file.buffer, file.originalname);

      uploadedImages.push({
        fileName: result.fileName,
      });
    }

    // Save complaint in MySQL.
    const complaint = await prisma.complaint.create({
      data: {
        module,
        problem,
        userId,
        organisationId,
        status: "pending",
        images: {
          create: uploadedImages,
        },
      },
      include: complaintInclude,
    });

    // Notify admins in the client's organisation and employees
    // assigned to this client, regardless of organisation.
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
      complaint: formatComplaint(complaint),
    });
  } catch (error) {
    console.error("Complaint creation error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// =====================================================
// GET COMPLAINTS
// GET /complain
// =====================================================

async function getComplain(req, res) {
  try {
    const { id: userId, role } = req.user;
    const organisationId = getOrganisationId(req.user);

    let where;

    if (role === "admin") {
      if (!organisationId) {
        return res.status(400).json({
          message: "Your account is not linked to an organisation",
        });
      }

      const assignedClientIds = await getAssignedClientIds(organisationId);

      // Admin sees:
      // 1. Complaints belonging to their own organisation.
      // 2. Complaints created by clients assigned to their employees.
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

      if (clientIds.length === 0) {
        return res.status(200).json({
          complains: [],
        });
      }

      // Do not filter by employee organisation here.
      // The client's organisation may be different.
      where = {
        userId: {
          in: clientIds,
        },
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

    return res.status(200).json({
      complains: complaints.map(formatComplaint),
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

    const organisationId = getOrganisationId(req.user);

    if (req.user.role === "employee") {
      // Employee can update only complaints belonging to assigned clients.
      const assignment = await prisma.userAssignment.findUnique({
        where: {
          clientId_employeeId: {
            clientId: complaint.userId,
            employeeId: req.user.id,
          },
        },
      });

      if (!assignment) {
        return res.status(403).json({
          message: "You are not authorized to update this complaint",
        });
      }
    } else if (req.user.role === "admin") {
      const assignedClientIds = await getAssignedClientIds(organisationId);

      const isOwnOrganisationComplaint =
        Boolean(organisationId) && complaint.organisationId === organisationId;

      const isAssignedClientComplaint = assignedClientIds.includes(
        complaint.userId,
      );

      if (!isOwnOrganisationComplaint && !isAssignedClientComplaint) {
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
        const title = "Ticket Status Updated";
        const body = `Your ticket status is now ${status}`;

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
      complaint: formatComplaint(updatedComplaint),
    });
  } catch (error) {
    console.error("Status update error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// =====================================================
// SEARCH COMPLAINTS
// GET /complain/search?q=searchValue
// =====================================================

async function searchCompalin(req, res) {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const searchText = q.trim();
    const { id: userId, role } = req.user;
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

    let where;

    if (role === "admin") {
      if (!organisationId) {
        return res.status(400).json({
          message: "Your account is not linked to an organisation",
        });
      }

      const assignedClientIds = await getAssignedClientIds(organisationId);

      where = {
        AND: [
          {
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
          },
          searchCondition,
        ],
      };
    } else if (role === "employee") {
      const clientIds = await getEmployeeClientIds(userId, organisationId);

      if (clientIds.length === 0) {
        return res.status(200).json({
          message: "Complaint fetched successfully",
          complaint: [],
        });
      }

      where = {
        userId: {
          in: clientIds,
        },
        ...searchCondition,
      };
    } else if (role === "client") {
      where = {
        userId,
        organisationId,
        ...searchCondition,
      };
    } else {
      return res.status(403).json({
        message: "You are not authorized to search complaints",
      });
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: complaintInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Complaint fetched successfully",
      complaint: complaints.map(formatComplaint),
    });
  } catch (error) {
    console.error("Complaint search error:", error);

    return res.status(500).json({
      message: "Unable to search complaints",
    });
  }
}

module.exports = {
  complain,
  getComplain,
  updateComplaintStatus,
  searchCompalin,
};
