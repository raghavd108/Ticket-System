import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { Config } from 'react-native-config';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';

const BASE_URL = __DEV__ ? `${Config.API_URL}/api` : `${Config.API_URL}/api`;

export const setupFCM = async () => {
  try {
    // Get logged-in user's JWT token
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      console.log('User not logged in');
      return;
    }

    // Get Firebase Messaging instance
    const messagingInstance = getMessaging();

    // Request notification permission
    const authStatus = await requestPermission(messagingInstance);

    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Notification permission not granted');
      return;
    }

    // Get FCM token
    const fcmToken = await getToken(messagingInstance);

    if (!fcmToken) {
      console.log('FCM token not available');
      return;
    }

    await saveFcmToken(fcmToken);
  } catch (error: any) {
    console.log(
      'FCM setup error:',
      error?.response?.data || error?.message || error,
    );
  }
};

const saveFcmToken = async (fcmToken: string) => {
  const token = await AsyncStorage.getItem('token');

  if (!token) {
    return;
  }

  await axios.post(
    `${BASE_URL}/auth/fcm-token`,
    {
      fcmToken,
      platform: Platform.OS,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

// Firebase can rotate the device token at any time; without this the
// backend keeps sending to a dead token and push notifications stop.
export const listenForTokenRefresh = () =>
  onTokenRefresh(getMessaging(), async fcmToken => {
    try {
      await saveFcmToken(fcmToken);
    } catch (error: any) {
      console.log(
        'FCM token refresh error:',
        error?.response?.data || error?.message || error,
      );
    }
  });
