import notifee, { AndroidImportance } from '@notifee/react-native';

import { getMessaging, onMessage } from '@react-native-firebase/messaging';

// =====================================================
// NOTIFICATION MESSAGE TYPE
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

// =====================================================
// CREATE NOTIFICATION CHANNELS
// =====================================================

export const createNotificationChannel = async () => {
  try {
    // =================================================
    // NEW TICKET CHANNEL
    // =================================================

    await notifee.createChannel({
      id: CHANNEL_NEW_TICKET,
      name: 'New Ticket Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'new_ticket',
    });

    // =================================================
    // STATUS UPDATE CHANNEL
    // =================================================

    await notifee.createChannel({
      id: CHANNEL_STATUS_UPDATE,
      name: 'Ticket Status Updates',
      importance: AndroidImportance.HIGH,
      sound: 'status_update',
    });

    // =================================================
    // CUSTOM MESSAGE CHANNEL
    // =================================================

    await notifee.createChannel({
      id: CHANNEL_CUSTOM,
      name: 'Admin Messages',
      importance: AndroidImportance.HIGH,
      sound: 'custom_notification',
    });

    console.log('Notification channels created successfully');
  } catch (error) {
    console.log('CREATE NOTIFICATION CHANNEL ERROR:', error);
  }
};

// =====================================================
// REQUEST NOTIFICATION PERMISSION
// =====================================================

export const requestNotificationPermission = async () => {
  try {
    await notifee.requestPermission();

    console.log('Notification permission requested');
  } catch (error) {
    console.log('NOTIFICATION PERMISSION ERROR:', error);
  }
};

// =====================================================
// GET MESSAGE BODY
// =====================================================

const getMessageBody = (remoteMessage: NotificationMessage): string => {
  // -----------------------------------------------
  // FCM notification body
  // -----------------------------------------------

  if (typeof remoteMessage.notification?.body === 'string') {
    return remoteMessage.notification.body;
  }

  // -----------------------------------------------
  // FCM data body
  // -----------------------------------------------

  const dataBody = remoteMessage.data?.body;

  if (typeof dataBody === 'string') {
    return dataBody;
  }

  // -----------------------------------------------
  // DEFAULT
  // -----------------------------------------------

  return 'You have a new notification';
};

// =====================================================
// GET MESSAGE TITLE
// =====================================================

const getMessageTitle = (
  remoteMessage: NotificationMessage,
  defaultTitle: string,
): string => {
  // -----------------------------------------------
  // FCM notification title
  // -----------------------------------------------

  if (typeof remoteMessage.notification?.title === 'string') {
    return remoteMessage.notification.title;
  }

  // -----------------------------------------------
  // FCM data title
  // -----------------------------------------------

  const dataTitle = remoteMessage.data?.title;

  if (typeof dataTitle === 'string') {
    return dataTitle;
  }

  // -----------------------------------------------
  // DEFAULT
  // -----------------------------------------------

  return defaultTitle;
};

// =====================================================
// DISPLAY NEW TICKET NOTIFICATION
// =====================================================

const displayNewTicketNotification = async (
  remoteMessage: NotificationMessage,
) => {
  try {
    await notifee.displayNotification({
      title: getMessageTitle(remoteMessage, 'New Ticket Created'),

      body: getMessageBody(remoteMessage),

      data: remoteMessage.data,

      android: {
        channelId: CHANNEL_NEW_TICKET,

        importance: AndroidImportance.HIGH,

        pressAction: {
          id: 'default',
        },
      },
    });

    console.log('New ticket notification displayed');
  } catch (error) {
    console.log('NEW TICKET NOTIFICATION ERROR:', error);
  }
};

// =====================================================
// DISPLAY STATUS UPDATE NOTIFICATION
// =====================================================

const displayStatusUpdateNotification = async (
  remoteMessage: NotificationMessage,
) => {
  try {
    await notifee.displayNotification({
      title: getMessageTitle(remoteMessage, 'Ticket Status Updated'),

      body: getMessageBody(remoteMessage),

      data: remoteMessage.data,

      android: {
        channelId: CHANNEL_STATUS_UPDATE,

        importance: AndroidImportance.HIGH,

        pressAction: {
          id: 'default',
        },
      },
    });

    console.log('Status update notification displayed');
  } catch (error) {
    console.log('STATUS UPDATE NOTIFICATION ERROR:', error);
  }
};

// =====================================================
// DISPLAY CUSTOM NOTIFICATION
// =====================================================

const displayCustomNotification = async (
  remoteMessage: NotificationMessage,
) => {
  try {
    await notifee.displayNotification({
      title: getMessageTitle(remoteMessage, 'New Message'),

      body: getMessageBody(remoteMessage),

      data: remoteMessage.data,

      android: {
        channelId: CHANNEL_CUSTOM,

        importance: AndroidImportance.HIGH,

        pressAction: {
          id: 'default',
        },
      },
    });

    console.log('Custom notification displayed');
  } catch (error) {
    console.log('CUSTOM NOTIFICATION ERROR:', error);
  }
};

// =====================================================
// FOREGROUND NOTIFICATION
// =====================================================

export const setupForegroundNotification = () => {
  const messagingInstance = getMessaging();

  const unsubscribe = onMessage(messagingInstance, async remoteMessage => {
    try {
      console.log('=================================');

      console.log('FCM MESSAGE RECEIVED');

      console.log('=================================');

      console.log('Message ID:', remoteMessage.messageId);

      console.log('Notification:', remoteMessage.notification);

      console.log('Data:', remoteMessage.data);

      // =================================================
      // GET NOTIFICATION TYPE
      // =================================================

      const notificationType = remoteMessage.data?.type;

      console.log('Notification type:', notificationType);

      // =================================================
      // NEW TICKET
      // =================================================

      if (notificationType === 'NEW_TICKET') {
        console.log('Displaying NEW TICKET notification');

        await displayNewTicketNotification(remoteMessage);

        return;
      }

      // =================================================
      // STATUS UPDATE
      // =================================================

      if (notificationType === 'STATUS_UPDATE') {
        console.log('Displaying STATUS UPDATE notification');

        await displayStatusUpdateNotification(remoteMessage);

        return;
      }

      // =================================================
      // CUSTOM
      // =================================================

      if (notificationType === 'CUSTOM') {
        console.log('Displaying CUSTOM notification');

        await displayCustomNotification(remoteMessage);

        return;
      }

      // =================================================
      // UNKNOWN TYPE
      // =================================================

      console.log(
        'Notification ignored. Unknown notification type:',
        notificationType,
      );
    } catch (error) {
      console.log('FOREGROUND NOTIFICATION ERROR:', error);
    }
  });

  return unsubscribe;
};
