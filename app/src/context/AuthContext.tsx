import React, { createContext, useContext, useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { setupFCM } from '../services/fcmService';
import { Config } from 'react-native-config';
const API_URL = Config.API_URL;

type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate the saved session against the backend on app startup.
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        if (!token) {
          if (mounted) {
            setIsAuthenticated(false);
          }
          return;
        }

        await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (mounted) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        // The session is invalid, expired, revoked, or its user was deleted.
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');

        if (mounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Called after a successful login.
  const login = async (token: string) => {
    // Verify the token with the backend before saving it.
    await axios.get(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await AsyncStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  // Register FCM for the currently authenticated user.
  useEffect(() => {
    if (isAuthenticated) {
      void setupFCM();
    }
  }, [isAuthenticated]);

  // Revoke the server session and clear the backend FCM token.
  const logout = async () => {
    const token = await AsyncStorage.getItem('token');

    if (token) {
      // If this fails, preserve local authentication so logout can be retried.
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    }

    // The backend has confirmed logout; clear the local session.
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
