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
// Existing general API protection preserved.
// =====================================================

Router.use(generalLimiter);

// =====================================================
// PUBLIC ROUTES
// =====================================================

// Login
Router.post("/login", authLimiter, authController.login);

// =====================================================
// USER REGISTRATION
//
// Access:
// SuperAdmin or users with canManageUsers permission.
//
// Elevated designations can only be assigned by SuperAdmin.
//
// Rate limit:
// 10 registrations per 15 minutes per authenticated user.
//
// IMPORTANT:
// Authentication and permission checks must execute
// BEFORE registerLimiter so req.user.id is available.
// =====================================================

Router.post(
  "/register",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  registerLimiter,
  authController.register,
);

// =====================================================
// AUTHENTICATED USER ROUTES
// =====================================================

// Get current logged-in user
Router.get("/me", authMiddleware.verifyToken, authController.getMe);

// =====================================================
// UPDATE OWN PROFILE
// =====================================================

Router.patch(
  "/update-profile",
  authMiddleware.verifyToken,
  authController.updateProfile,
);

// =====================================================
// UPDATE OWN PASSWORD
//
// Requires current password verification.
//
// Rate limit:
// 5 requests per 15 minutes per authenticated user.
//
// Authentication must execute before passwordLimiter.
// =====================================================

Router.patch(
  "/update-password",
  authMiddleware.verifyToken,
  passwordLimiter,
  authController.updatePassword,
);

// =====================================================
// SAVE FCM TOKEN
// =====================================================

Router.post(
  "/fcm-token",
  authMiddleware.verifyToken,
  authController.saveFcmToken,
);

// =====================================================
// LOGOUT
// =====================================================

Router.post("/logout", authMiddleware.verifyToken, authController.logout);

// =====================================================
// USER MANAGEMENT ROUTES
//
// SuperAdmin or users with canManageUsers permission.
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
// Management-level restrictions are checked in controller.
Router.patch(
  "/update-user/:userId",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.updateUser,
);

// Revoke account access
// Management-level restrictions are checked in controller.
Router.patch(
  "/revoke-user/:userId",
  authMiddleware.verifyToken,
  authMiddleware.verifyManagementAccess,
  authController.revokeUser,
);

// Restore account access
// Management-level restrictions are checked in controller.
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
