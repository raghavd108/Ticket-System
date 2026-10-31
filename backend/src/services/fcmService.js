const { messaging } = require("../config/firebaseAdmin");
const prisma = require("../config/prisma");

// =====================================================
// ANDROID NOTIFICATION CHANNELS
// These IDs must match the channels created in the
// React Native application.
// =====================================================

const CHANNEL_BY_TYPE = {
  NEW_TICKET: "new_ticket",
  STATUS_UPDATE: "status_update",
  CUSTOM: "custom_notification",
  OFFER: "custom_notification",

  LEAVE_REQUEST: "leave_notifications",
  LEAVE_APPROVED: "leave_notifications",
  LEAVE_REJECTED: "leave_notifications",
};

// =====================================================
// INVALID FCM TOKEN ERROR CODES
// =====================================================

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

// =====================================================
// SEND SINGLE PUSH NOTIFICATION
//
// Returns:
// Firebase message ID = successfully sent
// null = failed or missing token
// =====================================================

const sendNotification = async ({
  fcmToken,
  title,
  body,
  type,
  targetRole,
  data = {},
}) => {
  try {
    // -------------------------------------------------
    // 1. Validate FCM token
    // -------------------------------------------------

    if (!fcmToken) {
      return null;
    }

    // -------------------------------------------------
    // 2. Convert all custom data values into strings
    // FCM data payload only accepts string values.
    // -------------------------------------------------

    const stringData = Object.fromEntries(
      Object.entries(data || {})
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    );

    const notificationType = String(type || "GENERAL");

    // -------------------------------------------------
    // 3. Build FCM message
    // -------------------------------------------------

    const message = {
      token: fcmToken,

      notification: {
        title: String(title || ""),
        body: String(body || ""),
      },

      data: {
        ...stringData,
        type: notificationType,
        targetRole: String(targetRole || ""),
      },

      android: {
        priority: "high",

        notification: {
          sound: "default",

          channelId: CHANNEL_BY_TYPE[notificationType] || "custom_notification",
        },
      },
    };

    // -------------------------------------------------
    // 4. Send notification
    // -------------------------------------------------

    const response = await messaging.send(message);

    return response;
  } catch (error) {
    console.error("FCM send error:", error.code || error.message);

    // -------------------------------------------------
    // 5. Remove invalid FCM token
    // -------------------------------------------------

    if (INVALID_TOKEN_CODES.has(error.code)) {
      try {
        await prisma.user.updateMany({
          where: {
            fcmToken,
          },

          data: {
            fcmToken: null,
          },
        });
      } catch (cleanupError) {
        console.error("FCM token cleanup error:", cleanupError.message);
      }
    }

    return null;
  }
};

// =====================================================
// STORE IN-APP NOTIFICATION AND SEND PUSH
//
// Used by:
// - Ticket notifications
// - Status update notifications
// - Leave notifications
// - Offer notifications
// - Custom notifications
// =====================================================

const notifyUsers = async (
  recipients,
  { title, body, type, complaintId = null, offerId = null, data = {} } = {},
) => {
  try {
    // -------------------------------------------------
    // 1. Remove invalid recipients and duplicates
    // -------------------------------------------------

    const uniqueRecipients = [
      ...new Map(
        (recipients || [])
          .filter((recipient) => recipient?.id)
          .map((recipient) => [recipient.id, recipient]),
      ).values(),
    ];

    if (uniqueRecipients.length === 0) {
      return {
        success: true,
        recipientCount: 0,
        inAppNotificationsCreated: 0,
        usersWithFcmToken: 0,
        pushNotificationsSent: 0,
        pushNotificationsFailed: 0,
      };
    }

    // -------------------------------------------------
    // 2. Validate notification type
    // -------------------------------------------------

    const notificationType = ["NEW_TICKET", "STATUS_UPDATE", "OFFER"].includes(
      type,
    )
      ? type
      : "CUSTOM";

    // -------------------------------------------------
    // 3. Create in-app notifications
    // -------------------------------------------------

    let inAppNotificationsCreated = 0;

    try {
      const result = await prisma.notification.createMany({
        data: uniqueRecipients.map((recipient) => ({
          userId: recipient.id,
          title,
          body,
          type: notificationType,
          complaintId,
          offerId,
        })),

        skipDuplicates: true,
      });

      inAppNotificationsCreated = result.count;
    } catch (error) {
      console.error("Notification database error:", error.message);
    }

    // -------------------------------------------------
    // 4. Find users having FCM tokens
    // -------------------------------------------------

    const usersWithFcmToken = uniqueRecipients.filter(
      (recipient) => recipient.fcmToken,
    );

    // -------------------------------------------------
    // 5. Send push notifications
    // -------------------------------------------------

    const pushResults = await Promise.allSettled(
      usersWithFcmToken.map((recipient) =>
        sendNotification({
          fcmToken: recipient.fcmToken,

          title,
          body,

          type: notificationType,

          targetRole: recipient.role,

          data: {
            ...data,

            ...(complaintId ? { complaintId } : {}),

            ...(offerId ? { offerId } : {}),
          },
        }),
      ),
    );

    // -------------------------------------------------
    // 6. Calculate actual push delivery attempts
    // -------------------------------------------------

    const pushNotificationsSent = pushResults.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length;

    const pushNotificationsFailed = pushResults.length - pushNotificationsSent;

    if (pushNotificationsFailed > 0) {
      console.error(`${pushNotificationsFailed} push notification(s) failed`);
    }

    // -------------------------------------------------
    // 7. Return notification summary
    // -------------------------------------------------

    return {
      success: true,

      recipientCount: uniqueRecipients.length,

      inAppNotificationsCreated,

      usersWithFcmToken: usersWithFcmToken.length,

      pushNotificationsSent,
      pushNotificationsFailed,
    };
  } catch (error) {
    console.error("Notify users error:", error.message);

    return {
      success: false,
      message: "Unable to process notifications",
    };
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sendNotification,
  notifyUsers,
};
