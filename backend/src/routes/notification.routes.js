const express = require("express");

const Router = express.Router();

const notificationController = require("../controller/notification.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { notificationLimiter } = require("../middleware/rateLimit.middleware");

// =====================================================
// GET ALL NOTIFICATIONS
// GET /api/notification/getAll
// =====================================================

Router.get(
  "/getAll",
  authMiddleware.verifyToken,
  notificationController.getNotifications,
);

// =====================================================
// GET UNREAD NOTIFICATIONS
// GET /api/notification/unread
// =====================================================

Router.get(
  "/unread",
  authMiddleware.verifyToken,
  notificationController.getUnreadNotifications,
);

// =====================================================
// GET EMPLOYEE / CLIENT DIRECTORY
//
// GET /api/notification/employee-directory
//
// Query:
// recipientType=EMPLOYEE
// recipientType=CLIENT
//
// Access:
// SuperAdmin
// CEO / CTO (canNotifyEmployees = true)
// =====================================================

Router.get(
  "/employee-directory",
  authMiddleware.verifyEmployeeNotificationAccess,
  notificationLimiter,
  notificationController.getEmployeeDirectory,
);

// =====================================================
// SEND EMPLOYEE / CLIENT NOTIFICATION
//
// POST /api/notification/employees
//
// Supports:
// recipientType = EMPLOYEE / CLIENT
// audience = ALL / SELECTED
//
// Access:
// SuperAdmin
// CEO / CTO (canNotifyEmployees = true)
// =====================================================

Router.post(
  "/employees",
  authMiddleware.verifyEmployeeNotificationAccess,
  notificationLimiter,
  notificationController.sendEmployeeNotification,
);

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notification/read-all
// =====================================================

Router.patch(
  "/read-all",
  authMiddleware.verifyToken,
  notificationController.markAllNotificationsAsRead,
);

// =====================================================
// MARK SINGLE NOTIFICATION AS READ
// PATCH /api/notification/:id/read
// =====================================================

Router.patch(
  "/:id/read",
  authMiddleware.verifyToken,
  notificationController.markNotificationAsRead,
);

// =====================================================
// EXISTING CUSTOM NOTIFICATION
//
// POST /api/notification/custom-notification
//
// Preserved for existing admin functionality.
// =====================================================

Router.post(
  "/custom-notification",
  notificationLimiter,
  authMiddleware.verifyAdmin,
  notificationController.customNotification,
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = Router;
