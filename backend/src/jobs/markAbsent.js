const cron = require("node-cron");

const Attendance = require("../model/attendance.model");
const userSchema = require("../model/user.model");

const {
  TIMEZONE,
  getNow,
  getToday,
  getAttendanceDate,
  getOfficeEnd,
  isHoliday,
} = require("../utils/attendanceUtils");

async function markAbsentForDay(day = getNow()) {
  const today = day.setZone(TIMEZONE).startOf("day");

  if (isHoliday(today)) {
    console.log(`Skipping holiday: ${today.toISODate()}`);
    return;
  }

  if (day.setZone(TIMEZONE) < getOfficeEnd(today)) {
    console.log("Office has not closed yet. Skipping absence job.");
    return;
  }

  const date = getAttendanceDate(today);

  // Adjust the role filter if your User schema uses a different value.
  const employees = await userSchema
    .find({
      role: "employee",
    })
    .select("_id");

  let markedAbsent = 0;

  for (const employee of employees) {
    const result = await Attendance.updateOne(
      {
        employeeId: employee._id,
        date,
      },
      {
        $setOnInsert: {
          employeeId: employee._id,
          date,
          status: "absent",
          inTime: null,
          outTime: null,
          location: "",
        },
      },
      {
        upsert: true,
      },
    );

    if (result.upsertedCount === 1) {
      markedAbsent++;
    }
  }

  console.log(
    `Absence job completed for ${today.toISODate()}. ` +
      `New absent records: ${markedAbsent}`,
  );
}

function startAbsentJob() {
  cron.schedule(
    "1 19 * * *",
    async () => {
      try {
        await markAbsentForDay(getNow());
      } catch (error) {
        console.error("Mark absent job failed:", error);
      }
    },
    {
      timezone: TIMEZONE,
    },
  );

  console.log("Automatic absence job scheduled for 7:01 PM IST.");
}

module.exports = {
  startAbsentJob,
  markAbsentForDay,
};
