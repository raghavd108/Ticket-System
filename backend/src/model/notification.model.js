const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["NEW_TICKET", "STATUS_UPDATE", "CUSTOM"],
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
    },

    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "complaint",
    },
  },
  {
    timestamps: true,
  },
);

const notifiModel = mongoose.model("Notification", notificationSchema);
module.exports = notifiModel;
