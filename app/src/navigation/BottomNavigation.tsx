import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';

import ProfilePage from '../pages/ProfilePage';
import ComplainPage from '../pages/ComplainPage';
import ReportPage from '../pages/TicketGen';
import SearchPage from '../pages/searchPage';
import ClientPage from '../pages/userManagement';
import ManagePage from '../pages/ManagePage';
import ClientOffersPage from '../pages/clientOfferPage';

import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

interface User {
  _id: string;
  userName: string;
  email: string;
  role: string;
  designation?: string;
  Hospital?: string;
}

const BottomNavigation: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) return;

      const response = await axios.get(`${Config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data.user);
    } catch (error) {
      console.log('GET USER ERROR:', error);
    }
  };

  const role = user?.role?.trim().toLowerCase();
  const designation = user?.designation?.trim().toLowerCase();

  const isClient = role === 'client';

  const canManageUsers =
    role === 'admin' ||
    (role === 'employee' && ['ceo', 'cto'].includes(designation || ''));

  const tabIcon = (
    focused: boolean,
    activeIcon: string,
    inactiveIcon: string,
  ) => (
    <Ionicons
      name={focused ? activeIcon : inactiveIcon}
      size={23}
      color={focused ? theme.primary : theme.muted}
    />
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,

        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,

        tabBarStyle: {
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,

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
          fontSize: 12,
          fontWeight: '600',
          marginTop: 3,
          marginBottom: 0,
          includeFontPadding: false,
        },

        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 0,
        },

        sceneStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      {/* TICKETS */}
      <Tab.Screen
        name="Tickets"
        component={ComplainPage}
        options={{
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'document-text', 'document-text-outline'),
        }}
      />

      {/* CLIENT TABS */}
      {isClient ? (
        <>
          {/* NEW TICKET */}
          <Tab.Screen
            name="New Ticket"
            component={ReportPage}
            options={{
              tabBarLabel: 'New Ticket',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'add-circle', 'add-circle-outline'),
            }}
          />
          {/* CLIENT OFFERS */}
          <Tab.Screen
            name="Client Offers"
            component={ClientOffersPage}
            options={{
              tabBarLabel: 'Offers',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'gift', 'gift-outline'),
            }}
          />
        </>
      ) : (
        <>
          {/* STAFF SEARCH */}
          <Tab.Screen
            name="Search"
            component={SearchPage}
            options={{
              tabBarLabel: 'Search',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'search', 'search-outline'),
            }}
          />

          {/* USER MANAGEMENT */}
          {canManageUsers && (
            <Tab.Screen
              name="User Management"
              component={ClientPage}
              options={{
                tabBarLabel: 'Users',
                tabBarIcon: ({ focused }) =>
                  tabIcon(focused, 'people', 'people-outline'),
              }}
            />
          )}

          {/* MANAGE */}
          <Tab.Screen
            name="Manage"
            component={ManagePage}
            options={{
              tabBarLabel: 'Manage',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'grid', 'grid-outline'),
            }}
          />
        </>
      )}

      {/* PROFILE */}
      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'person', 'person-outline'),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigation;
