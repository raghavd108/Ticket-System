const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const documentController = require("../controller/documentscontroller");
const multer = require("multer");

const Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
});

Router.post(
  "/upload",
  authMiddleware.verifyToken,
  upload.array("files", 10),
  documentController.DocumentUpload,
);

Router.get(
  "/my-documents",
  authMiddleware.verifyToken,
  documentController.getMyDocuments,
);

Router.get(
  "/employee/:employeeId",
  authMiddleware.verifyToken,
  documentController.getEmployeeDocuments,
);

module.exports = Router;
