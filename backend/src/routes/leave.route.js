const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
} = require("../controller/leave.controller");

// Employee routes
router.post("/apply", auth.verifyToken, applyLeave);
router.get("/my-leaves", auth.verifyToken, getMyLeaves);

// Admin routes
router.get("/admin/all", auth.verifyToken, getAllLeaves);

router.patch("/admin/:leaveId/status", auth.verifyToken, updateLeaveStatus);

module.exports = router;
