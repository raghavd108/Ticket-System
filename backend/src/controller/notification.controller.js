const prisma = require("../config/prisma");
const { sendNotification } = require("../services/fcmService");
const { getSignedImageUrl } = require("../services/fileService");

// =====================================================
// COMMON HELPERS
// =====================================================

const notificationInclude = {
  complaint: {
    include: {
      images: true,
      status: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },

  offer: {
    include: {
      images: true,
    },
  },
};

const normaliseOrganisationId = (user) =>
  user?.organisationId || user?.organisation?.id || null;

// =====================================================
// GET AUTHENTICATED USER FROM DATABASE
// Always use database permissions.
// Never trust frontend role/designation.
// =====================================================

async function getAuthenticatedUser(req) {
  const userId = req.user?.id || req.user?._id;

  if (!userId) return null;

  return prisma.user.findUnique({
    where: {
      id: String(userId),
    },

    select: {
      id: true,
      userName: true,
      email: true,
      role: true,
      designation: true,
      organisationId: true,
      isRevoked: true,
      isSuperAdmin: true,
      fcmToken: true,

      organisation: {
        select: {
          id: true,
          name: true,
          orgType: true,
        },
      },

      designationRef: {
        select: {
          name: true,
          canNotifyEmployees: true,
          managementLevel: true,
        },
      },
    },
  });
}

// =====================================================
// EMPLOYEE NOTIFICATION PERMISSION
//
// SuperAdmin:
// isSuperAdmin = true
//
// Designation-based:
// role = employee
// designationRef.canNotifyEmployees = true
// =====================================================

function canNotifyEmployees(user) {
  if (!user || user.isRevoked) {
    return false;
  }

  if (user.isSuperAdmin === true) {
    return true;
  }

  return (
    user.role === "employee" && user.designationRef?.canNotifyEmployees === true
  );
}

// =====================================================
// CHECK SENDER PERMISSION
// =====================================================

async function authorizeEmployeeNotification(req, res) {
  const sender = await getAuthenticatedUser(req);

  if (!sender || sender.isRevoked) {
    res.status(401).json({
      success: false,
      message: "User not found or account revoked",
    });

    return null;
  }

  if (!canNotifyEmployees(sender)) {
    res.status(403).json({
      success: false,
      message: "You are not authorized to send employee notifications",
    });

    return null;
  }

  if (!normaliseOrganisationId(sender)) {
    res.status(400).json({
      success: false,
      message: "Sender organisation not found",
    });

    return null;
  }

  return sender;
}

// =====================================================
// FORMAT COMPLAINT
// =====================================================

function formatComplaint(complaint) {
  if (!complaint) return null;

  const { id, userId, organisationId, status, images, ...rest } = complaint;

  return {
    ...rest,

    _id: id,

    status: status?.code ?? null,
    statusName: status?.name ?? null,

    user: userId,
    organisation: organisationId,

    image: (images || []).map((image) => ({
      ...image,
      _id: image.id,
    })),
  };
}

// =====================================================
// FORMAT OFFER
// =====================================================

function formatOffer(offer) {
  if (!offer) return null;

  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    status: offer.status,
    audience: offer.audience,
    publishedAt: offer.publishedAt,
    expiresAt: offer.expiresAt,

    images: (offer.images || []).map((image) => ({
      id: image.id,
      fileName: image.fileName,
      url: getSignedImageUrl(image.fileName, 300),
    })),
  };
}

// =====================================================
// FORMAT NOTIFICATION
// =====================================================

function formatNotification(notification) {
  if (!notification) return null;

  const { id, userId, complaintId, complaint, offerId, offer, ...rest } =
    notification;

  return {
    ...rest,

    _id: id,
    user: userId,

    complaintId: complaintId || null,
    complaint: formatComplaint(complaint),

    offerId: offerId || null,
    offer: formatOffer(offer),
  };
}

// =====================================================
// GET ALL NOTIFICATIONS
// GET /api/notification/getAll
// =====================================================

const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },

      include: notificationInclude,

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      count: notifications.length,
      notifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications",
    });
  }
};

// =====================================================
// GET UNREAD NOTIFICATIONS
// GET /api/notification/unread
// =====================================================

const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        read: false,
      },

      include: notificationInclude,

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Unread notifications fetched successfully",
      count: notifications.length,
      notifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error("Get unread notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch unread notifications",
    });
  }
};

// =====================================================
// MARK ONE NOTIFICATION AS READ
// PATCH /api/notification/:id/read
// =====================================================

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNotification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user.id,
      },

      select: {
        id: true,
      },
    });

    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const notification = await prisma.notification.update({
      where: {
        id: existingNotification.id,
      },

      data: {
        read: true,
      },

      include: notificationInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification: formatNotification(notification),
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
};

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notification/read-all
// =====================================================

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        read: false,
      },

      data: {
        read: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications",
    });
  }
};

// =====================================================
// RECIPIENT DIRECTORY
//
// GET /api/notification/employee-directory
//
// Query:
// recipientType=EMPLOYEE
// recipientType=CLIENT
//
// Access:
// - SuperAdmin
// - Employees with canNotifyEmployees permission
// =====================================================

const getEmployeeDirectory = async (req, res) => {
  try {
    const sender = await authorizeEmployeeNotification(req, res);

    if (!sender) return;

    const recipientType = String(req.query.recipientType || "EMPLOYEE")
      .trim()
      .toUpperCase();

    if (!["EMPLOYEE", "CLIENT"].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        message: "recipientType must be EMPLOYEE or CLIENT",
      });
    }

    const baseWhere = {
      role: recipientType === "EMPLOYEE" ? "employee" : "client",
      isRevoked: false,

      id: {
        not: sender.id,
      },
    };

    // Employees belong to the sender's organisation.
    // Clients belong to their own organisations.

    if (recipientType === "EMPLOYEE") {
      baseWhere.organisationId = sender.organisationId;
    }

    const users = await prisma.user.findMany({
      where: baseWhere,

      select: {
        id: true,
        userName: true,
        designation: true,

        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        userName: "asc",
      },
    });

    const recipients = users.map((user) => ({
      id: user.id,
      name: user.userName || "Unknown user",
      designation: user.designation || null,
      organisation: user.organisation?.name || null,
      organisationId: user.organisation?.id || null,
    }));

    return res.status(200).json({
      success: true,

      message:
        recipientType === "EMPLOYEE"
          ? "Employee directory fetched successfully"
          : "Client directory fetched successfully",

      recipientType,
      count: recipients.length,
      recipients,

      // Compatibility with existing frontend code.
      ...(recipientType === "EMPLOYEE"
        ? { employees: recipients }
        : { clients: recipients }),
    });
  } catch (error) {
    console.error("Notification recipient directory error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch recipient directory",
    });
  }
};

// =====================================================
// SEND EMPLOYEE / CLIENT NOTIFICATION
//
// POST /api/notification/employees
//
// Body:
// {
//   title: "Announcement",
//   message: "Meeting tomorrow",
//   audience: "ALL" | "SELECTED",
//   recipientType: "EMPLOYEE" | "CLIENT",
//   employeeIds: ["id1", "id2"],
//   clientIds: ["id1", "id2"]
// }
//
// Access:
// - SuperAdmin
// - Employees with canNotifyEmployees permission
// =====================================================

const sendEmployeeNotification = async (req, res) => {
  try {
    // 1. Verify sender permission.

    const sender = await authorizeEmployeeNotification(req, res);

    if (!sender) return;

    // 2. Read request body.

    const {
      title,
      message,
      audience,
      recipientType: requestedRecipientType = "EMPLOYEE",
      employeeIds = [],
      clientIds = [],
    } = req.body || {};

    const recipientType = String(requestedRecipientType).trim().toUpperCase();

    // 3. Validate title and message.

    if (
      typeof title !== "string" ||
      typeof message !== "string" ||
      !title.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    if (title.trim().length > 100 || message.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Title or message exceeds the allowed length",
      });
    }

    // 4. Validate audience.

    if (!["ALL", "SELECTED"].includes(audience)) {
      return res.status(400).json({
        success: false,
        message: "Audience must be ALL or SELECTED",
      });
    }

    // 5. Validate recipient type.

    if (!["EMPLOYEE", "CLIENT"].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        message: "recipientType must be EMPLOYEE or CLIENT",
      });
    }

    // 6. Get selected IDs according to recipient type.

    const selectedIds = recipientType === "EMPLOYEE" ? employeeIds : clientIds;

    if (!Array.isArray(selectedIds)) {
      return res.status(400).json({
        success: false,
        message:
          recipientType === "EMPLOYEE"
            ? "employeeIds must be an array"
            : "clientIds must be an array",
      });
    }

    if (selectedIds.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Maximum 500 recipient IDs are allowed",
      });
    }

    if (selectedIds.some((id) => typeof id !== "string" || !id.trim())) {
      return res.status(400).json({
        success: false,
        message: "One or more recipient IDs are invalid",
      });
    }

    const uniqueSelectedIds = [...new Set(selectedIds.map((id) => id.trim()))];

    if (audience === "SELECTED" && uniqueSelectedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          recipientType === "EMPLOYEE"
            ? "Please select at least one employee"
            : "Please select at least one client",
      });
    }

    // 7. Build eligible recipient query.

    const recipientWhere = {
      role: recipientType === "EMPLOYEE" ? "employee" : "client",

      isRevoked: false,

      id: {
        not: sender.id,
      },
    };

    // Employees are restricted to the sender's organisation.
    // Clients belong to separate client organisations.

    if (recipientType === "EMPLOYEE") {
      recipientWhere.organisationId = sender.organisationId;
    }

    // SELECTED audience.

    if (audience === "SELECTED") {
      recipientWhere.id = {
        in: uniqueSelectedIds,
        not: sender.id,
      };
    }

    // 8. Fetch eligible recipients.

    const recipients = await prisma.user.findMany({
      where: recipientWhere,

      select: {
        id: true,
        role: true,
        fcmToken: true,
      },
    });

    // Ensure every selected ID is eligible.

    if (
      audience === "SELECTED" &&
      recipients.length !== uniqueSelectedIds.length
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Some selected recipients are unavailable, revoked, or not eligible for this notification",

        requestedCount: uniqueSelectedIds.length,
        eligibleCount: recipients.length,
      });
    }

    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,

        message:
          recipientType === "EMPLOYEE"
            ? "No eligible employees found"
            : "No eligible clients found",

        recipientCount: 0,
      });
    }

    // 9. Create in-app notifications.

    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        title: title.trim(),
        body: message.trim(),
        type: "CUSTOM",
        read: false,
      })),
    });

    // 10. Send FCM push notifications.

    const usersWithFcmToken = recipients.filter(
      (recipient) => recipient.fcmToken,
    );

    const pushResults = await Promise.allSettled(
      usersWithFcmToken.map((recipient) =>
        sendNotification({
          fcmToken: recipient.fcmToken,
          title: title.trim(),
          body: message.trim(),
          type: "CUSTOM",
          targetRole: recipient.role,
        }),
      ),
    );

    const pushNotificationsSent = pushResults.filter(
      (result) => result.status === "fulfilled",
    ).length;

    const pushNotificationsFailed = pushResults.length - pushNotificationsSent;

    if (pushNotificationsFailed > 0) {
      console.error(
        `${pushNotificationsFailed} ${recipientType.toLowerCase()} push notification(s) failed`,
      );
    }

    // 11. Response.

    return res.status(200).json({
      success: true,

      message:
        recipientType === "EMPLOYEE"
          ? "Employee notification sent successfully"
          : "Client notification sent successfully",

      recipientType,
      audience,

      recipientCount: recipients.length,

      inAppNotificationsCreated: recipients.length,

      usersWithFcmToken: usersWithFcmToken.length,

      pushNotificationsSent,
      pushNotificationsFailed,
    });
  } catch (error) {
    console.error("Send employee/client notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send notification",
    });
  }
};

// =====================================================
// EXISTING CUSTOM NOTIFICATION
//
// POST /api/notification/custom-notification
//
// Preserved for compatibility with existing admin builds.
// Sends to employees in sender's organisation
// and clients.
// =====================================================

const customNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (
      typeof title !== "string" ||
      typeof message !== "string" ||
      !title.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can send custom notifications",
      });
    }

    const organisationId = normaliseOrganisationId(req.user);

    if (!organisationId) {
      return res.status(400).json({
        success: false,
        message: "Organisation not found",
      });
    }

    const users = await prisma.user.findMany({
      where: {
        isRevoked: false,

        OR: [
          {
            role: "employee",
            organisationId,

            id: {
              not: req.user.id,
            },
          },
          {
            role: "client",
          },
        ],
      },

      select: {
        id: true,
        role: true,
        fcmToken: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No clients or employees found",
      });
    }

    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: title.trim(),
        body: message.trim(),
        type: "CUSTOM",
        read: false,
      })),
    });

    const pushUsers = users.filter((user) => user.fcmToken);

    const pushResults = await Promise.allSettled(
      pushUsers.map((user) =>
        sendNotification({
          fcmToken: user.fcmToken,
          title: title.trim(),
          body: message.trim(),
          type: "CUSTOM",
          targetRole: user.role,
        }),
      ),
    );

    const pushNotificationsSent = pushResults.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length;

    const pushNotificationsFailed = pushResults.length - pushNotificationsSent;

    return res.status(200).json({
      success: true,
      message: "Custom notification sent successfully",

      totalUsers: users.length,

      usersWithFcmToken: pushUsers.length,

      pushNotificationsSent,
      pushNotificationsFailed,
    });
  } catch (error) {
    console.error("Custom notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send custom notification",
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,

  getEmployeeDirectory,
  sendEmployeeNotification,

  customNotification,
};
