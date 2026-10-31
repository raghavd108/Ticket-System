import React, { useEffect } from 'react';

import Navigation from './src/navigation/navigation';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppStatusBar from './src/components/AppStatusBar';

import {
  createNotificationChannel,
  requestNotificationPermission,
  setupForegroundNotification,
} from './src/services/notificationServices';

const App = () => {
  useEffect(() => {
    let isMounted = true;

    const initializeNotifications = async () => {
      try {
        await createNotificationChannel();

        if (!isMounted) {
          return;
        }

        await requestNotificationPermission();

        console.log('Notification initialization completed');
      } catch (error) {
        console.log('NOTIFICATION INITIALIZATION ERROR:', error);
      }
    };

    initializeNotifications();

    const unsubscribe = setupForegroundNotification();

    return () => {
      isMounted = false;
      unsubscribe?.();
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
