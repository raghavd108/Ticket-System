/**
 * @format
 */

import { AppRegistry } from 'react-native';

import notifee, { EventType } from '@notifee/react-native';

import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import App from './App';

import { name as appName } from './app.json';

import { queueNotificationNavigation } from './src/navigation/notificationNavigation';

const messaging = getMessaging();

// =====================================================
// BACKGROUND FCM MESSAGE HANDLER
// =====================================================

setBackgroundMessageHandler(messaging, async remoteMessage => {
  try {
    console.log('BACKGROUND FCM MESSAGE RECEIVED');
    console.log('Message ID:', remoteMessage.messageId);
    console.log('Notification:', remoteMessage.notification);
    console.log('Data:', remoteMessage.data);

    // Do not navigate when a message is merely received.
    // Navigation happens when the notification is tapped.
  } catch (error) {
    console.log('BACKGROUND FCM ERROR:', error);
  }
});

// =====================================================
// BACKGROUND NOTIFEE NOTIFICATION TAP
// =====================================================

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    if (type !== EventType.PRESS) {
      return;
    }

    const notificationData = detail.notification?.data;

    console.log('BACKGROUND NOTIFICATION PRESSED:', notificationData);

    if (!notificationData) {
      console.log('NOTIFICATION DATA NOT FOUND');
      return;
    }

    // Store data. The actual navigation occurs
    // after the application and navigation are ready.
    await queueNotificationNavigation(notificationData);
  } catch (error) {
    console.log('BACKGROUND NOTIFICATION PRESS ERROR:', error);
  }
});

// =====================================================
// REGISTER APPLICATION
// =====================================================

AppRegistry.registerComponent(appName, () => App);
