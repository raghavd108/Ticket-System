import React, { useEffect } from 'react';

import {
  getMessaging,
  getInitialNotification,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';

import notifee from '@notifee/react-native';

import Navigation from './src/navigation/navigation';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppStatusBar from './src/components/AppStatusBar';

import {
  createNotificationChannel,
  requestNotificationPermission,
  setupForegroundNotification,
  setupNotificationPressHandler,
} from './src/services/notificationServices';

import { queueNotificationNavigation } from './src/navigation/notificationNavigation';

const App = () => {
  useEffect(() => {
    let isMounted = true;

    // =====================================================
    // INITIALIZE NOTIFICATIONS
    // =====================================================

    const initializeNotifications = async () => {
      try {
        await createNotificationChannel();

        if (!isMounted) return;

        await requestNotificationPermission();

        console.log('NOTIFICATION INITIALIZATION COMPLETED');
      } catch (error) {
        console.log('NOTIFICATION INITIALIZATION ERROR:', error);
      }
    };

    void initializeNotifications();

    // =====================================================
    // FOREGROUND FCM MESSAGE
    // =====================================================

    const unsubscribeForeground = setupForegroundNotification();

    // =====================================================
    // FOREGROUND NOTIFEE NOTIFICATION TAP
    // =====================================================

    const unsubscribeNotifeePress = setupNotificationPressHandler(data => {
      console.log('FOREGROUND NOTIFICATION TAPPED:', data);

      void queueNotificationNavigation(data);
    });

    // =====================================================
    // FIREBASE INSTANCE
    // =====================================================

    const messaging = getMessaging();

    // =====================================================
    // BACKGROUND FCM NOTIFICATION TAP
    // =====================================================

    const unsubscribeFirebasePress = onNotificationOpenedApp(
      messaging,
      remoteMessage => {
        console.log('FIREBASE BACKGROUND NOTIFICATION TAPPED:', remoteMessage);

        if (remoteMessage.data) {
          void queueNotificationNavigation(remoteMessage.data);
        }
      },
    );

    // =====================================================
    // FIREBASE COLD START NOTIFICATION TAP
    // =====================================================

    const handleFirebaseInitialNotification = async () => {
      try {
        const remoteMessage = await getInitialNotification(messaging);

        if (!isMounted || !remoteMessage) return;

        console.log('FIREBASE COLD START NOTIFICATION:', remoteMessage);

        if (remoteMessage.data) {
          await queueNotificationNavigation(remoteMessage.data);
        }
      } catch (error) {
        console.log('FIREBASE INITIAL NOTIFICATION ERROR:', error);
      }
    };

    // =====================================================
    // NOTIFEE COLD START NOTIFICATION TAP
    // =====================================================

    const handleNotifeeInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();

        if (!isMounted || !initialNotification) return;

        const notificationData = initialNotification.notification.data;

        console.log('NOTIFEE COLD START NOTIFICATION:', notificationData);

        if (notificationData) {
          await queueNotificationNavigation(notificationData);
        }
      } catch (error) {
        console.log('NOTIFEE INITIAL NOTIFICATION ERROR:', error);
      }
    };

    // Run both checks. The navigation queue holds
    // notification data until the container is ready.
    void handleFirebaseInitialNotification();
    void handleNotifeeInitialNotification();

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      isMounted = false;

      unsubscribeForeground?.();
      unsubscribeNotifeePress?.();
      unsubscribeFirebasePress?.();

      console.log('NOTIFICATION LISTENERS CLEANED UP');
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppStatusBar />
        <Navigation />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
