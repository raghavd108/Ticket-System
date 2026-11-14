const express = require("express");
const Organisation = require("../controller/organisation.controller");
const authMiddleware = require("../middleware/authMiddleware");

const Router = express.Router();

Router.post(
  "/add-org/:id",
  authMiddleware.verifyManagementAccess,
  Organisation.addOrganisation,
);

Router.get(
  "/get-org",
  authMiddleware.verifyManagementAccess,
  Organisation.getAllOrg,
);

Router.get(
  "/types",
  authMiddleware.verifyManagementAccess,
  Organisation.getOrganisationTypes,
);

Router.post(
  "/add-type",
  authMiddleware.verifyManagementAccess,
  Organisation.addOrganisationType,
);

module.exports = Router;
