const prisma = require("../config/prisma");
const { uploadImage } = require("../services/imagekitService");
const { getSignedImageUrl } = require("../services/fileService");
const { sendNotification } = require("../services/fcmService");

const VALID_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

const VALID_AUDIENCES = [
  "ALL_CLIENTS",
  "ORGANISATION_CATEGORIES",
  "SELECTED_ORGANISATIONS",
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

// Supports organisationId and organisation from JWT.
// Also supports organisation as an object or string.
const getAuthenticatedOrganisationId = (user) => {
  const value = user?.organisationId ?? user?.organisation;

  if (value && typeof value === "object") {
    const id = value.id ?? value._id;
    return id ? String(id) : null;
  }

  return value ? String(value) : null;
};

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(value.map((item) => String(item || "").trim()).filter(Boolean)),
  ];
};

// Accepts:
// images: ["file1.jpg", "file2.jpg"]
// OR
// images: [{ fileName: "file1.jpg" }]
const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];

  return [
    ...new Set(
      images
        .map((image) => {
          if (typeof image === "string") {
            return image.trim();
          }

          if (image && typeof image.fileName === "string") {
            return image.fileName.trim();
          }

          return "";
        })
        .filter(Boolean),
    ),
  ];
};

const normalizeExpiry = (expiresAt) => {
  if (!expiresAt) return null;

  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid offer expiry date");
  }

  if (date <= new Date()) {
    throw new Error("Offer expiry date must be in the future");
  }

  return date;
};

const validateOfferData = ({
  title,
  description,
  images,
  audience,
  categories,
  organisationIds,
}) => {
  if (!title || !String(title).trim()) {
    return "Offer title is required";
  }

  if (!VALID_AUDIENCES.includes(audience)) {
    return "Invalid offer audience";
  }

  if (
    (!description || !String(description).trim()) &&
    (!images || images.length === 0)
  ) {
    return "Offer must contain a description or at least one image";
  }

  if (images.length > 5) {
    return "Maximum 5 images are allowed";
  }

  if (audience === "ORGANISATION_CATEGORIES" && categories.length === 0) {
    return "Select at least one organisation category";
  }

  if (audience === "SELECTED_ORGANISATIONS" && organisationIds.length === 0) {
    return "Select at least one organisation";
  }

  return null;
};

// Return offer data with fresh signed image URLs.
const formatOffer = (offer) => {
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    status: offer.status,
    audience: offer.audience,
    expiresAt: offer.expiresAt,
    publishedAt: offer.publishedAt,
    createdBy: offer.createdBy,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,

    images: (offer.images || []).map((image) => ({
      id: image.id,
      fileName: image.fileName,
      url: getSignedImageUrl(image.fileName, 300),
    })),

    categories: (offer.categories || []).map((item) => item.category),

    organisations: (offer.organisations || []).map((item) => ({
      id: item.organisation.id,
      name: item.organisation.name,
      orgType: item.organisation.orgType,
    })),
  };
};

const offerInclude = {
  images: true,
  categories: true,
  organisations: {
    include: {
      organisation: {
        select: {
          id: true,
          name: true,
          orgType: true,
        },
      },
    },
  },
  creator: {
    select: {
      id: true,
      userName: true,
      email: true,
      designation: true,
    },
  },
};

// Validate that selected organisation IDs exist.
const validateOrganisationIds = async (db, organisationIds) => {
  if (organisationIds.length === 0) return true;

  const organisations = await db.organisation.findMany({
    where: {
      id: {
        in: organisationIds,
      },
    },
    select: {
      id: true,
    },
  });

  return organisations.length === organisationIds.length;
};

// Resolve the organisations targeted by an offer.
const getTargetOrganisationIds = async (db, offer) => {
  // Send to all organisations.
  if (offer.audience === "ALL_CLIENTS") {
    const organisations = await db.organisation.findMany({
      select: {
        id: true,
      },
    });

    return organisations.map((organisation) => organisation.id);
  }

  // Send only to organisations matching selected organisation types.
  if (offer.audience === "ORGANISATION_CATEGORIES") {
    const categories = await db.offerCategory.findMany({
      where: {
        offerId: offer.id,
      },
      select: {
        category: true,
      },
    });

    const categoryNames = categories.map((item) => item.category);

    if (categoryNames.length === 0) return [];

    const organisations = await db.organisation.findMany({
      where: {
        orgType: {
          in: categoryNames,
        },
      },
      select: {
        id: true,
      },
    });

    return organisations.map((organisation) => organisation.id);
  }

  // Send only to individually selected organisations.
  if (offer.audience === "SELECTED_ORGANISATIONS") {
    const selected = await db.offerOrganisation.findMany({
      where: {
        offerId: offer.id,
      },
      select: {
        organisationId: true,
      },
    });

    return selected.map((item) => item.organisationId);
  }

  return [];
};

// Client visibility condition.
const getClientOfferWhere = (organisation) => ({
  status: "PUBLISHED",

  AND: [
    {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    {
      OR: [
        {
          audience: "ALL_CLIENTS",
        },
        {
          audience: "ORGANISATION_CATEGORIES",
          categories: {
            some: {
              category: organisation.orgType,
            },
          },
        },
        {
          audience: "SELECTED_ORGANISATIONS",
          organisations: {
            some: {
              organisationId: organisation.id,
            },
          },
        },
      ],
    },
  ],
});

// =====================================================
// UPLOAD OFFER IMAGES
// POST /api/offers/upload-images
// SAME IMAGEKIT FLOW AS COMPLAINT UPLOAD
// =====================================================

const uploadOfferImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, "Please select at least one image");
    }

    if (req.files.length > 5) {
      return sendError(res, 400, "Maximum 5 images are allowed");
    }

    const uploadedImages = [];

    for (const file of req.files) {
      if (!file.buffer || !file.originalname) {
        return sendError(res, 400, "Invalid offer image");
      }

      let result;

      try {
        // SAME METHOD AS COMPLAINT CONTROLLER
        result = await uploadImage(file.buffer, file.originalname);
      } catch (uploadError) {
        console.error("Offer ImageKit upload error:", uploadError);

        return sendError(
          res,
          400,
          uploadError.message || "Image upload failed",
        );
      }

      if (!result || !result.fileName) {
        throw new Error("ImageKit did not return a file name");
      }

      // Store filename, not permanent public URL.
      uploadedImages.push({
        fileName: result.fileName,
        fileId: result.fileId || null,
        url: getSignedImageUrl(result.fileName, 300),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer images uploaded successfully",
      count: uploadedImages.length,
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Offer image upload controller error:", error);

    return sendError(
      res,
      500,
      error.message || "Failed to upload offer images",
    );
  }
};

// --------------------------------------------------
// CREATE OFFER - DRAFT
// POST /api/offers
// --------------------------------------------------

const createOffer = async (req, res) => {
  try {
    const { title, description, audience, expiresAt } = req.body;

    const images = normalizeImages(req.body.images);
    const categories = normalizeStringArray(req.body.categories);
    const organisationIds = normalizeStringArray(req.body.organisationIds);

    const validationError = validateOfferData({
      title,
      description,
      images,
      audience,
      categories,
      organisationIds,
    });

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    let expiryDate;

    try {
      expiryDate = normalizeExpiry(expiresAt);
    } catch (error) {
      return sendError(res, 400, error.message);
    }

    if (audience === "SELECTED_ORGANISATIONS") {
      const valid = await validateOrganisationIds(prisma, organisationIds);

      if (!valid) {
        return sendError(
          res,
          400,
          "One or more selected organisations do not exist",
        );
      }
    }

    const offer = await prisma.offer.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,

        status: "DRAFT",
        audience,
        expiresAt: expiryDate,

        createdBy: req.user.id,

        images: {
          create: images.map((fileName) => ({
            fileName,
          })),
        },

        categories: {
          create:
            audience === "ORGANISATION_CATEGORIES"
              ? categories.map((category) => ({
                  category,
                }))
              : [],
        },

        organisations: {
          create:
            audience === "SELECTED_ORGANISATIONS"
              ? organisationIds.map((organisationId) => ({
                  organisationId,
                }))
              : [],
        },
      },
      include: offerInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Offer draft created successfully",
      offer: formatOffer(offer),
    });
  } catch (error) {
    console.error("Create offer error:", error);

    return sendError(res, 500, "Failed to create offer");
  }
};

// --------------------------------------------------
// UPDATE OFFER - DRAFT ONLY
// PATCH /api/offers/:id
// --------------------------------------------------

const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const existingOffer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!existingOffer) {
      return sendError(res, 404, "Offer not found");
    }

    if (existingOffer.status !== "DRAFT") {
      return sendError(res, 400, "Only draft offers can be edited");
    }

    const { title, description, audience, expiresAt } = req.body;

    const images = normalizeImages(req.body.images);
    const categories = normalizeStringArray(req.body.categories);
    const organisationIds = normalizeStringArray(req.body.organisationIds);

    const finalTitle =
      title !== undefined ? String(title).trim() : existingOffer.title;

    const finalDescription =
      description !== undefined
        ? String(description).trim()
        : existingOffer.description;

    const finalAudience = audience || existingOffer.audience;

    // If audience-specific values are not sent, retain existing values
    // only when the audience has not changed.
    const currentCategories = await prisma.offerCategory.findMany({
      where: { offerId: id },
      select: { category: true },
    });

    const currentOrganisations = await prisma.offerOrganisation.findMany({
      where: { offerId: id },
      select: { organisationId: true },
    });

    const finalCategories =
      req.body.categories !== undefined
        ? categories
        : finalAudience === existingOffer.audience
          ? currentCategories.map((item) => item.category)
          : [];

    const finalOrganisationIds =
      req.body.organisationIds !== undefined
        ? organisationIds
        : finalAudience === existingOffer.audience
          ? currentOrganisations.map((item) => item.organisationId)
          : [];

    const finalImages =
      req.body.images !== undefined
        ? images
        : (
            await prisma.offerImage.findMany({
              where: { offerId: id },
              select: { fileName: true },
            })
          ).map((item) => item.fileName);

    const validationError = validateOfferData({
      title: finalTitle,
      description: finalDescription,
      images: finalImages,
      audience: finalAudience,
      categories: finalCategories,
      organisationIds: finalOrganisationIds,
    });

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    let finalExpiry = existingOffer.expiresAt;

    if (expiresAt !== undefined) {
      try {
        finalExpiry = normalizeExpiry(expiresAt);
      } catch (error) {
        return sendError(res, 400, error.message);
      }
    }

    if (finalAudience === "SELECTED_ORGANISATIONS") {
      const valid = await validateOrganisationIds(prisma, finalOrganisationIds);

      if (!valid) {
        return sendError(
          res,
          400,
          "One or more selected organisations do not exist",
        );
      }
    }

    const updatedOffer = await prisma.$transaction(async (tx) => {
      // Conditional update prevents editing an offer that was published
      // concurrently by another request.
      const updateResult = await tx.offer.updateMany({
        where: {
          id,
          status: "DRAFT",
        },
        data: {
          title: finalTitle,
          description: finalDescription || null,
          audience: finalAudience,
          expiresAt: finalExpiry,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("OFFER_NOT_EDITABLE");
      }

      if (req.body.images !== undefined) {
        await tx.offerImage.deleteMany({
          where: { offerId: id },
        });

        if (finalImages.length > 0) {
          await tx.offerImage.createMany({
            data: finalImages.map((fileName) => ({
              offerId: id,
              fileName,
            })),
          });
        }
      }

      await tx.offerCategory.deleteMany({
        where: { offerId: id },
      });

      if (finalAudience === "ORGANISATION_CATEGORIES") {
        if (finalCategories.length > 0) {
          await tx.offerCategory.createMany({
            data: finalCategories.map((category) => ({
              offerId: id,
              category,
            })),
          });
        }
      }

      await tx.offerOrganisation.deleteMany({
        where: { offerId: id },
      });

      if (finalAudience === "SELECTED_ORGANISATIONS") {
        if (finalOrganisationIds.length > 0) {
          await tx.offerOrganisation.createMany({
            data: finalOrganisationIds.map((organisationId) => ({
              offerId: id,
              organisationId,
            })),
          });
        }
      }

      return tx.offer.findUnique({
        where: { id },
        include: offerInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer: formatOffer(updatedOffer),
    });
  } catch (error) {
    if (error.message === "OFFER_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "Offer is no longer a draft and cannot be edited",
      );
    }

    console.error("Update offer error:", error);

    return sendError(res, 500, "Failed to update offer");
  }
};

// --------------------------------------------------
// GET ADMIN OFFERS
// GET /api/offers/admin?status=DRAFT
// --------------------------------------------------

const getAdminOffers = async (req, res) => {
  try {
    const status = String(req.query.status || "").toUpperCase();

    const where = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid offer status");
      }

      where.status = status;
    }

    const offers = await prisma.offer.findMany({
      where,
      include: offerInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers: offers.map(formatOffer),
    });
  } catch (error) {
    console.error("Get admin offers error:", error);

    return sendError(res, 500, "Failed to fetch offers");
  }
};

// --------------------------------------------------
// GET SINGLE OFFER - ADMIN
// GET /api/offers/admin/:id
// --------------------------------------------------

const getAdminOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: offerInclude,
    });

    if (!offer) {
      return sendError(res, 404, "Offer not found");
    }

    return res.status(200).json({
      success: true,
      offer: formatOffer(offer),
    });
  } catch (error) {
    console.error("Get admin offer error:", error);

    return sendError(res, 500, "Failed to fetch offer");
  }
};

// --------------------------------------------------
// PUBLISH OFFER
// POST /api/offers/:id/publish
// --------------------------------------------------

const publishOffer = async (req, res) => {
  try {
    const { id } = req.params;

    // All database changes happen together. Only one request can
    // transition a particular offer from DRAFT to PUBLISHED.
    const publishResult = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: {
          images: true,
          categories: true,
          organisations: true,
        },
      });

      if (!offer) {
        throw new Error("OFFER_NOT_FOUND");
      }

      if (offer.status !== "DRAFT") {
        throw new Error("OFFER_NOT_DRAFT");
      }

      if (offer.expiresAt && offer.expiresAt <= new Date()) {
        throw new Error("OFFER_EXPIRED");
      }

      if (!offer.description?.trim() && offer.images.length === 0) {
        throw new Error("OFFER_HAS_NO_CONTENT");
      }

      const organisationIds = await getTargetOrganisationIds(tx, offer);

      if (organisationIds.length === 0) {
        throw new Error("NO_TARGET_ORGANISATIONS");
      }

      // Only client users belonging to the target organisations
      // are included as notification recipients.
      const recipients = await tx.user.findMany({
        where: {
          role: "client",
          organisationId: {
            in: organisationIds,
          },
        },
        select: {
          id: true,
          role: true,
          fcmToken: true,
        },
      });

      if (recipients.length === 0) {
        throw new Error("NO_TARGET_CLIENTS");
      }

      // This conditional update is the one-time publishing guard.
      const updateResult = await tx.offer.updateMany({
        where: {
          id,
          status: "DRAFT",
        },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error("OFFER_ALREADY_PUBLISHED");
      }

      const notificationTitle = `New Offer: ${offer.title}`;

      const notificationBody = offer.description?.trim()
        ? offer.description.trim().slice(0, 180)
        : "A new offer is available. Tap to view details.";

      // Create in-app notification records in the same transaction.
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          title: notificationTitle,
          body: notificationBody,
          type: "OFFER",
          offerId: offer.id,
        })),
        skipDuplicates: true,
      });

      return {
        offerId: offer.id,
        title: notificationTitle,
        body: notificationBody,
        recipients,
      };
    });

    // Push notifications are attempted only after the database
    // transaction has successfully committed.
    await Promise.allSettled(
      publishResult.recipients
        .filter((recipient) => recipient.fcmToken)
        .map((recipient) =>
          sendNotification({
            fcmToken: recipient.fcmToken,
            title: publishResult.title,
            body: publishResult.body,
            type: "OFFER",
            targetRole: recipient.role,
            data: {
              offerId: publishResult.offerId,
            },
          }),
        ),
    );

    const publishedOffer = await prisma.offer.findUnique({
      where: {
        id: publishResult.offerId,
      },
      include: offerInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Offer published successfully",
      notifiedClients: publishResult.recipients.length,
      offer: formatOffer(publishedOffer),
    });
  } catch (error) {
    const errors = {
      OFFER_NOT_FOUND: [404, "Offer not found"],
      OFFER_NOT_DRAFT: [400, "Only draft offers can be published"],
      OFFER_EXPIRED: [400, "This offer has already expired"],
      OFFER_HAS_NO_CONTENT: [
        400,
        "Offer must contain a description or at least one image",
      ],
      NO_TARGET_ORGANISATIONS: [
        400,
        "No organisations match this offer audience",
      ],
      NO_TARGET_CLIENTS: [
        400,
        "No client users found for the selected audience",
      ],
      OFFER_ALREADY_PUBLISHED: [409, "This offer has already been published"],
    };

    if (errors[error.message]) {
      const [status, message] = errors[error.message];
      return sendError(res, status, message);
    }

    console.error("Publish offer error:", error);

    return sendError(res, 500, "Failed to publish offer");
  }
};

// --------------------------------------------------
// ARCHIVE OFFER
// PATCH /api/offers/:id/archive
// --------------------------------------------------

const archiveOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.offer.updateMany({
      where: {
        id,
        status: {
          in: ["DRAFT", "PUBLISHED"],
        },
      },
      data: {
        status: "ARCHIVED",
      },
    });

    if (result.count === 0) {
      const offer = await prisma.offer.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!offer) {
        return sendError(res, 404, "Offer not found");
      }

      return sendError(res, 400, "Offer is already archived");
    }

    return res.status(200).json({
      success: true,
      message: "Offer archived successfully",
    });
  } catch (error) {
    console.error("Archive offer error:", error);

    return sendError(res, 500, "Failed to archive offer");
  }
};

// --------------------------------------------------
// GET CLIENT OFFERS
// GET /api/offers/client
// --------------------------------------------------

const getClientOffers = async (req, res) => {
  try {
    if (String(req.user.role).toLowerCase() !== "client") {
      return sendError(res, 403, "Only client users can access client offers");
    }

    // FIX: Resolve organisation ID from either JWT property.
    const organisationId = getAuthenticatedOrganisationId(req.user);

    if (!organisationId) {
      return sendError(
        res,
        403,
        "Your account is not linked to an organisation",
      );
    }

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        id: true,
        name: true,
        orgType: true,
      },
    });

    if (!organisation) {
      return sendError(res, 404, "Your organisation was not found");
    }

    const offers = await prisma.offer.findMany({
      where: getClientOfferWhere(organisation),
      include: {
        images: true,
        categories: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: offers.length,

      // Included to help verify the client's organisation mapping.
      organisation: {
        id: organisation.id,
        name: organisation.name,
        orgType: organisation.orgType,
      },

      offers: offers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        audience: offer.audience,
        publishedAt: offer.publishedAt,
        expiresAt: offer.expiresAt,

        images: offer.images.map((image) => ({
          id: image.id,
          url: getSignedImageUrl(image.fileName, 300),
        })),
      })),
    });
  } catch (error) {
    console.error("Get client offers error:", error);

    return sendError(res, 500, "Failed to fetch offers");
  }
};

// --------------------------------------------------
// GET SINGLE CLIENT OFFER
// GET /api/offers/client/:id
// --------------------------------------------------

const getClientOfferById = async (req, res) => {
  try {
    if (String(req.user.role).toLowerCase() !== "client") {
      return sendError(res, 403, "Only client users can access offers");
    }

    // FIX: Use the same organisation resolver for offer details.
    const organisationId = getAuthenticatedOrganisationId(req.user);

    if (!organisationId) {
      return sendError(
        res,
        403,
        "Your account is not linked to an organisation",
      );
    }

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        id: true,
        name: true,
        orgType: true,
      },
    });

    if (!organisation) {
      return sendError(res, 404, "Your organisation was not found");
    }

    const offer = await prisma.offer.findFirst({
      where: {
        id: req.params.id,
        ...getClientOfferWhere(organisation),
      },
      include: {
        images: true,
        categories: true,
      },
    });

    if (!offer) {
      return sendError(res, 404, "Offer not found or no longer available");
    }

    return res.status(200).json({
      success: true,

      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        audience: offer.audience,
        publishedAt: offer.publishedAt,
        expiresAt: offer.expiresAt,

        images: offer.images.map((image) => ({
          id: image.id,
          url: getSignedImageUrl(image.fileName, 300),
        })),
      },
    });
  } catch (error) {
    console.error("Get client offer details error:", error);

    return sendError(res, 500, "Failed to fetch offer details");
  }
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  uploadOfferImages,
  createOffer,
  updateOffer,
  getAdminOffers,
  getAdminOfferById,
  publishOffer,
  archiveOffer,
  getClientOffers,
  getClientOfferById,
};
