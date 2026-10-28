const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth.route");
const complainRoutes = require("./routes/complain.route");
const notificationRoutes = require("./routes/notification.routes");
const orgainsationRoutes = require("./routes/organisation.route");
const documentRoutes = require("./routes/documents.routes");
const attendanceRoutes = require("./routes/attendance.route");
const leaveRoutes = require("./routes/leave.route");
const companyCalendarRoutes = require("./routes/companyCalendar.routes");
const designationRoutes = require("./routes/designation.routes");
const multer = require("multer");

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/complain", complainRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/org", orgainsationRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/company-calendar", companyCalendarRoutes);
app.use("/api/designations", designationRoutes);

// Return JSON for upload limits and malformed request bodies instead of
// Express's default HTML error page.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each file must be 5 MB or smaller"
        : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
          ? "Too many files attached"
          : "Invalid file upload";

    return res.status(400).json({ message });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  console.error("UNHANDLED ERROR:", error);

  return res.status(500).json({ message: "Server error" });
});

module.exports = app;
