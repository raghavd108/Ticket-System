const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const offerController = require("../controller/offer.controller");
const multer = require("multer");
const { uploadLimiter } = require("../middleware/rateLimit.middleware");

const Router = express.Router();

const MAX_OFFER_FILES = 5;

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: MAX_OFFER_FILES,
  },
});

// =====================================================
// OFFER IMAGE UPLOAD
// POST /api/offers/upload-images
//
// Only SuperAdmin or users with canPublishOffers.
// =====================================================

Router.post(
  "/upload-images",
  uploadLimiter,
  authMiddleware.verifyOfferAccess,
  upload.array("image", MAX_OFFER_FILES),
  offerController.uploadOfferImages,
);

// =====================================================
// CREATE OFFER
// POST /api/offers
//
// Management permission required.
// =====================================================

Router.post("/", authMiddleware.verifyOfferAccess, offerController.createOffer);

// =====================================================
// GET ALL ADMIN OFFERS
// GET /api/offers/admin
//
// Includes drafts. Management permission required.
// =====================================================

Router.get(
  "/admin",
  authMiddleware.verifyOfferAccess,
  offerController.getAdminOffers,
);

// =====================================================
// GET SINGLE ADMIN OFFER
// GET /api/offers/admin/:id
// =====================================================

Router.get(
  "/admin/:id",
  authMiddleware.verifyOfferAccess,
  offerController.getAdminOfferById,
);

// =====================================================
// UPDATE OFFER
// PATCH /api/offers/:id
// =====================================================

Router.patch(
  "/:id",
  authMiddleware.verifyOfferAccess,
  offerController.updateOffer,
);

// =====================================================
// PUBLISH OFFER
// POST /api/offers/:id/publish
// =====================================================

Router.post(
  "/:id/publish",
  authMiddleware.verifyOfferAccess,
  offerController.publishOffer,
);

// =====================================================
// ARCHIVE OFFER
// PATCH /api/offers/:id/archive
// =====================================================

Router.patch(
  "/:id/archive",
  authMiddleware.verifyOfferAccess,
  offerController.archiveOffer,
);

// =====================================================
// CLIENT OFFERS
//
// These endpoints remain available to authenticated
// clients without requiring canPublishOffers.
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
