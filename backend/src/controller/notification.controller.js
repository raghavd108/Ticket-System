const prisma = require("../config/prisma");
const { sendNotification } = require("../services/fcmService");

// =====================================================
// COMMON HELPER
// =====================================================

const notificationInclude = {
  complaint: {
    include: {
      images: true,
    },
  },
};

function formatComplaint(complaint) {
  if (!complaint) return null;

  const { id, userId, organisationId, status, images, ...rest } = complaint;

  return {
    ...rest,
    _id: id,
    status: status === "in_progress" ? "in-progress" : status,
    user: userId,
    organisation: organisationId,
    image: (images || []).map((image) => ({
      ...image,
      _id: image.id,
    })),
  };
}

function formatNotification(notification) {
  if (!notification) return null;

  const { id, userId, complaintId, complaint, ...rest } = notification;

  return {
    ...rest,
    _id: id,
    user: userId,
    complaint: formatComplaint(complaint),
  };
}

// =====================================================
// GET ALL NOTIFICATIONS
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
      message: "Notifications fetched successfully",
      notifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Unable to fetch notifications",
    });
  }
};

// =====================================================
// GET UNREAD NOTIFICATIONS
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
      message: "Unread notifications fetched successfully",
      count: notifications.length,
      notifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error("Get unread notifications error:", error);

    return res.status(500).json({
      message: "Unable to fetch unread notifications",
    });
  }
};

// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership before updating.
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
      message: "Notification marked as read",
      notification: formatNotification(notification),
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      message: "Unable to update notification",
    });
  }
};

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
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
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      message: "Unable to update notifications",
    });
  }
};

// =====================================================
// SEND CUSTOM NOTIFICATION
// =====================================================

const customNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required",
      });
    }

    // Only admins can send custom notifications.
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can send custom notifications",
      });
    }

    const organisationId =
      typeof req.user.organisation === "object"
        ? req.user.organisation?.id || req.user.organisation?._id
        : req.user.organisation;

    if (!organisationId) {
      return res.status(400).json({
        message: "Organisation not found",
      });
    }

    // Notify clients and employees in this organisation.
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["client", "employee"],
        },
        organisationId,
      },
      select: {
        id: true,
        role: true,
        fcmToken: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({
        message: "No clients or employees found",
      });
    }

    // Save notifications in MySQL.
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title,
        body: message,
        type: "CUSTOM",
        read: false,
      })),
    });

    // Send push notifications independently so one failure
    // does not prevent attempts to notify other users.
    const pushResults = await Promise.allSettled(
      users
        .filter((user) => user.fcmToken)
        .map((user) =>
          sendNotification({
            fcmToken: user.fcmToken,
            title,
            body: message,
            type: "CUSTOM",
            targetRole: user.role,
          }),
        ),
    );

    const pushNotificationsSent = pushResults.filter(
      (result) => result.status === "fulfilled",
    ).length;

    const pushNotificationsFailed = pushResults.length - pushNotificationsSent;

    if (pushNotificationsFailed > 0) {
      console.error(`${pushNotificationsFailed} push notification(s) failed`);
    }

    return res.status(200).json({
      message: "Custom notification sent successfully",
      totalUsers: users.length,
      pushNotificationsSent,
    });
  } catch (error) {
    console.error("Custom notification error:", error);

    return res.status(500).json({
      message: "Unable to send custom notification",
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  customNotification,
};
