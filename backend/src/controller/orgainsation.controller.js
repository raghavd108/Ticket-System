const userModel = require("../model/user.model");
const organisationModel = require("../model/organisations.model");

async function addOrganisation(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { orgType } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Organisation name is required",
      });
    }

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const org = await organisationModel.create({
      orgType,
      name,
      createdBy: user._id,
    });

    res.status(201).json({
      message: "Organisation created successfully",
      org,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}
async function getAllOrg(req, res) {
  try {
    const org = await organisationModel
      .find()
      .populate("createdBy", "userName email role");

    return res.status(200).json({
      message: "Organisations fetched successfully",
      org,
    });
  } catch (error) {
    console.error("GET ALL ORGANISATIONS ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch organisations",
    });
  }
}

module.exports = { addOrganisation, getAllOrg };
