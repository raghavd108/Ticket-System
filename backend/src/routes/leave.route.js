const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const { leaveLimiter } = require("../middleware/rateLimit.middleware");

const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
} = require("../controller/leave.controller");

// =====================================================
// EMPLOYEE ROUTES
// =====================================================

// Apply for leave
router.post("/apply", leaveLimiter, auth.verifyToken, applyLeave);

// View own leave requests
router.get("/my-leaves", auth.verifyToken, getMyLeaves);

// =====================================================
// MANAGEMENT ROUTES
// =====================================================

// View all employee leave requests
router.get("/admin/all", auth.verifyManagementAccess, getAllLeaves);

// Approve or reject leave requests
router.patch(
  "/admin/:leaveId/status",
  leaveLimiter,
  auth.verifyManagementAccess,
  updateLeaveStatus,
);

module.exports = router;
