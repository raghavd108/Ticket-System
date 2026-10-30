const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getCalendar,
  createCalendarDay,
  updateCalendarDay,
  deleteCalendarDay,
} = require("../controller/companyCalendar.controller");

// =====================================================
// VIEW COMPANY CALENDAR
// All authenticated users
// =====================================================

router.get("/", auth.verifyToken, getCalendar);

// =====================================================
// CREATE CALENDAR DAY
// Admin + CEO + CTO
// =====================================================

router.post("/", auth.verifyManagementAccess, createCalendarDay);

// =====================================================
// UPDATE CALENDAR DAY
// Admin + CEO + CTO
// =====================================================

router.patch("/:id", auth.verifyManagementAccess, updateCalendarDay);

// =====================================================
// DELETE CALENDAR DAY
// Admin + CEO + CTO
// =====================================================

router.delete("/:id", auth.verifyManagementAccess, deleteCalendarDay);

module.exports = router;
