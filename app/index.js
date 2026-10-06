/**
 * @format
 */

import { AppRegistry } from 'react-native';

import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import App from './App';

import { name as appName } from './app.json';

/**
 * Get Firebase Messaging instance
 */
const messaging = getMessaging();

/**
 * Handle FCM notifications received
 * while the app is in the background or terminated.
 */
setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log('Background notification:', remoteMessage);
});

/**
 * Register React Native application
 */
AppRegistry.registerComponent(appName, () => App);
