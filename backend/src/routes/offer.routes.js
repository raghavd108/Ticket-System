const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const offerController = require("../controller/offer.controller");
const multer = require("multer");

const { uploadLimiter } = require("../middleware/rateLimit.middleware");

const Router = express.Router();

const MAX_OFFER_FILES = 5;

// =====================================================
// MULTER CONFIGURATION - SAME AS COMPLAINT ROUTES
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: MAX_OFFER_FILES,
  },
});

// =====================================================
// UPLOAD OFFER IMAGES
// POST /api/offers/upload-images
// =====================================================

Router.post(
  "/upload-images",
  uploadLimiter,
  authMiddleware.verifyToken,
  upload.array("image", MAX_OFFER_FILES),
  offerController.uploadOfferImages,
);

// =====================================================
// CREATE OFFER
// =====================================================

Router.post("/", authMiddleware.verifyToken, offerController.createOffer);

// =====================================================
// GET ADMIN OFFERS
// =====================================================

Router.get(
  "/admin",
  authMiddleware.verifyToken,
  offerController.getAdminOffers,
);

// =====================================================
// GET SINGLE ADMIN OFFER
// =====================================================

Router.get(
  "/admin/:id",
  authMiddleware.verifyToken,
  offerController.getAdminOfferById,
);

// =====================================================
// UPDATE OFFER
// =====================================================

Router.patch("/:id", authMiddleware.verifyToken, offerController.updateOffer);

// =====================================================
// PUBLISH OFFER
// =====================================================

Router.post(
  "/:id/publish",
  authMiddleware.verifyToken,
  offerController.publishOffer,
);

// =====================================================
// ARCHIVE OFFER
// =====================================================

Router.patch(
  "/:id/archive",
  authMiddleware.verifyToken,
  offerController.archiveOffer,
);

// =====================================================
// CLIENT OFFERS
// =====================================================

Router.get(
  "/client",
  authMiddleware.verifyToken,
  offerController.getClientOffers,
);

Router.get(
  "/client/:id",
  authMiddleware.verifyToken,
  offerController.getClientOfferById,
);

module.exports = Router;
