const express = require("express");

const authController = require("../controller/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

const {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordLimiter,
} = require("../middleware/rateLimit.middleware");

const Router = express.Router();

// =====================================================
// GENERAL RATE LIMITING
// =====================================================

Router.use(generalLimiter);

// =====================================================
// PUBLIC ROUTES
// =====================================================

// Login
Router.post("/login", authLimiter, authController.login);

// =====================================================
// USER REGISTRATION
// SuperAdmin or users with canManageUsers permission
// Elevated designations can only be assigned by SuperAdmin
// =====================================================

Router.post(
  "/register",
  registerLimiter,
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.register,
);

// =====================================================
// AUTHENTICATED USER ROUTES
// =====================================================

// Get current logged-in user
Router.get("/me", authMiddleware.verifyToken, authController.getMe);

// Update own profile
Router.patch(
  "/update-profile",
  authMiddleware.verifyToken,
  authController.updateProfile,
);

// Update own password
// Requires current password verification
Router.patch(
  "/update-password",
  passwordLimiter,
  authMiddleware.verifyToken,
  authController.updatePassword,
);

// Save FCM token
Router.post(
  "/fcm-token",
  authMiddleware.verifyToken,
  authController.saveFcmToken,
);

// Logout
Router.post("/logout", authMiddleware.verifyToken, authController.logout);

// =====================================================
// USER MANAGEMENT ROUTES
// SuperAdmin or users with canManageUsers permission
// =====================================================

// Get employees
Router.get(
  "/employees",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.getEmployees,
);

// Get clients and employees
Router.get(
  "/getUser",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.getUser,
);

// Update employee or client
// Management-level restrictions are checked in controller
Router.patch(
  "/update-user/:userId",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.updateUser,
);

// Revoke account access
// Management-level restrictions are checked in controller
Router.patch(
  "/revoke-user/:userId",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.revokeUser,
);

// Restore account access
// Management-level restrictions are checked in controller
Router.patch(
  "/restore-user/:userId",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.restoreUser,
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = Router;
