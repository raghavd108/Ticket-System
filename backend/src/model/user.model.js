const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "client", "employee"],
      required: true,
    },

    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },

    designation: {
      type: String,
    },

    assignedEmployee: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    fcmToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
