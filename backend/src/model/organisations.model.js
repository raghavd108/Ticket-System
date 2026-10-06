const mongoose = require("mongoose");

const organisationSchema = new mongoose.Schema(
  {
    orgType: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);

const organisationModel = mongoose.model("Organisation", organisationSchema);
module.exports = organisationModel;
