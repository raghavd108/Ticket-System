const prisma = require("../config/prisma");

// =====================================================
// HELPERS
// =====================================================

function getOrganisationId(user) {
  if (!user?.organisation) return null;

  return typeof user.organisation === "object"
    ? user.organisation.id || user.organisation._id
    : user.organisation;
}

function isValidDateString(value) {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function formatEmployee(employee) {
  if (!employee) return null;

  const { id, organisationId, ...rest } = employee;

  return {
    ...rest,
    _id: id,
    organisation: employee.organisation
      ? {
          ...employee.organisation,
          _id: employee.organisation.id,
        }
      : organisationId,
  };
}

function formatLeave(leave) {
  if (!leave) return null;

  const { id, employeeId, employee, ...rest } = leave;

  return {
    ...rest,
    _id: id,
    employeeId: employee ? formatEmployee(employee) : employeeId,
  };
}

const employeeSelect = {
  id: true,
  userName: true,
  email: true,
  designation: true,
  organisationId: true,
  organisation: {
    select: {
      id: true,
      name: true,
    },
  },
};

// =====================================================
// APPLY FOR LEAVE
// =====================================================

exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can apply for leave.",
      });
    }

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "Leave type, start date, end date, and reason are required.",
      });
    }

    if (
      typeof leaveType !== "string" ||
      typeof reason !== "string" ||
      !leaveType.trim() ||
      !reason.trim()
    ) {
      return res.status(400).json({
        message: "Please provide a valid leave type and reason.",
      });
    }

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      return res.status(400).json({
        message: "Please provide dates in YYYY-MM-DD format.",
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        message: "End date cannot be before the start date.",
      });
    }

    const employee = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        role: "employee",
      },
      select: {
        id: true,
        organisationId: true,
        userName: true,
        email: true,
        designation: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    // Reject overlapping pending or approved leave requests.
    const overlappingLeave = await prisma.leave.findFirst({
      where: {
        employeeId: employee.id,
        status: {
          in: ["pending", "approved"],
        },
        startDate: {
          lte: end,
        },
        endDate: {
          gte: start,
        },
      },
    });

    if (overlappingLeave) {
      return res.status(409).json({
        message:
          "You already have a pending or approved leave request for these dates.",
      });
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: employee.id,
        leaveType: leaveType.trim(),
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        status: "pending",
      },
      include: {
        employee: {
          select: employeeSelect,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      leave: formatLeave(leave),
    });
  } catch (error) {
    console.error("APPLY LEAVE ERROR:", error);

    return res.status(500).json({
      message: "Unable to submit leave request.",
    });
  }
};

// =====================================================
// GET MY LEAVES
// =====================================================

exports.getMyLeaves = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can view their leave history.",
      });
    }

    const leaves = await prisma.leave.findMany({
      where: {
        employeeId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      leaves: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("GET MY LEAVES ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch your leave requests.",
    });
  }
};

// =====================================================
// GET ALL ORGANISATION LEAVES
// =====================================================

exports.getAllLeaves = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can view organisation leave requests.",
      });
    }

    const { status } = req.query;
    const organisationId = getOrganisationId(req.user);

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid leave status.",
      });
    }

    if (!organisationId) {
      return res.status(400).json({
        message: "Organisation not found.",
      });
    }

    const leaves = await prisma.leave.findMany({
      where: {
        employee: {
          role: "employee",
          organisationId,
        },
        ...(status ? { status } : {}),
      },
      include: {
        employee: {
          select: employeeSelect,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      leaves: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("GET ALL LEAVES ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch leave requests.",
    });
  }
};

// =====================================================
// APPROVE OR REJECT LEAVE
// =====================================================

exports.updateLeaveStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can approve or reject leave.",
      });
    }

    const { leaveId } = req.params;
    const { status } = req.body;
    const organisationId = getOrganisationId(req.user);

    if (!leaveId || typeof leaveId !== "string") {
      return res.status(400).json({
        message: "Invalid leave request ID.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved or rejected.",
      });
    }

    if (!organisationId) {
      return res.status(400).json({
        message: "Organisation not found.",
      });
    }

    const leave = await prisma.leave.findFirst({
      where: {
        id: leaveId,
        employee: {
          organisationId,
          role: "employee",
        },
      },
      include: {
        employee: {
          select: employeeSelect,
        },
      },
    });

    if (!leave || !leave.employee) {
      return res.status(404).json({
        message: "Leave request not found.",
      });
    }

    if (leave.status !== "pending") {
      return res.status(409).json({
        message: `This leave request has already been ${leave.status}.`,
      });
    }

    // Atomic conditional update prevents two admins from processing
    // the same pending request simultaneously.
    const result = await prisma.leave.updateMany({
      where: {
        id: leaveId,
        status: "pending",
        employee: {
          organisationId,
          role: "employee",
        },
      },
      data: {
        status,
      },
    });

    if (result.count === 0) {
      return res.status(409).json({
        message: "This leave request has already been processed.",
      });
    }

    const updatedLeave = await prisma.leave.findUnique({
      where: {
        id: leaveId,
      },
      include: {
        employee: {
          select: employeeSelect,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully.`,
      leave: formatLeave(updatedLeave),
    });
  } catch (error) {
    console.error("UPDATE LEAVE STATUS ERROR:", error);

    return res.status(500).json({
      message: "Unable to update leave status.",
    });
  }
};
