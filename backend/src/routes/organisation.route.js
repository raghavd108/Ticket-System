const express = require("express");
const Organisation = require("../controller/orgainsation.controller");
const authMiddleware = require("../middleware/authMiddleware");

const Router = express.Router();

Router.post(
  "/add-org/:id",
  authMiddleware.verifyAdmin,
  Organisation.addOrganisation,
);
Router.get("/get-org", authMiddleware.verifyAdmin, Organisation.getAllOrg);

module.exports = Router;
