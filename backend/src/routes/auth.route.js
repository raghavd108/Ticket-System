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

// General rate limiting for all authentication routes
Router.use(generalLimiter);

// =====================================================
// PUBLIC ROUTES
// =====================================================

Router.post(
  "/register",
  registerLimiter,
  authMiddleware.verifyManagementAccess,
  authController.register,
);

Router.post("/login", authLimiter, authController.login);

// =====================================================
// AUTHENTICATED ROUTES
// =====================================================

Router.get("/me", authMiddleware.verifyToken, authController.getMe);

Router.patch(
  "/update-profile",
  authMiddleware.verifyToken,
  authController.updateProfile,
);

Router.patch(
  "/update-password",
  passwordLimiter,
  authMiddleware.verifyToken,
  authController.updatePassword,
);

Router.post(
  "/fcm-token",
  authMiddleware.verifyToken,
  authController.saveFcmToken,
);

Router.post("/logout", authMiddleware.verifyToken, authController.logout);

// =====================================================
// CEO, CTO AND ADMIN MANAGEMENT ROUTES
// =====================================================

Router.get(
  "/employees",
  authMiddleware.verifyManagementAccess,
  authController.getEmployees,
);

Router.get(
  "/getUser",
  authMiddleware.verifyManagementAccess,
  authController.getUser,
);

Router.patch(
  "/update-user/:userId",
  authMiddleware.verifyManagementAccess,
  authController.updateUser,
);

Router.patch(
  "/revoke-user/:userId",
  authMiddleware.verifyManagementAccess,
  authController.revokeUser,
);

Router.patch(
  "/restore-user/:userId",
  authMiddleware.verifyManagementAccess,
  authController.restoreUser,
);

module.exports = Router;
