const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const designationController = require("../controller/designation.controller");

const Router = express.Router();

Router.get(
  "/",
  authMiddleware.verifyToken,
  designationController.getDesignations,
);
Router.post(
  "/",
  authMiddleware.verifyAdmin,
  designationController.createDesignation,
);
Router.patch(
  "/:id",
  authMiddleware.verifyAdmin,
  designationController.updateDesignation,
);
Router.delete(
  "/:id",
  authMiddleware.verifyAdmin,
  designationController.deleteDesignation,
);

module.exports = Router;
