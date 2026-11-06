const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const { notifyUsers } = require("../services/fcmService");

// =====================================================
// HELPER: GET AUTHENTICATED USER ID
// =====================================================

const getUserId = (req) => {
  return req.user?.id || req.user?._id || req.user?.userId || null;
};

// =====================================================
// HELPER: CHECK MANAGEMENT PERMISSION
// =====================================================

const checkFeedbackPermission = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isSuperAdmin: true,
      isRevoked: true,
      designationRef: {
        select: {
          canManageUsers: true,
          managementLevel: true,
        },
      },
    },
  });

  if (!user || user.isRevoked) {
    return {
      allowed: false,
      status: 403,
      message: "User account is unavailable.",
    };
  }

  if (user.isSuperAdmin) {
    return {
      allowed: true,
      user,
    };
  }

  if (user.designationRef?.canManageUsers === true) {
    return {
      allowed: true,
      user,
    };
  }

  return {
    allowed: false,
    status: 403,
    message: "You do not have permission to view client feedback.",
  };
};

// =====================================================
// 1. SUBMIT CLIENT FEEDBACK
// POST /api/feedback
// =====================================================

exports.submitFeedback = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { rating, message } = req.body;

    // Validate rating
    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5.",
      });
    }

    // Validate message
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your feedback.",
      });
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Feedback cannot exceed 5000 characters.",
      });
    }

    // Get authenticated client from database.
    const client = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        organisationId: true,
        isRevoked: true,
      },
    });

    if (!client || client.isRevoked) {
      return res.status(403).json({
        success: false,
        message: "Your account is unavailable.",
      });
    }

    // Only clients can submit client feedback.
    if (client.role !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only client accounts can submit feedback.",
      });
    }

    // Save feedback using authenticated account details.
    const feedback = await prisma.clientFeedback.create({
      data: {
        clientId: client.id,
        organisationId: client.organisationId,
        rating: numericRating,
        message: cleanMessage,
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            orgType: true,
          },
        },
      },
    });

    // Notify the people responsible for client feedback (Requirement 8):
    // SuperAdmin, staff who can manage feedback (canManageUsers, e.g. CEO/CTO)
    // and the Business Development Manager mapped to this client.
    // A notification failure must never fail the submission.
    try {
      const recipientSelect = { id: true, role: true, fcmToken: true };

      const [superAdmins, managers, mappedBdms, clientInfo] =
        await Promise.all([
          prisma.user.findMany({
            where: { isSuperAdmin: true, isRevoked: false },
            select: recipientSelect,
          }),
          prisma.user.findMany({
            where: {
              role: "employee",
              isRevoked: false,
              designationRef: { is: { canManageUsers: true } },
            },
            select: recipientSelect,
          }),
          prisma.user.findMany({
            where: {
              role: "employee",
              isRevoked: false,
              designation: "Business Development Manager",
              assignedToClients: { some: { clientId: client.id } },
            },
            select: recipientSelect,
          }),
          prisma.user.findUnique({
            where: { id: client.id },
            select: { userName: true },
          }),
        ]);

      const orgName = feedback.organisation?.name || "A client";
      const who = clientInfo?.userName ? ` (${clientInfo.userName})` : "";

      await notifyUsers([...superAdmins, ...managers, ...mappedBdms], {
        title: "New client feedback",
        body: `${orgName}${who} rated ${numericRating}/5: ${cleanMessage.slice(0, 120)}`,
        type: "CUSTOM",
        data: { feedbackId: feedback.id },
      });
    } catch (notificationError) {
      console.error(
        "FEEDBACK NOTIFICATION ERROR:",
        notificationError.message,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been submitted successfully.",
      feedback,
    });
  } catch (error) {
    console.error("SUBMIT FEEDBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit feedback.",
    });
  }
};

// =====================================================
// 2. GET ALL CLIENT FEEDBACK
// GET /api/feedback
// =====================================================

exports.getAllFeedback = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Check permission from database, not request body.
    const permission = await checkFeedbackPermission(userId);

    if (!permission.allowed) {
      return res.status(permission.status).json({
        success: false,
        message: permission.message,
      });
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    // Optional rating filter
    const where = {};

    if (req.query.rating !== undefined) {
      const rating = Number(req.query.rating);

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating filter must be between 1 and 5.",
        });
      }

      where.rating = rating;
    }

    // Optional organisation filter
    if (
      typeof req.query.organisationId === "string" &&
      req.query.organisationId.trim()
    ) {
      where.organisationId = req.query.organisationId.trim();
    }

    // Fetch feedback and statistics.
    const [feedback, total, aggregate, ratingCounts] =
      await prisma.$transaction([
        prisma.clientFeedback.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                userName: true,
                email: true,
                mobileNumber: true,
                role: true,
              },
            },
            organisation: {
              select: {
                id: true,
                name: true,
                orgType: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.clientFeedback.count({ where }),

        prisma.clientFeedback.aggregate({
          where,
          _avg: {
            rating: true,
          },
          _count: {
            _all: true,
          },
        }),

        prisma.clientFeedback.groupBy({
          by: ["rating"],
          where,
          _count: {
            _all: true,
          },
        }),
      ]);

    const ratingBreakdown = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingCounts.forEach((item) => {
      ratingBreakdown[item.rating] = item._count._all;
    });

    return res.status(200).json({
      success: true,
      message: "Client feedback fetched successfully.",

      feedback,

      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },

      statistics: {
        totalFeedback: aggregate._count._all,
        averageRating: Number((aggregate._avg.rating || 0).toFixed(1)),
        ratingBreakdown,
      },
    });
  } catch (error) {
    console.error("GET ALL FEEDBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve client feedback.",
    });
  }
};

// =====================================================
// 3. GET MY FEEDBACK
// GET /api/feedback/my
// =====================================================

exports.getMyFeedback = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const client = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isRevoked: true,
      },
    });

    if (!client || client.isRevoked) {
      return res.status(403).json({
        success: false,
        message: "Your account is unavailable.",
      });
    }

    if (client.role !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access their feedback.",
      });
    }

    const feedback = await prisma.clientFeedback.findMany({
      where: {
        clientId: client.id,
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            orgType: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      total: feedback.length,
      feedback,
    });
  } catch (error) {
    console.error("GET MY FEEDBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your feedback.",
    });
  }
};
