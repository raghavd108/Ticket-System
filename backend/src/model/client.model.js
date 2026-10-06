const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    userName: String,
    email: String,
    password: String,

    role: {
      type: String,
      enum: ["client"],
    },

    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },

    fcmToken: {
      type: String,
      default: null,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);
const clientModel = mongoose.model("client", clientSchema);
module.exports = clientModel;
