const prisma = require("../config/prisma.js");
const { DateTime } = require("luxon");
const { notifyUsers } = require("../services/fcmService.js");

const {
  TIMEZONE,
  getAttendanceDate,
  isRegularHoliday,
} = require("../utils/attendanceUtils.js");

// =====================================================
// HELPERS
// =====================================================

const MAX_BACKDATED_LEAVE_DAYS = 30;
const MAX_LEAVE_SPAN_DAYS = 90;

function getAuthenticatedUserId(user) {
  const id = user?.id ?? user?.userId ?? user?._id ?? user?.sub;
  return id ? String(id) : null;
}

// CEO and CTO remain employees in the existing Role enum.
async function getLeaveApprover(req) {
  const userId = getAuthenticatedUserId(req.user);

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      designation: true,
      organisationId: true,
      isRevoked: true,
    },
  });

  if (!user || user.isRevoked) return null;

  const designation = String(user.designation || "")
    .trim()
    .toLowerCase();

  const isApprover =
    user.role === "admin" ||
    (user.role === "employee" && ["ceo", "cto"].includes(designation));

  return isApprover ? user : null;
}

function isValidDateString(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

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
// LEAVE NOTIFICATION HELPER
// =====================================================

async function notifyLeaveRecipients(
  recipients,
  { title, body, pushType, leaveId },
) {
  const uniqueRecipients = [
    ...new Map(
      (recipients || [])
        .filter((recipient) => recipient?.id)
        .map((recipient) => [String(recipient.id), recipient]),
    ).values(),
  ];

  if (uniqueRecipients.length === 0) return;

  try {
    await notifyUsers(uniqueRecipients, {
      title,
      body: `${body} (Leave ID: ${leaveId})`,

      // The notification database stores leave notifications
      // as CUSTOM, while FCM receives the actual leave type.
      type: pushType,

      data: {
        leaveId: String(leaveId),
      },
    });
  } catch (error) {
    console.error("Leave notification delivery failed:", {
      leaveId,
      type: pushType,
      message: error.message,
      code: error.code,
    });
  }
}

function formatDate(date) {
  return DateTime.fromJSDate(new Date(date), {
    zone: "utc",
  }).toISODate();
}

// =====================================================
// APPLY FOR LEAVE
// POST /api/leave/apply
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

    // Allow recent back-dated leave for cases like sick leave.
    const earliestStart = DateTime.now()
      .setZone(TIMEZONE)
      .minus({ days: MAX_BACKDATED_LEAVE_DAYS })
      .toISODate();

    if (startDate < earliestStart) {
      return res.status(400).json({
        message: `Leave cannot start more than ${MAX_BACKDATED_LEAVE_DAYS} days in the past.`,
      });
    }

    if (
      DateTime.fromISO(endDate).diff(DateTime.fromISO(startDate), "days").days >
      MAX_LEAVE_SPAN_DAYS
    ) {
      return res.status(400).json({
        message: `A single leave request cannot exceed ${MAX_LEAVE_SPAN_DAYS} days.`,
      });
    }

    // Get employee from database.
    const employee = await prisma.user.findFirst({
      where: {
        id: getAuthenticatedUserId(req.user),
        role: "employee",
        isRevoked: false,
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

    // Reject overlapping pending or approved requests.
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

    // Create leave request.
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

    // =================================================
    // FIND ADMIN, CEO AND CTO
    // =================================================

    let approvers = [];

    if (employee.organisationId) {
      const organisationUsers = await prisma.user.findMany({
        where: {
          organisationId: employee.organisationId,
          isRevoked: false,
          role: {
            in: ["admin", "employee"],
          },
          NOT: {
            id: employee.id,
          },
        },
        select: {
          id: true,
          role: true,
          designation: true,
          fcmToken: true,
        },
      });

      // Admins are included by role.
      // CEO and CTO are included by designation.
      approvers = organisationUsers.filter((user) => {
        if (user.role === "admin") {
          return true;
        }

        const designation = String(user.designation || "")
          .trim()
          .toLowerCase();

        return designation === "ceo" || designation === "cto";
      });
    }

    if (approvers.length === 0) {
      console.warn(`No leave approvers found for leave request ${leave.id}`);
    }

    const title = "New Leave Request";

    const body =
      `${employee.userName || "An employee"} has requested ` +
      `${leave.leaveType} leave from ${startDate} to ${endDate}.`;

    // Send notifications to Admin, CEO and CTO.
    await notifyLeaveRecipients(approvers, {
      title,
      body,
      pushType: "LEAVE_REQUEST",
      leaveId: leave.id,
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
// GET /api/leave/my-leaves
// =====================================================

exports.getMyLeaves = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can view their leave history.",
      });
    }

    const employeeId = getAuthenticatedUserId(req.user);

    const leaves = await prisma.leave.findMany({
      where: {
        employeeId,
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
// GET /api/leave/admin/all
// =====================================================

exports.getAllLeaves = async (req, res) => {
  try {
    // Admin, CEO and CTO authorization.
    const approver = await getLeaveApprover(req);

    if (!approver) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view leave requests.",
      });
    }

    const { status } = req.query;
    const organisationId = approver.organisationId;

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
          isRevoked: false,
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
// PATCH /api/leave/admin/:leaveId/status
// =====================================================

exports.updateLeaveStatus = async (req, res) => {
  try {
    // Admin, CEO and CTO authorization.
    const approver = await getLeaveApprover(req);

    if (!approver) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve or reject leave.",
      });
    }

    const { leaveId } = req.params;
    const { status } = req.body;

    const organisationId = approver.organisationId;

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

    // Verify request belongs to an employee
    // in the approver's organisation.
    const leave = await prisma.leave.findFirst({
      where: {
        id: leaveId,
        employee: {
          organisationId,
          role: "employee",
          isRevoked: false,
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

    // Only pending requests can be processed.
    if (leave.status !== "pending") {
      return res.status(409).json({
        message: `This leave request has already been ${leave.status}.`,
      });
    }

    // =================================================
    // BUILD REQUESTED DATE RANGE
    // =================================================

    const startDay = DateTime.fromJSDate(new Date(leave.startDate), {
      zone: "utc",
    })
      .setZone(TIMEZONE)
      .startOf("day");

    const endDay = DateTime.fromJSDate(new Date(leave.endDate), { zone: "utc" })
      .setZone(TIMEZONE)
      .startOf("day");

    const startDate = getAttendanceDate(startDay);
    const endDate = getAttendanceDate(endDay);

    // Load company calendar overrides.
    const calendarEntries = await prisma.companyCalendarDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        type: true,
      },
    });

    const calendarByDate = new Map(
      calendarEntries.map((entry) => [
        DateTime.fromJSDate(new Date(entry.date), { zone: "utc" }).toISODate(),
        entry.type,
      ]),
    );

    const attendanceDates = [];

    // Include working days only.
    // Custom company calendar takes priority
    // over regular weekend holidays.
    for (
      let day = startDay;
      day.toMillis() <= endDay.toMillis();
      day = day.plus({ days: 1 })
    ) {
      const dateKey = day.toISODate();
      const calendarType = calendarByDate.get(dateKey);

      const isHoliday =
        calendarType !== undefined
          ? calendarType === "HOLIDAY"
          : isRegularHoliday(day);

      if (!isHoliday) {
        attendanceDates.push(getAttendanceDate(day));
      }
    }

    // =================================================
    // TRANSACTION
    // UPDATE LEAVE + ATTENDANCE
    // =================================================

    const updatedLeave = await prisma.$transaction(async (tx) => {
      // Conditional update prevents two approvers
      // from processing the same pending request.
      const result = await tx.leave.updateMany({
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
        const error = new Error(
          "This leave request has already been processed.",
        );

        error.code = "LEAVE_ALREADY_PROCESSED";

        throw error;
      }

      // Only approved leave updates attendance.
      if (status === "approved" && attendanceDates.length > 0) {
        await tx.attendance.createMany({
          data: attendanceDates.map((date) => ({
            employeeId: leave.employeeId,
            date,
            status: "leave",
            inTime: null,
            outTime: null,
            location: "",
          })),

          // Do not overwrite existing attendance.
          skipDuplicates: true,
        });
      }

      return tx.leave.findUnique({
        where: {
          id: leaveId,
        },
        include: {
          employee: {
            select: employeeSelect,
          },
        },
      });
    });

    // =================================================
    // NOTIFY EMPLOYEE
    // =================================================

    // Notification happens after the transaction succeeds.
    const employeeRecipient = await prisma.user.findUnique({
      where: {
        id: leave.employeeId,
      },
      select: {
        id: true,
        role: true,
        fcmToken: true,
      },
    });

    const approved = status === "approved";

    const title = approved
      ? "Leave Request Approved"
      : "Leave Request Rejected";

    const body = approved
      ? `Your ${leave.leaveType} leave from ${formatDate(
          leave.startDate,
        )} to ${formatDate(leave.endDate)} has been approved.`
      : `Your ${leave.leaveType} leave from ${formatDate(
          leave.startDate,
        )} to ${formatDate(leave.endDate)} has been rejected.`;

    if (employeeRecipient) {
      await notifyLeaveRecipients([employeeRecipient], {
        title,
        body,
        pushType: approved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        leaveId: leave.id,
      });
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message: approved
        ? "Leave approved and attendance updated successfully."
        : "Leave request rejected successfully.",
      leave: formatLeave(updatedLeave),
    });
  } catch (error) {
    if (error.code === "LEAVE_ALREADY_PROCESSED") {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("UPDATE LEAVE STATUS ERROR:", error);

    return res.status(500).json({
      message: "Unable to update leave request.",
    });
  }
};
