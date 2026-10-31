const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const designationController = require("../controller/designation.controller");

const Router = express.Router();

// All authenticated users can view designations.
Router.get(
  "/",
  authMiddleware.verifyToken,
  designationController.getDesignations,
);

// CEO, CTO and SuperAdmin can create ordinary designations.
// Only SuperAdmin can grant elevated permissions.
Router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  designationController.createDesignation,
);

// CEO, CTO and SuperAdmin can update permitted designations.
// Elevated designation changes remain SuperAdmin-only.
Router.patch(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  designationController.updateDesignation,
);

// Only SuperAdmin can delete designations.
Router.delete(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.verifySuperAdmin,
  designationController.deleteDesignation,
);

module.exports = Router;
