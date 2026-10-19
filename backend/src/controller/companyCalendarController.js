const prisma = require("../config/prisma.js");
const { DateTime } = require("luxon");

const {
  TIMEZONE,
  getAttendanceDate,
  normalizeDay,
  isRegularHoliday,
} = require("../utils/attendanceUtils.js");

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function parseCalendarDate(value) {
  if (typeof value !== "string") return null;

  const parsed = DateTime.fromISO(value, {
    zone: TIMEZONE,
  });

  if (
    !parsed.isValid ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    parsed.toISODate() !== value
  ) {
    return null;
  }

  return parsed.startOf("day");
}

function serializeEntry(entry) {
  return {
    ...entry,
    date: DateTime.fromJSDate(entry.date, {
      zone: "utc",
    }).toISODate(),
  };
}

// GET /api/company-calendar
exports.getCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;

    const now = DateTime.now().setZone(TIMEZONE);

    const selectedMonth = month === undefined ? now.month : Number(month);

    const selectedYear = year === undefined ? now.year : Number(year);

    if (
      !Number.isInteger(selectedMonth) ||
      selectedMonth < 1 ||
      selectedMonth > 12 ||
      !Number.isInteger(selectedYear) ||
      selectedYear < 2000 ||
      selectedYear > 2100
    ) {
      return sendError(res, 400, "Please provide a valid month and year.");
    }

    const start = DateTime.fromObject(
      {
        year: selectedYear,
        month: selectedMonth,
        day: 1,
      },
      { zone: TIMEZONE },
    ).startOf("day");

    const nextMonth = start.plus({ months: 1 });

    const entries = await prisma.companyCalendarDay.findMany({
      where: {
        date: {
          gte: getAttendanceDate(start),
          lt: getAttendanceDate(nextMonth),
        },
      },
      orderBy: { date: "asc" },
    });

    const entryDates = new Set(
      entries.map((entry) =>
        DateTime.fromJSDate(entry.date, {
          zone: "utc",
        }).toISODate(),
      ),
    );

    // Include normal weekly holidays in the calendar response.
    const calendar = [];
    for (
      let day = start;
      day.toMillis() < nextMonth.toMillis();
      day = day.plus({ days: 1 })
    ) {
      const date = day.toISODate();
      const entry = entries.find(
        (item) =>
          DateTime.fromJSDate(item.date, {
            zone: "utc",
          }).toISODate() === date,
      );

      calendar.push({
        date,
        name: entry?.name ?? (isRegularHoliday(day) ? "Weekly Holiday" : null),
        description: entry?.description ?? null,
        type:
          entry?.type ?? (isRegularHoliday(day) ? "HOLIDAY" : "WORKING_DAY"),
        isDefaultHoliday: !entry && isRegularHoliday(day),
        isCustom: Boolean(entry),
      });
    }

    return res.status(200).json({
      success: true,
      period: {
        year: selectedYear,
        month: selectedMonth,
      },
      entries: entries.map(serializeEntry),
      calendar,
    });
  } catch (error) {
    console.error("GET COMPANY CALENDAR ERROR:", error);

    return sendError(res, 500, "Unable to load the company calendar.");
  }
};

// POST /api/company-calendar
exports.createCalendarDay = async (req, res) => {
  try {
    const day = parseCalendarDate(req.body?.date);
    const { type, name, description } = req.body ?? {};

    if (!day) {
      return sendError(res, 400, "Date must use YYYY-MM-DD format.");
    }

    if (!["HOLIDAY", "WORKING_DAY"].includes(type)) {
      return sendError(res, 400, "Type must be HOLIDAY or WORKING_DAY.");
    }

    if (typeof name !== "string" || !name.trim()) {
      return sendError(res, 400, "Holiday or working-day name is required.");
    }

    if (name.trim().length > 191) {
      return sendError(res, 400, "Name must be 191 characters or fewer.");
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return sendError(res, 400, "Description must be text.");
    }

    const entry = await prisma.companyCalendarDay.create({
      data: {
        date: getAttendanceDate(day),
        type,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Company calendar entry created successfully.",
      entry: serializeEntry(entry),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "A calendar entry already exists for this date. Update it instead.",
      );
    }

    console.error("CREATE COMPANY CALENDAR ERROR:", error);

    return sendError(res, 500, "Unable to create the calendar entry.");
  }
};

// PATCH /api/company-calendar/:id
exports.updateCalendarDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, name, description } = req.body ?? {};

    const existing = await prisma.companyCalendarDay.findUnique({
      where: { id },
    });

    if (!existing) {
      return sendError(res, 404, "Calendar entry not found.");
    }

    const data = {};

    if (date !== undefined) {
      const day = parseCalendarDate(date);

      if (!day) {
        return sendError(res, 400, "Date must use YYYY-MM-DD format.");
      }

      data.date = getAttendanceDate(day);
    }

    if (type !== undefined) {
      if (!["HOLIDAY", "WORKING_DAY"].includes(type)) {
        return sendError(res, 400, "Type must be HOLIDAY or WORKING_DAY.");
      }

      data.type = type;
    }

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 191
      ) {
        return sendError(
          res,
          400,
          "Name is required and must be 191 characters or fewer.",
        );
      }

      data.name = name.trim();
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== "string") {
        return sendError(res, 400, "Description must be text.");
      }

      data.description = description?.trim() || null;
    }

    const entry = await prisma.companyCalendarDay.update({
      where: { id },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Company calendar entry updated successfully.",
      entry: serializeEntry(entry),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "Another calendar entry already exists for that date.",
      );
    }

    console.error("UPDATE COMPANY CALENDAR ERROR:", error);

    return sendError(res, 500, "Unable to update the calendar entry.");
  }
};

// DELETE /api/company-calendar/:id
exports.deleteCalendarDay = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.companyCalendarDay.findUnique({
      where: { id },
    });

    if (!existing) {
      return sendError(res, 404, "Calendar entry not found.");
    }

    await prisma.companyCalendarDay.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message:
        "Calendar entry deleted. The date now follows the default weekend rules.",
    });
  } catch (error) {
    console.error("DELETE COMPANY CALENDAR ERROR:", error);

    return sendError(res, 500, "Unable to delete the calendar entry.");
  }
};
