const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const complainController = require("../controller/complain.controller");

const multer = require("multer");

const Router = express.Router();

const MAX_TICKET_FILES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: MAX_TICKET_FILES,
  },
});

Router.get(
  "/statuses",
  authMiddleware.verifyToken,
  complainController.getStatuses,
);

Router.post(
  "/postcomplain",
  authMiddleware.verifyToken,
  upload.array("image", MAX_TICKET_FILES),
  complainController.complain,
);

Router.get(
  "/getcomplain",
  authMiddleware.verifyToken,
  complainController.getComplain,
);
Router.patch(
  "/update-status/:id",
  authMiddleware.verifyToken,
  complainController.updateComplaintStatus,
);
Router.get(
  "/search",
  authMiddleware.verifyToken,
  complainController.searchComplaint,
);
Router.get(
  "/:id/assignable-employees",
  authMiddleware.verifyToken,
  complainController.listAssignableEmployees,
);
Router.patch(
  "/:id/assign",
  authMiddleware.verifyToken,
  complainController.assignComplaint,
);

module.exports = Router;
