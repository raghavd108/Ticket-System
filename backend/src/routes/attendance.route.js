const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAttendanceHistory,
  getDailyReport,
  getMonthlyReport,
} = require("../controller/attendance.controller");

router.post("/check-in", auth.verifyToken, checkIn);
router.patch("/check-out", auth.verifyToken, checkOut);

router.get("/today", auth.verifyToken, getTodayAttendance);
router.get("/me", auth.verifyToken, getMyAttendance);

// New route for the attendance history page
router.get("/history", auth.verifyToken, getAttendanceHistory);

// Admin reports for all employees
router.get("/report/daily", auth.verifyAdmin, getDailyReport);
router.get("/report/monthly", auth.verifyAdmin, getMonthlyReport);

module.exports = router;
