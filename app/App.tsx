import React, { useEffect } from 'react';

import Navigation from './src/navigation/navigation';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';

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
        // Create Android notification channels first.
        await createNotificationChannel();

        if (!isMounted) {
          return;
        }

        // Request notification permission.
        await requestNotificationPermission();

        console.log('Notification initialization completed');
      } catch (error) {
        console.log('NOTIFICATION INITIALIZATION ERROR:', error);
      }
    };

    initializeNotifications();

    // Register foreground notification listener once.
    const unsubscribe = setupForegroundNotification();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
