const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const designationController = require("../controller/designation.controller");

const Router = express.Router();

// =====================================================
// GET DESIGNATIONS
// SuperAdmin: All designations
// CEO / CTO: Only lower-level designations
// Other employees / clients: Blocked
// =====================================================

Router.get(
  "/",
  authMiddleware.verifyManagementAccess,
  designationController.getDesignations,
);

// =====================================================
// CREATE DESIGNATION
// SuperAdmin: Can create all designations.
// CEO / CTO: Can create ordinary designations.
// Only SuperAdmin can assign elevated permissions.
// =====================================================

Router.post(
  "/",
  authMiddleware.verifyManagementAccess,
  designationController.createDesignation,
);

// =====================================================
// UPDATE DESIGNATION
// SuperAdmin: Can update all designations.
// CEO / CTO: Can update permitted ordinary designations.
// Elevated permission changes remain SuperAdmin-only.
// =====================================================

Router.patch(
  "/:id",
  authMiddleware.verifyManagementAccess,
  designationController.updateDesignation,
);

// =====================================================
// DELETE DESIGNATION
// SuperAdmin only
// =====================================================

Router.delete(
  "/:id",
  authMiddleware.verifySuperAdmin,
  designationController.deleteDesignation,
);

module.exports = Router;
