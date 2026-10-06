import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

import {
  getMessaging,
  getToken,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';

const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000/api'
  : 'https://your-production-api.com/api';

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

    console.log('FCM TOKEN:', fcmToken);

    if (!fcmToken) {
      console.log('FCM token not available');
      return;
    }

    // Send FCM token to backend
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

    console.log('FCM token saved successfully');
  } catch (error: any) {
    console.log(
      'FCM setup error:',
      error?.response?.data || error?.message || error,
    );
  }
};
