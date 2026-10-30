const prisma = require("../config/prisma");
const { uploadImage } = require("../services/imagekitService");
const { getSignedImageUrl } = require("../services/fileService");
const { notifyUsers } = require("../services/fcmService");

// =====================================================
// ACCESS RULES
// -----------------------------------------------------
// admin                         : every ticket
// employee, canViewAllTickets   : every ticket (CEO, CTO, etc.)
// employee, other designations  : tickets assigned to them OR raised by
//                                 a client they are mapped to
// client                        : tickets they raised
//
// Assignment permissions:
// admin                         : can assign/unassign
// employee, canAssignTickets    : can assign/unassign (CEO/CTO)
// other employees               : cannot assign/unassign
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
  status: {
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      isFinal: true,
    },
  },
  images: {
    select: {
      id: true,
      fileName: true,
    },
  },
};

// Older app builds send these values.
const LEGACY_STATUS_CODES = {
  in_progress: "in-progress",
  resolved: "work-completed",
};

const recipientSelect = {
  id: true,
  role: true,
  fcmToken: true,
};

function getUserId(user) {
  const id = user?.id ?? user?._id;
  return id ? String(id) : null;
}

function canViewAllTickets(user) {
  return (
    user?.role === "admin" || Boolean(user?.permissions?.canViewAllTickets)
  );
}

function canAssignTickets(user) {
  return user?.role === "admin" || Boolean(user?.permissions?.canAssignTickets);
}

// =====================================================
// TICKET ACCESS FILTER
// =====================================================

function getAccessWhere(user) {
  const userId = getUserId(user);

  if (!userId) {
    return null;
  }

  // Admin, CEO, CTO and other permitted designations
  // can view every ticket.
  if (canViewAllTickets(user)) {
    return {};
  }

  // Employees can see:
  // 1. Tickets directly assigned to them.
  // 2. Tickets raised by clients mapped to them.
  if (user?.role === "employee") {
    return {
      OR: [
        {
          assignedEmployeeId: userId,
        },
        {
          user: {
            assignedEmployees: {
              some: {
                employeeId: userId,
              },
            },
          },
        },
      ],
    };
  }

  // Clients can see only tickets created by themselves.
  if (user?.role === "client") {
    return {
      userId,
    };
  }

  return null;
}

// Find a ticket only if the logged-in user has access to it.
async function findAccessibleComplaint(user, id) {
  const accessWhere = getAccessWhere(user);

  if (!accessWhere) {
    return null;
  }

  return prisma.complaint.findFirst({
    where: {
      AND: [{ id }, accessWhere],
    },
    include: complaintInclude,
  });
}

// =====================================================
// DATE FILTER HELPERS
// =====================================================

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// Optional list filters:
// ?status=pending&from=2026-10-01&to=2026-10-31&clientId=...
//
// Dates are calendar days in IST.
function getListFilters(query) {
  const filters = [];
  const { status, from, to, clientId } = query || {};

  if (typeof status === "string" && status && status !== "all") {
    filters.push({
      status: {
        code: LEGACY_STATUS_CODES[status] || status,
      },
    });
  }

  if (isValidDateString(from)) {
    filters.push({
      createdAt: {
        gte: new Date(`${from}T00:00:00.000+05:30`),
      },
    });
  }

  if (isValidDateString(to)) {
    filters.push({
      createdAt: {
        lte: new Date(`${to}T23:59:59.999+05:30`),
      },
    });
  }

  if (typeof clientId === "string" && clientId.trim()) {
    filters.push({
      userId: clientId.trim(),
    });
  }

  return filters;
}

// =====================================================
// STATUS HELPER
// =====================================================

async function findStatus({ statusId, status }) {
  if (statusId !== undefined && statusId !== null && statusId !== "") {
    const id = Number(statusId);

    if (!Number.isInteger(id)) {
      return null;
    }

    return prisma.ticketStatus.findUnique({
      where: { id },
    });
  }

  if (typeof status === "string" && status.trim()) {
    const code = status.trim();

    return prisma.ticketStatus.findUnique({
      where: {
        code: LEGACY_STATUS_CODES[code] || code,
      },
    });
  }

  return null;
}

// =====================================================
// GET EMPLOYEES MAPPED TO A CLIENT
// =====================================================

async function getClientEmployees(clientId) {
  const assignments = await prisma.userAssignment.findMany({
    where: {
      clientId,
      employee: {
        role: "employee",
        isRevoked: false,
      },
    },
    select: {
      employee: {
        select: recipientSelect,
      },
    },
  });

  return assignments.map((assignment) => assignment.employee);
}

// =====================================================
// FORMAT COMPLAINT RESPONSE
// =====================================================

async function formatComplaint(complaint) {
  if (!complaint) {
    return null;
  }

  const {
    userId,
    organisationId,
    assignedEmployeeId,
    images,
    user,
    organisation,
    assignedEmployee,
    status,
    statusId,
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

    // Status remains a string code for compatibility.
    status: status?.code ?? null,

    statusId,
    statusName: status?.name ?? null,
    statusDetails: status || null,

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
// STATUS CHANGE NOTIFICATION
// =====================================================

async function notifyStatusChange({ complaint, statusName, actorId }) {
  const [clientEmployees, client, assignee] = await Promise.all([
    getClientEmployees(complaint.userId),

    prisma.user.findUnique({
      where: {
        id: complaint.userId,
      },
      select: recipientSelect,
    }),

    complaint.assignedEmployeeId
      ? prisma.user.findUnique({
          where: {
            id: complaint.assignedEmployeeId,
          },
          select: recipientSelect,
        })
      : null,
  ]);

  const recipients = [...clientEmployees, client, assignee].filter(
    (recipient) => recipient && recipient.id !== actorId,
  );

  await notifyUsers(recipients, {
    title: "Ticket Status Updated",
    body: `Ticket "${complaint.module}" is now ${statusName}`,
    type: "STATUS_UPDATE",
    complaintId: complaint.id,
  });
}

// =====================================================
// TICKET STATUSES
// GET /complain/statuses
// =====================================================

async function getStatuses(req, res) {
  try {
    const statuses = await prisma.ticketStatus.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        sortOrder: true,
        isFinal: true,
      },
    });

    return res.status(200).json({
      statuses,
    });
  } catch (error) {
    console.error("Get ticket statuses error:", error);

    return res.status(500).json({
      message: "Unable to fetch ticket statuses",
    });
  }
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

    const userId = getUserId(req.user);

    if (req.user?.role !== "client" || !userId) {
      return res.status(403).json({
        message: "Only clients can create a ticket",
      });
    }

    const [user, pendingStatus] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          userName: true,
          organisationId: true,
        },
      }),

      prisma.ticketStatus.findUnique({
        where: {
          code: "pending",
        },
      }),
    ]);

    if (!user) {
      return res.status(403).json({
        message: "Only clients can create a ticket",
      });
    }

    if (!pendingStatus) {
      throw new Error("Ticket status 'pending' is not seeded");
    }

    // Attachments are optional.
    // Store file names instead of permanent public URLs.
    const uploadedImages = [];

    for (const file of req.files || []) {
      if (!file.buffer || !file.originalname) {
        return res.status(400).json({
          message: "Invalid ticket attachment",
        });
      }

      let result;

      try {
        result = await uploadImage(file.buffer, file.originalname);
      } catch (uploadError) {
        return res.status(400).json({
          message: uploadError.message || "Invalid ticket attachment",
        });
      }

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
        organisationId: user.organisationId,
        statusId: pendingStatus.id,

        images: {
          create: uploadedImages,
        },
      },
      include: complaintInclude,
    });

    // =====================================================
    // NOTIFY MAPPED EMPLOYEES, ADMINS, CEO AND CTO
    // =====================================================

    try {
      const [clientEmployees, admins, management] = await Promise.all([
        // Employees mapped to this client
        getClientEmployees(userId),

        // All active admins
        prisma.user.findMany({
          where: {
            role: "admin",
            isRevoked: false,
          },
          select: recipientSelect,
        }),

        // CEO, CTO and other employees
        // having permission to view all tickets
        prisma.user.findMany({
          where: {
            role: "employee",
            isRevoked: false,

            designationRef: {
              is: {
                canViewAllTickets: true,
              },
            },
          },
          select: recipientSelect,
        }),
      ]);

      // Combine all recipients.
      // notifyUsers already removes duplicate user IDs.
      await notifyUsers([...clientEmployees, ...admins, ...management], {
        title: "New Ticket Created",

        body: `${
          user.userName || "A client"
        } raised a ticket: ${complaint.module}`,

        type: "NEW_TICKET",

        complaintId: complaint.id,
      });
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
// GET /complain/getcomplain?status=&from=&to=&clientId=
// =====================================================

async function getComplain(req, res) {
  try {
    const accessWhere = getAccessWhere(req.user);

    if (!accessWhere) {
      return res.status(403).json({
        message: "You are not authorized to view complaints",
      });
    }

    const complaints = await prisma.complaint.findMany({
      where: {
        AND: [accessWhere, ...getListFilters(req.query)],
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
// PATCH /complain/update-status/:id
// { statusId } or { status: code }
// =====================================================

async function updateComplaintStatus(req, res) {
  try {
    const { id } = req.params;
    const actorId = getUserId(req.user);

    if (!["admin", "employee"].includes(req.user?.role)) {
      return res.status(403).json({
        message: "You are not authorized to update complaint status",
      });
    }

    const status = await findStatus(req.body || {});

    if (!status) {
      return res.status(400).json({
        message: "Invalid complaint status",
      });
    }

    const complaint = await findAccessibleComplaint(req.user, id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found or you are not authorized to update it",
      });
    }

    if (complaint.statusId === status.id) {
      return res.status(200).json({
        message: "Status is already up to date",
        complaint: await formatComplaint(complaint),
      });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: {
        id,
      },

      data: {
        statusId: status.id,
      },

      include: complaintInclude,
    });

    try {
      await notifyStatusChange({
        complaint: updatedComplaint,
        statusName: status.name,
        actorId,
      });
    } catch (notificationError) {
      console.error("Status notification error:", notificationError.message);
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
// EMPLOYEES WHO CAN BE ASSIGNED A TICKET
// GET /complain/:id/assignable-employees
// =====================================================

// An employee can work on a ticket when they are mapped
// to the client, or when their designation already grants
// access to every ticket.
async function getAssignableEmployees(complaint) {
  return prisma.user.findMany({
    where: {
      role: "employee",
      isRevoked: false,

      OR: [
        {
          assignedToClients: {
            some: {
              clientId: complaint.userId,
            },
          },
        },

        {
          designationRef: {
            is: {
              canViewAllTickets: true,
            },
          },
        },
      ],
    },

    select: {
      id: true,
      userName: true,
      email: true,
      designation: true,

      assignedToClients: {
        where: {
          clientId: complaint.userId,
        },

        select: {
          clientId: true,
        },
      },
    },

    orderBy: {
      userName: "asc",
    },
  });
}

async function listAssignableEmployees(req, res) {
  try {
    if (!canAssignTickets(req.user)) {
      return res.status(403).json({
        message: "You are not authorized to assign tickets",
      });
    }

    const complaint = await findAccessibleComplaint(req.user, req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    const employees = await getAssignableEmployees(complaint);

    return res.status(200).json({
      employees: employees.map(({ assignedToClients, ...employee }) => ({
        ...employee,
        _id: employee.id,
        mappedToClient: assignedToClients.length > 0,
      })),
    });
  } catch (error) {
    console.error("Assignable employees error:", error);

    return res.status(500).json({
      message: "Unable to fetch employees",
    });
  }
}

// =====================================================
// ASSIGN COMPLAINT TO EMPLOYEE
// PATCH /complain/:id/assign
// { employeeId } (null to unassign)
//
// Admins and designations with canAssignTickets
// =====================================================

async function assignComplaint(req, res) {
  try {
    const { id } = req.params;
    const { employeeId } = req.body || {};
    const actorId = getUserId(req.user);

    if (!canAssignTickets(req.user)) {
      return res.status(403).json({
        message: "You are not authorized to assign tickets",
      });
    }

    if (
      employeeId !== null &&
      (typeof employeeId !== "string" || !employeeId)
    ) {
      return res.status(400).json({
        message: "employeeId is required",
      });
    }

    const complaint = await findAccessibleComplaint(req.user, id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    let employee = null;

    if (employeeId) {
      const assignable = await getAssignableEmployees(complaint);

      employee = assignable.find((item) => item.id === employeeId);

      if (!employee) {
        return res.status(400).json({
          message:
            "This employee cannot work on this client's tickets. Map the employee to the client first.",
        });
      }
    }

    // Moving between Pending and Assigned follows
    // the assignment.
    const statusCode = complaint.status?.code;
    let nextStatus = null;

    if (employee && statusCode === "pending") {
      nextStatus = await prisma.ticketStatus.findUnique({
        where: {
          code: "assigned",
        },
      });
    } else if (!employee && statusCode === "assigned") {
      nextStatus = await prisma.ticketStatus.findUnique({
        where: {
          code: "pending",
        },
      });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: {
        id,
      },

      data: {
        assignedEmployeeId: employee ? employee.id : null,

        ...(nextStatus ? { statusId: nextStatus.id } : {}),
      },

      include: complaintInclude,
    });

    // Send assignment and status notifications.
    try {
      if (employee && employee.id !== actorId) {
        const recipient = await prisma.user.findUnique({
          where: {
            id: employee.id,
          },

          select: recipientSelect,
        });

        await notifyUsers([recipient], {
          title: "Ticket Assigned to You",
          body: `A ticket has been assigned to you: ${updatedComplaint.module}`,
          type: "NEW_TICKET",
          complaintId: complaint.id,
        });
      }

      if (nextStatus) {
        await notifyStatusChange({
          complaint: updatedComplaint,
          statusName: nextStatus.name,
          actorId,
        });
      }
    } catch (notificationError) {
      console.error(
        "Assignment notification error:",
        notificationError.message,
      );
    }

    return res.status(200).json({
      message: employee
        ? "Complaint assigned successfully"
        : "Complaint unassigned successfully",

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
    const accessWhere = getAccessWhere(req.user);

    if (!accessWhere) {
      return res.status(403).json({
        message: "You are not authorized to search complaints",
      });
    }

    const complaints = await prisma.complaint.findMany({
      where: {
        AND: [
          accessWhere,

          {
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
          },
        ],
      },

      include: complaintInclude,

      orderBy: {
        createdAt: "desc",
      },

      take: 100,
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
  getStatuses,
  complain,
  getComplain,
  updateComplaintStatus,
  listAssignableEmployees,
  assignComplaint,
  searchComplaint,
};
