const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getCalendar,
  createCalendarDay,
  updateCalendarDay,
  deleteCalendarDay,
} = require("../controller/companyCalendarController");

router.get("/", auth.verifyToken, getCalendar);

router.post("/", auth.verifyAdmin, createCalendarDay);

router.patch("/:id", auth.verifyAdmin, updateCalendarDay);

router.delete("/:id", auth.verifyAdmin, deleteCalendarDay);

module.exports = router;
