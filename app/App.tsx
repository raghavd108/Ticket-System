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
    const initializeNotifications = async () => {
      await requestNotificationPermission();
      await createNotificationChannel();
    };

    initializeNotifications();

    const unsubscribe = setupForegroundNotification();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
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
