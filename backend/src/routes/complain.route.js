const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const complainController = require("../controller/complain.controller");

const multer = require("multer");

const Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

Router.post(
  "/postcomplain",
  authMiddleware.verifyToken,
  upload.array("image", 10),
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
  complainController.searchCompalin,
);

module.exports = Router;
