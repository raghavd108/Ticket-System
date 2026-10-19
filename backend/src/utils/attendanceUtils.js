const { DateTime } = require("luxon");

const TIMEZONE = "Asia/Kolkata";

const getNow = () => DateTime.now().setZone(TIMEZONE);

const getToday = () => getNow().startOf("day");

const normalizeDay = (day = getToday()) => {
  if (!DateTime.isDateTime(day) || !day.isValid) {
    throw new Error("Invalid attendance date.");
  }

  return day.setZone(TIMEZONE).startOf("day");
};

// SQL DATE values must retain the intended IST calendar date.
// Use UTC midnight as the transport representation for Prisma.
function getAttendanceDate(day = getToday()) {
  const dateKey = normalizeDay(day).toISODate();

  return new Date(`${dateKey}T00:00:00.000Z`);
}

const getOfficeStart = (day = getToday()) =>
  normalizeDay(day).set({
    hour: 10,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

const getOfficeEnd = (day = getToday()) =>
  normalizeDay(day).set({
    hour: 19,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

// Default rules only. Database overrides are checked separately.
function isRegularHoliday(day = getToday()) {
  const localDay = normalizeDay(day);

  // Sunday
  if (localDay.weekday === 7) {
    return true;
  }

  // Only Saturday needs additional checks.
  if (localDay.weekday !== 6) {
    return false;
  }

  // Second Saturday
  const isSecondSaturday = Math.ceil(localDay.day / 7) === 2;

  // Last Saturday of the month
  const isLastSaturday = localDay.plus({ days: 7 }).month !== localDay.month;

  return isSecondSaturday || isLastSaturday;
}

const isHoliday = isRegularHoliday;

module.exports = {
  TIMEZONE,
  getNow,
  getToday,
  normalizeDay,
  getAttendanceDate,
  getOfficeStart,
  getOfficeEnd,
  isHoliday,
  isRegularHoliday,
};
