const express = require("express");
const authController = require("../controller/authcontroller");
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
Router.get("/getUser", authMiddleware.verifyAdmin, authController.getUser);
Router.post(
  "/fcm-token",
  authMiddleware.verifyToken,
  authController.saveFcmToken,
);
Router.post("/logout", authMiddleware.verifyToken, authController.logout);
module.exports = Router;
