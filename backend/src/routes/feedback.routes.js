const express = require("express");
const router = express.Router();

const {
  submitFeedback,
  getAllFeedback,
  getMyFeedback,
} = require("../controller/feedback.controller");

const {
  verifyToken,
  verifyManagementAccess,
} = require("../middleware/authMiddleware");

router.post("/", verifyToken, submitFeedback);

router.get("/my", verifyToken, getMyFeedback);

// =====================================================
// MANAGEMENT FEEDBACK
// =====================================================

// SuperAdmin OR users with canManageUsers permission
router.get("/", verifyManagementAccess, getAllFeedback);

module.exports = router;
