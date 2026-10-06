const express = require("express");
const authController = require("../controller/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");
const Router = express.Router();

Router.post("/register", authMiddleware.verifyAdmin, authController.register);
Router.post("/login", authController.login);
Router.get("/me", authMiddleware.verifyToken, authController.getMe);
Router.get(
  "/employees",
  authMiddleware.verifyAdmin,
  authController.getEmployees,
);

Router.patch(
  "/update-profile",
  authMiddleware.verifyToken,
  authController.updateProfile,
);
Router.patch(
  "/update-password",
  authMiddleware.verifyToken,
  authController.updatePassword,
);
Router.get("/getUser", authMiddleware.verifyToken, authController.getUser);
Router.post(
  "/fcm-token",
  authMiddleware.verifyToken,
  authController.saveFcmToken,
);
module.exports = Router;
