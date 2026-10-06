import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ProfilePage from '../pages/ProfilePage';
import ComplainPage from '../pages/ComplainPage';
import ReportPage from '../pages/TicketGen';
import SearchPage from '../pages/searchPage';
import ClientPage from '../pages/userManagement';

import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

interface User {
  _id: string;
  userName: string;
  email: string;
  role: string;
  Hospital: string;
}

const BottomNavigation = () => {
  const [user, setUser] = useState<User | null>(null);

  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return;
      }

      const response = await axios.get('http://10.0.2.2:3000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const loggedInUser = response.data.user;

      setUser(loggedInUser);
    } catch (error) {
      console.log('GET USER ERROR:', error);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: theme.primary,

        tabBarInactiveTintColor: theme.muted,

        tabBarStyle: {
          height: 64,

          paddingBottom: 8,
          paddingTop: 6,

          backgroundColor: theme.white,

          borderTopWidth: 1,
          borderTopColor: theme.border,

          elevation: isDarkMode ? 0 : 8,

          shadowColor: isDarkMode ? '#000000' : theme.dark,
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 6,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },

        tabBarItemStyle: {
          borderRadius: 12,
        },

        sceneStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Tab.Screen
        name="Ticket"
        component={ComplainPage}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={24}
              color={focused ? theme.primary : theme.muted}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchPage}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={focused ? theme.primary : theme.muted}
            />
          ),
        }}
      />

      {user?.role === 'client' && (
        <Tab.Screen
          name="Report"
          component={ReportPage}
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'bar-chart' : 'bar-chart-outline'}
                size={24}
                color={focused ? theme.primary : theme.muted}
              />
            ),
          }}
        />
      )}

      {user?.role === 'admin' && (
        <Tab.Screen
          name="User Management"
          component={ClientPage}
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'person-add' : 'person-add-outline'}
                size={24}
                color={focused ? theme.primary : theme.muted}
              />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={focused ? theme.primary : theme.muted}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigation;
