const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const documentController = require("../controller/documents.controller");
const multer = require("multer");

const { uploadLimiter } = require("../middleware/rateLimit.middleware");

const Router = express.Router();

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
});

// =====================================================
// UPLOAD DOCUMENTS
// Admin + CEO + CTO
// =====================================================

Router.post(
  "/upload",
  uploadLimiter,
  authMiddleware.verifyManagementAccess,
  upload.array("files", 10),
  documentController.DocumentUpload,
);

// =====================================================
// GET MY DOCUMENTS
// All authenticated users
// =====================================================

Router.get(
  "/my-documents",
  authMiddleware.verifyToken,
  documentController.getMyDocuments,
);

// =====================================================
// GET EMPLOYEE DOCUMENTS
// All authenticated users, subject to controller checks
// =====================================================

Router.get(
  "/employee/:employeeId",
  authMiddleware.verifyToken,
  documentController.getEmployeeDocuments,
);

module.exports = Router;
