const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const complainController = require("../controller/complain.controller");
const multer = require("multer");

const { uploadLimiter } = require("../middleware/rateLimit.middleware");

const Router = express.Router();

const MAX_TICKET_FILES = 5;

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: MAX_TICKET_FILES,
  },
});

// =====================================================
// GET TICKET STATUSES
// =====================================================

Router.get(
  "/statuses",
  authMiddleware.verifyToken,
  complainController.getStatuses,
);

// =====================================================
// CREATE TICKET
// =====================================================

Router.post(
  "/postcomplain",
  uploadLimiter,
  authMiddleware.verifyToken,
  upload.array("image", MAX_TICKET_FILES),
  complainController.complain,
);

// =====================================================
// GET ALL ACCESSIBLE TICKETS
// =====================================================

Router.get(
  "/getcomplain",
  authMiddleware.verifyToken,
  complainController.getComplain,
);

// =====================================================
// UPDATE TICKET STATUS
// =====================================================

Router.patch(
  "/update-status/:id",
  authMiddleware.verifyToken,
  complainController.updateComplaintStatus,
);

// =====================================================
// SEARCH TICKETS
// =====================================================

Router.get(
  "/search",
  authMiddleware.verifyToken,
  complainController.searchComplaint,
);

// =====================================================
// GET ASSIGNABLE EMPLOYEES
// =====================================================

Router.get(
  "/:id/assignable-employees",
  authMiddleware.verifyToken,
  complainController.listAssignableEmployees,
);

// =====================================================
// ASSIGN TICKET
// =====================================================

Router.patch(
  "/:id/assign",
  authMiddleware.verifyToken,
  complainController.assignComplaint,
);

module.exports = Router;
