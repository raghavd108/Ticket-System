const { messaging } = require("../config/firebaseAdmin");
const prisma = require("../config/prisma");

// Android channel IDs created by the mobile app (notificationServices.ts).
// Setting the channel lets background notifications use the right
// importance and sound when the app is not running.
const CHANNEL_BY_TYPE = {
  NEW_TICKET: "new_ticket",
  STATUS_UPDATE: "status_update",
  CUSTOM: "custom_notification",
  LEAVE_REQUEST: "leave_notifications",
  LEAVE_APPROVED: "leave_notifications",
  LEAVE_REJECTED: "leave_notifications",
};

// Tokens Firebase reports as permanently invalid are removed so we stop
// sending to uninstalled apps or rotated tokens.
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const sendNotification = async ({
  fcmToken,
  title,
  body,
  type,
  targetRole,
  data = {},
}) => {
  try {
    if (!fcmToken) {
      return null;
    }

    const stringData = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    );

    const message = {
      token: fcmToken,

      notification: {
        title,
        body,
      },

      data: {
        ...stringData,
        type: String(type || "GENERAL"),
        targetRole: String(targetRole || ""),
      },

      android: {
        priority: "high",

        notification: {
          sound: "default",
          channelId: CHANNEL_BY_TYPE[type] || "custom_notification",
        },
      },
    };

    return await messaging.send(message);
  } catch (error) {
    console.error("FCM send error:", error.code || error.message);

    if (INVALID_TOKEN_CODES.has(error.code)) {
      await prisma.user
        .updateMany({
          where: { fcmToken },
          data: { fcmToken: null },
        })
        .catch(() => {});
    }

    return null;
  }
};

// Store an in-app notification for every recipient, then attempt push
// delivery. Push failures never affect the in-app record or the caller.
const notifyUsers = async (
  recipients,
  { title, body, type, complaintId = null, data = {} },
) => {
  const uniqueRecipients = [
    ...new Map(
      (recipients || [])
        .filter((recipient) => recipient?.id)
        .map((recipient) => [recipient.id, recipient]),
    ).values(),
  ];

  if (uniqueRecipients.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: uniqueRecipients.map((recipient) => ({
        userId: recipient.id,
        title,
        body,
        type: ["NEW_TICKET", "STATUS_UPDATE"].includes(type) ? type : "CUSTOM",
        complaintId,
      })),
    });
  } catch (error) {
    console.error("Notification database error:", error.message);
  }

  await Promise.allSettled(
    uniqueRecipients
      .filter((recipient) => recipient.fcmToken)
      .map((recipient) =>
        sendNotification({
          fcmToken: recipient.fcmToken,
          title,
          body,
          type,
          targetRole: recipient.role,
          data: {
            ...data,
            ...(complaintId ? { complaintId } : {}),
          },
        }),
      ),
  );
};

module.exports = {
  sendNotification,
  notifyUsers,
};
