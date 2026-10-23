const express = require("express");

const Router = express.Router();
const notificationController = require("../controller/notification.controller");

const authMiddleware = require("../middleware/authMiddleware");

// Get all notifications
Router.get(
  "/getAll",
  authMiddleware.verifyToken,
  notificationController.getNotifications,
);

// Get unread notifications
Router.get(
  "/unread",
  authMiddleware.verifyToken,
  notificationController.getUnreadNotifications,
);

// Mark one notification as read
Router.patch(
  "/:id/read",
  authMiddleware.verifyToken,
  notificationController.markNotificationAsRead,
);

// Mark all notifications as read
Router.patch(
  "/read-all",
  authMiddleware.verifyToken,
  notificationController.markAllNotificationsAsRead,
);

Router.post(
  "/custom-notification",
  authMiddleware.verifyAdmin,
  notificationController.customNotification,
);

module.exports = Router;
