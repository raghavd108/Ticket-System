const express = require("express");

const Router = express.Router();

const notificationController = require("../controller/notification.controller");
const authMiddleware = require("../middleware/authMiddleware");

const { notificationLimiter } = require("../middleware/rateLimit.middleware");

// =====================================================
// GET ALL NOTIFICATIONS
// =====================================================

Router.get(
  "/getAll",
  authMiddleware.verifyToken,
  notificationController.getNotifications,
);

// =====================================================
// GET UNREAD NOTIFICATIONS
// =====================================================

Router.get(
  "/unread",
  authMiddleware.verifyToken,
  notificationController.getUnreadNotifications,
);

// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

Router.patch(
  "/:id/read",
  authMiddleware.verifyToken,
  notificationController.markNotificationAsRead,
);

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

Router.patch(
  "/read-all",
  authMiddleware.verifyToken,
  notificationController.markAllNotificationsAsRead,
);

// =====================================================
// CUSTOM NOTIFICATION
// Admin only
// =====================================================

Router.post(
  "/custom-notification",
  notificationLimiter,
  authMiddleware.verifyAdmin,
  notificationController.customNotification,
);

module.exports = Router;
