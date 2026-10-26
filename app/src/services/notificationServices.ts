import notifee, { AndroidImportance } from '@notifee/react-native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';

// =====================================================
// TYPES
// =====================================================

type NotificationMessage = {
  messageId?: string;

  notification?: {
    title?: string;
    body?: string;
  };

  data?: {
    [key: string]: string | object;
  };
};

// =====================================================
// NOTIFICATION CHANNEL IDS
// =====================================================

const CHANNEL_NEW_TICKET = 'new_ticket';
const CHANNEL_STATUS_UPDATE = 'status_update';
const CHANNEL_CUSTOM = 'custom_notification';
const CHANNEL_LEAVE = 'leave_notifications';

// Android drawable resource name, without extension.
// Create this resource in android/app/src/main/res/drawable/.
const NOTIFICATION_ICON = 'ic_notification';

// =====================================================
// CREATE NOTIFICATION CHANNELS
// =====================================================

export const createNotificationChannel = async () => {
  try {
    await notifee.createChannel({
      id: CHANNEL_NEW_TICKET,
      name: 'New Ticket Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'new_ticket',
    });

    await notifee.createChannel({
      id: CHANNEL_STATUS_UPDATE,
      name: 'Ticket Status Updates',
      importance: AndroidImportance.HIGH,
      sound: 'status_update',
    });

    await notifee.createChannel({
      id: CHANNEL_CUSTOM,
      name: 'Admin Messages',
      importance: AndroidImportance.HIGH,
      sound: 'custom_notification',
    });

    await notifee.createChannel({
      id: CHANNEL_LEAVE,
      name: 'Leave Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    console.log('All notification channels created successfully');
  } catch (error) {
    console.log('CREATE NOTIFICATION CHANNEL ERROR:', error);
  }
};

// =====================================================
// REQUEST NOTIFICATION PERMISSION
// =====================================================

export const requestNotificationPermission = async () => {
  try {
    const settings = await notifee.requestPermission();

    console.log('Notification permission requested:', settings);
    return settings;
  } catch (error) {
    console.log('NOTIFICATION PERMISSION ERROR:', error);
    return null;
  }
};

// =====================================================
// GET MESSAGE BODY
// =====================================================

const getMessageBody = (remoteMessage: NotificationMessage): string => {
  if (typeof remoteMessage.notification?.body === 'string') {
    return remoteMessage.notification.body;
  }

  if (typeof remoteMessage.data?.body === 'string') {
    return remoteMessage.data.body;
  }

  return 'You have a new notification';
};

// =====================================================
// GET MESSAGE TITLE
// =====================================================

const getMessageTitle = (
  remoteMessage: NotificationMessage,
  defaultTitle: string,
): string => {
  if (typeof remoteMessage.notification?.title === 'string') {
    return remoteMessage.notification.title;
  }

  if (typeof remoteMessage.data?.title === 'string') {
    return remoteMessage.data.title;
  }

  return defaultTitle;
};

// =====================================================
// COMMON NOTIFICATION DISPLAY HELPER
// =====================================================

const displayNotification = async (
  remoteMessage: NotificationMessage,
  channelId: string,
  defaultTitle: string,
) => {
  try {
    await notifee.displayNotification({
      title: getMessageTitle(remoteMessage, defaultTitle),
      body: getMessageBody(remoteMessage),
      data: remoteMessage.data,

      android: {
        channelId,
        smallIcon: NOTIFICATION_ICON,
        importance: AndroidImportance.HIGH,

        pressAction: {
          id: 'default',
        },
      },
    });

    console.log('Notification displayed:', remoteMessage.data?.type);
  } catch (error) {
    console.log(`NOTIFICATION DISPLAY ERROR (${channelId}):`, error);
  }
};

// =====================================================
// DISPLAY NEW TICKET NOTIFICATION
// =====================================================

const displayNewTicketNotification = async (
  remoteMessage: NotificationMessage,
) => {
  await displayNotification(
    remoteMessage,
    CHANNEL_NEW_TICKET,
    'New Ticket Created',
  );
};

// =====================================================
// DISPLAY TICKET STATUS UPDATE
// =====================================================

const displayStatusUpdateNotification = async (
  remoteMessage: NotificationMessage,
) => {
  await displayNotification(
    remoteMessage,
    CHANNEL_STATUS_UPDATE,
    'Ticket Status Updated',
  );
};

// =====================================================
// DISPLAY CUSTOM NOTIFICATION
// =====================================================

const displayCustomNotification = async (
  remoteMessage: NotificationMessage,
) => {
  await displayNotification(remoteMessage, CHANNEL_CUSTOM, 'New Message');
};

// =====================================================
// DISPLAY LEAVE NOTIFICATION
// =====================================================

const displayLeaveNotification = async (remoteMessage: NotificationMessage) => {
  const type = remoteMessage.data?.type;

  let defaultTitle = 'Leave Notification';

  if (type === 'LEAVE_REQUEST') {
    defaultTitle = 'New Leave Request';
  } else if (type === 'LEAVE_APPROVED') {
    defaultTitle = 'Leave Request Approved';
  } else if (type === 'LEAVE_REJECTED') {
    defaultTitle = 'Leave Request Rejected';
  }

  await displayNotification(remoteMessage, CHANNEL_LEAVE, defaultTitle);
};

// =====================================================
// FOREGROUND NOTIFICATION HANDLER
// =====================================================

export const setupForegroundNotification = () => {
  const messagingInstance = getMessaging();

  const unsubscribe = onMessage(messagingInstance, async remoteMessage => {
    try {
      console.log('=================================');
      console.log('FCM MESSAGE RECEIVED');
      console.log('Message ID:', remoteMessage.messageId);
      console.log('Notification:', remoteMessage.notification);
      console.log('Data:', remoteMessage.data);
      console.log('=================================');

      const notificationType = remoteMessage.data?.type;

      console.log('Notification type:', notificationType);

      switch (notificationType) {
        case 'NEW_TICKET':
          await displayNewTicketNotification(remoteMessage);
          break;

        case 'STATUS_UPDATE':
          await displayStatusUpdateNotification(remoteMessage);
          break;

        case 'LEAVE_REQUEST':
        case 'LEAVE_APPROVED':
        case 'LEAVE_REJECTED':
          await displayLeaveNotification(remoteMessage);
          break;

        case 'CUSTOM':
          await displayCustomNotification(remoteMessage);
          break;

        default:
          console.log('Notification ignored. Unknown type:', notificationType);
          break;
      }
    } catch (error) {
      console.log('FOREGROUND NOTIFICATION ERROR:', error);
    }
  });

  return unsubscribe;
};
