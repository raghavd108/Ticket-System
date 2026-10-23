const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAttendanceHistory,
} = require("../controller/attendancecontroller");

router.post("/check-in", auth.verifyToken, checkIn);
router.patch("/check-out", auth.verifyToken, checkOut);

router.get("/today", auth.verifyToken, getTodayAttendance);
router.get("/me", auth.verifyToken, getMyAttendance);

// New route for the attendance history page
router.get("/history", auth.verifyToken, getAttendanceHistory);

module.exports = router;
