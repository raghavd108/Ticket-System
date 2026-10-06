const notifiModel = require("../model/notification.model");

const userModel = require("../model/user.model");

const { sendNotification } = require("../services/fcmService");

const getNotifications = async (req, res) => {
  try {
    const notifications = await notifiModel
      .find({
        user: req.user.id,
      })
      .populate("complaint")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      message: "Notifications fetched successfully",
      notifications,
    });
  } catch (error) {
    console.log("Get notifications error:", error);

    return res.status(500).json({
      message: "Unable to fetch notifications",
    });
  }
};

const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await notifiModel
      .find({
        user: req.user.id,
        read: false,
      })
      .populate("complaint")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      message: "Unread notifications fetched successfully",
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.log("Get unread notifications error:", error);

    return res.status(500).json({
      message: "Unable to fetch unread notifications",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await notifiModel.findOneAndUpdate(
      {
        _id: id,
        user: req.user.id,
      },
      {
        read: true,
      },
      {
        returnDocument: "after",
      },
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.log("Mark notification read error:", error);

    return res.status(500).json({
      message: "Unable to update notification",
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await notifiModel.updateMany(
      {
        user: req.user.id,
        read: false,
      },
      {
        read: true,
      },
    );

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.log("Mark all notifications read error:", error);

    return res.status(500).json({
      message: "Unable to update notifications",
    });
  }
};

const customNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    // Validate request
    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required",
      });
    }

    // Find all clients and employees
    const users = await userModel.find({
      role: {
        $in: ["client", "employee"],
      },
    });

    if (!users.length) {
      return res.status(404).json({
        message: "No clients or employees found",
      });
    }

    // Create notifications for MongoDB
    const notificationData = users.map((user) => ({
      user: user._id,
      title: title,
      body: message,
      type: "CUSTOM",
      read: false,
    }));

    await notifiModel.insertMany(notificationData);

    // Send FCM notifications
    const notificationPromises = users
      .filter((user) => user.fcmToken)
      .map((user) =>
        sendNotification({
          fcmToken: user.fcmToken,
          title: title,
          body: message,
          type: "CUSTOM",
          targetRole: user.role,
        }),
      );

    await Promise.all(notificationPromises);

    return res.status(200).json({
      message: "Custom notification sent successfully",
      totalUsers: users.length,
      pushNotificationsSent: notificationPromises.length,
    });
  } catch (error) {
    console.log("Custom notification error:", error);

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
