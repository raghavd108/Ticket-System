const prisma = require("../config/prisma.js");

const {
  TIMEZONE,
  getNow,
  getToday,
  getAttendanceDate,
  getOfficeStart,
  getOfficeEnd,
  isRegularHoliday,
} = require("../utils/attendanceUtils.js");

const { DateTime } = require("luxon");

// =====================================================
// HELPERS
// =====================================================

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function getAuthenticatedUserId(user) {
  const id = user?.id ?? user?.userId ?? user?._id ?? user?.sub;
  return id ? String(id) : null;
}

async function getValidatedEmployeeId(req, res, suppliedId) {
  const role = req.user?.role;
  const authenticatedId = getAuthenticatedUserId(req.user);

  if (!authenticatedId) {
    sendError(res, 401, "Authentication required.");
    return null;
  }

  let employeeId;

  if (role === "employee") {
    employeeId = authenticatedId;

    if (suppliedId && String(suppliedId).trim() !== employeeId) {
      sendError(res, 403, "You cannot access another employee's attendance.");
      return null;
    }
  } else if (role === "admin") {
    if (typeof suppliedId !== "string" || !suppliedId.trim()) {
      sendError(res, 400, "Employee ID is required.");
      return null;
    }

    employeeId = suppliedId.trim();
  } else {
    sendError(res, 403, "You are not authorized to access attendance.");
    return null;
  }

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!employee) {
    sendError(res, 404, "Employee not found.");
    return null;
  }

  if (employee.role !== "employee") {
    sendError(res, 403, "Attendance is available only for employees.");
    return null;
  }

  return employee.id;
}

// An explicit database entry overrides the regular weekend rules.
async function isCompanyHoliday(day) {
  const date = getAttendanceDate(day);

  const entry = await prisma.companyCalendarDay.findUnique({
    where: { date },
    select: { type: true },
  });

  if (entry) {
    return entry.type === "HOLIDAY";
  }

  return isRegularHoliday(day);
}

function getDateKey(date) {
  if (!date) return null;

  return DateTime.fromJSDate(new Date(date), {
    zone: "utc",
  })
    .setZone(TIMEZONE)
    .toISODate();
}

function getMonthDateRange(year, month) {
  const start = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: TIMEZONE },
  ).startOf("day");

  const nextMonth = start.plus({ months: 1 });

  return {
    start,
    end: nextMonth.minus({ days: 1 }),
    startDate: getAttendanceDate(start),
    endDateExclusive: getAttendanceDate(nextMonth),
  };
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();

  if (["present", "late", "absent", "leave", "holiday"].includes(value)) {
    return value;
  }

  return "pending";
}

// =====================================================
// CHECK IN
// POST /api/attendance/check-in
// =====================================================

exports.checkIn = async (req, res) => {
  try {
    const employeeId = await getValidatedEmployeeId(
      req,
      res,
      req.body?.employeeId,
    );

    if (!employeeId) return;

    const now = getNow();
    const today = getToday();

    if (await isCompanyHoliday(today)) {
      return sendError(
        res,
        400,
        "Today is a company holiday. Attendance is not available.",
      );
    }

    const officeStart = getOfficeStart(today);
    const officeEnd = getOfficeEnd(today);

    if (now.toMillis() < officeStart.toMillis()) {
      return sendError(res, 400, "Check-in is available from 10:00 AM IST.");
    }

    if (now.toMillis() >= officeEnd.toMillis()) {
      return sendError(res, 400, "Check-in is closed after 7:00 PM IST.");
    }

    const location =
      typeof req.body?.location === "string" ? req.body.location.trim() : "";

    if (!location) {
      return sendError(res, 400, "Location is required.");
    }

    const date = getAttendanceDate(today);

    // Late if check-in occurs strictly after noon IST.
    const noon = today.set({
      hour: 12,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const status = now.toMillis() > noon.toMillis() ? "late" : "present";

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "You have already marked attendance today.",
        attendance: existing,
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date,
        status,
        inTime: now.toUTC().toJSDate(),
        outTime: null,
        location,
      },
    });

    return res.status(201).json({
      success: true,
      message:
        status === "late"
          ? "Attendance marked late successfully."
          : "Attendance marked present successfully.",
      attendance,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return sendError(res, 409, "You have already marked attendance today.");
    }

    console.error("CHECK-IN ERROR:", error);

    return sendError(res, 500, "Unable to mark attendance.");
  }
};

// =====================================================
// CHECK OUT
// PATCH /api/attendance/check-out
// =====================================================

exports.checkOut = async (req, res) => {
  try {
    const employeeId = await getValidatedEmployeeId(
      req,
      res,
      req.body?.employeeId,
    );

    if (!employeeId) return;

    const today = getToday();
    const date = getAttendanceDate(today);
    const now = getNow();

    if (await isCompanyHoliday(today)) {
      return sendError(res, 400, "Today is a company holiday.");
    }

    // Checkout at exactly 7 PM is allowed.
    if (now.toMillis() > getOfficeEnd(today).toMillis()) {
      return sendError(res, 400, "Check-out is allowed until 7:00 PM IST.");
    }

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
    });

    if (
      !attendance ||
      !attendance.inTime ||
      !["present", "late"].includes(attendance.status)
    ) {
      return sendError(res, 404, "No open attendance record found for today.");
    }

    if (attendance.outTime) {
      return res.status(409).json({
        message: "You have already checked out.",
        attendance,
      });
    }

    if (now.toMillis() < new Date(attendance.inTime).getTime()) {
      return sendError(res, 400, "Check-out cannot be earlier than check-in.");
    }

    // Conditional update avoids overwriting an existing checkout.
    const result = await prisma.attendance.updateMany({
      where: {
        employeeId,
        date,
        status: { in: ["present", "late"] },
        inTime: { not: null },
        outTime: null,
      },
      data: {
        outTime: now.toUTC().toJSDate(),
      },
    });

    if (result.count === 0) {
      const latest = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
      });

      if (latest?.outTime) {
        return res.status(409).json({
          message: "You have already checked out.",
          attendance: latest,
        });
      }

      return sendError(res, 404, "No open attendance record found for today.");
    }

    const updated = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Check-out recorded successfully.",
      attendance: updated,
    });
  } catch (error) {
    console.error("CHECK-OUT ERROR:", error);

    return sendError(res, 500, "Unable to record check-out.");
  }
};

// =====================================================
// GET TODAY'S ATTENDANCE
// GET /api/attendance/today
// =====================================================

exports.getTodayAttendance = async (req, res) => {
  try {
    const employeeId = await getValidatedEmployeeId(
      req,
      res,
      req.query.employeeId,
    );

    if (!employeeId) return;

    const today = getToday();
    const date = getAttendanceDate(today);
    const holiday = await isCompanyHoliday(today);

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
    });

    const hasCheckedIn = Boolean(
      attendance &&
      ["present", "late"].includes(attendance.status) &&
      attendance.inTime,
    );

    return res.status(200).json({
      success: true,
      date: today.toISODate(),
      isHoliday: holiday,
      attendance,
      needsCheckIn: !holiday && !attendance,
      needsCheckOut: hasCheckedIn && !attendance.outTime,
    });
  } catch (error) {
    console.error("GET TODAY ATTENDANCE ERROR:", error);

    return sendError(res, 500, "Unable to fetch today's attendance.");
  }
};

// =====================================================
// GET MONTHLY ATTENDANCE HISTORY
// GET /api/attendance/history?month=10&year=2026
// =====================================================

exports.getAttendanceHistory = async (req, res) => {
  try {
    const employeeId = await getValidatedEmployeeId(
      req,
      res,
      req.query.employeeId,
    );

    if (!employeeId) return;

    const now = getNow();
    const month = Number(req.query.month ?? now.month);
    const year = Number(req.query.year ?? now.year);

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return sendError(res, 400, "Please provide a valid month and year.");
    }

    const range = getMonthDateRange(year, month);

    const [records, calendarEntries] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId,
          date: {
            gte: range.startDate,
            lt: range.endDateExclusive,
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.companyCalendarDay.findMany({
        where: {
          date: {
            gte: range.startDate,
            lt: range.endDateExclusive,
          },
        },
      }),
    ]);

    const recordsByDate = new Map(
      records.map((record) => [getDateKey(record.date), record]),
    );

    const calendarByDate = new Map(
      calendarEntries.map((entry) => [getDateKey(entry.date), entry]),
    );

    const todayKey = now.toISODate();
    const attendance = [];

    let totalCalendarDays = 0;
    let workingDays = 0;
    let present = 0;
    let late = 0;
    let absent = 0;
    let leave = 0;
    let holidays = 0;
    let pending = 0;
    let completedWorkingDays = 0;

    for (
      let day = range.start;
      day.toMillis() < range.start.plus({ months: 1 }).toMillis();
      day = day.plus({ days: 1 })
    ) {
      totalCalendarDays++;

      const dateKey = day.toISODate();
      const record = recordsByDate.get(dateKey);
      const calendarEntry = calendarByDate.get(dateKey);

      // A custom WORKING_DAY overrides a regular Sunday/Saturday holiday.
      // A custom HOLIDAY overrides a normal working day.
      const holiday = calendarEntry
        ? calendarEntry.type === "HOLIDAY"
        : isRegularHoliday(day);

      let status;

      if (record) {
        status = normalizeStatus(record.status);
      } else if (holiday) {
        status = "holiday";
      } else if (dateKey < todayKey) {
        status = "absent";
      } else {
        status = "pending";
      }

      if (holiday) {
        holidays++;
      } else {
        workingDays++;
      }

      if (status === "present") present++;
      if (status === "late") late++;
      if (status === "absent") absent++;
      if (status === "leave") leave++;

      const isCompletedDay =
        !holiday &&
        (dateKey < todayKey || (dateKey === todayKey && Boolean(record)));

      if (isCompletedDay) {
        completedWorkingDays++;
      }

      if (status === "pending" && !holiday && dateKey >= todayKey) {
        pending++;
      }

      attendance.push({
        date: dateKey,
        day: day.toFormat("cccc"),
        status,
        isHoliday: holiday,
        holidayName: holiday ? (calendarEntry?.name ?? "Weekly Holiday") : null,
        calendarType: calendarEntry?.type ?? null,
        inTime: record?.inTime ?? null,
        outTime: record?.outTime ?? null,
        location: record?.location ?? null,
      });
    }

    const attendancePercentage =
      completedWorkingDays > 0
        ? Math.round(((present + late) / completedWorkingDays) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      employeeId,
      period: {
        year,
        month,
        startDate: range.start.toISODate(),
        endDate: range.end.toISODate(),
      },
      summary: {
        totalCalendarDays,
        workingDays,
        present,
        late,
        absent,
        leave,
        holidays,
        pending,
        completedWorkingDays,
        attendancePercentage,
      },
      attendance,
    });
  } catch (error) {
    console.error("GET ATTENDANCE HISTORY ERROR:", error);

    return sendError(res, 500, "Unable to load attendance history.");
  }
};

// =====================================================
// GET MY ATTENDANCE RECORDS
// GET /api/attendance/me
// =====================================================

exports.getMyAttendance = async (req, res) => {
  try {
    const employeeId = await getValidatedEmployeeId(
      req,
      res,
      req.query.employeeId,
    );

    if (!employeeId) return;

    const now = getNow();
    const range = getMonthDateRange(now.year, now.month);

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: range.startDate,
          lt: range.endDateExclusive,
        },
      },
      orderBy: { date: "desc" },
    });

    return res.status(200).json({
      success: true,
      month: now.toFormat("yyyy-MM"),
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error("GET MY ATTENDANCE ERROR:", error);

    return sendError(res, 500, "Unable to fetch attendance history.");
  }
};
