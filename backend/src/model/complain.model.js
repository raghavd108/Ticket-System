const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
    },

    problem: {
      type: String,
      required: true,
    },

    image: [
      {
        fileName: {
          type: String,
          required: true,
        },
      },
    ],

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const complaintModel = mongoose.model("complaint", complaintSchema);

module.exports = complaintModel;
