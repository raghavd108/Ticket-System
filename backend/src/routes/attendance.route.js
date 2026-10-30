const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const { attendanceLimiter } = require("../middleware/rateLimit.middleware");

const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAttendanceHistory,
  getDailyReport,
  getMonthlyReport,
} = require("../controller/attendance.controller");

// =====================================================
// EMPLOYEE ATTENDANCE
// =====================================================

router.post("/check-in", attendanceLimiter, auth.verifyToken, checkIn);

router.patch("/check-out", attendanceLimiter, auth.verifyToken, checkOut);

// =====================================================
// ATTENDANCE INFORMATION
// =====================================================

router.get("/today", auth.verifyToken, getTodayAttendance);

router.get("/me", auth.verifyToken, getMyAttendance);

router.get("/history", auth.verifyToken, getAttendanceHistory);

// =====================================================
// ADMIN ATTENDANCE REPORTS
// =====================================================

router.get("/report/daily", auth.verifyAdmin, getDailyReport);

router.get("/report/monthly", auth.verifyAdmin, getMonthlyReport);

module.exports = router;
