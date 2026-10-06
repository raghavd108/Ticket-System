const { messaging } = require("../config/firebaseAdmin");

const sendNotification = async ({
  fcmToken,
  title,
  body,
  type,
  targetRole,
}) => {
  try {
    if (!fcmToken) {
      console.log("No FCM token found");
      return null;
    }

    const message = {
      token: fcmToken,

      notification: {
        title,
        body,
      },

      data: {
        type: String(type || "GENERAL"),
        targetRole: String(targetRole || ""),
      },

      android: {
        priority: "high",

        notification: {
          sound: "default",
        },
      },
    };

    const response = await messaging.send(message);

    console.log("Notification sent:", response);

    return response;
  } catch (error) {
    console.error("FCM send error:", error);

    return null;
  }
};

module.exports = {
  sendNotification,
};
