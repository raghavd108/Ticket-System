const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth.route");
const complainRoutes = require("./routes/complain.route");
const notificationRoutes = require("./routes/notification.routes");
const orgainsationRoutes = require("./routes/organisation.route");

app.use(express.json());
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

module.exports = app;
