const express = require("express");
const Organisation = require("../controller/organisation.controller");
const authMiddleware = require("../middleware/authMiddleware");

const Router = express.Router();

// =====================================================
// ADD ORGANISATION
// Admin + CEO + CTO
// =====================================================

Router.post(
  "/add-org/:id",
  authMiddleware.verifyManagementAccess,
  Organisation.addOrganisation,
);

// =====================================================
// GET ALL ORGANISATIONS
// Admin + CEO + CTO
// =====================================================

Router.get(
  "/get-org",
  authMiddleware.verifyManagementAccess,
  Organisation.getAllOrg,
);

module.exports = Router;
