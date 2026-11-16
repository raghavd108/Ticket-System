const express = require("express");
const Organisation = require("../controller/organisation.controller");
const authMiddleware = require("../middleware/authMiddleware");

const Router = express.Router();

// =====================================================
// CREATE ORGANISATION
// Admin, SuperAdmin, CEO and CTO with canManageUsers
// =====================================================

Router.post(
  "/add-org/:id",
  authMiddleware.verifyOrganisationAccess,
  Organisation.addOrganisation,
);

// =====================================================
// GET ALL ORGANISATIONS
// Users with management access
// =====================================================

Router.get(
  "/get-org",
  authMiddleware.verifyManagementAccess,
  Organisation.getAllOrg,
);

// =====================================================
// GET ORGANISATION TYPES
// Users with management access
// =====================================================

Router.get(
  "/types",
  authMiddleware.verifyManagementAccess,
  Organisation.getOrganisationTypes,
);

// =====================================================
// ADD ORGANISATION TYPE
// Users with management access
// =====================================================

Router.post(
  "/add-type",
  authMiddleware.verifyManagementAccess,
  Organisation.addOrganisationType,
);

module.exports = Router;
