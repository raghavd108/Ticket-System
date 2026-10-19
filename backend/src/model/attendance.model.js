const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: true,
    },

    inTime: {
      type: Date,
      default: null,
    },

    outTime: {
      type: Date,
      default: null,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

// Only one attendance record per employee per working date.
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
