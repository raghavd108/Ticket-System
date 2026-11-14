import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';

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
import ClientFeedbackScreen from '../pages/feedBack';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

interface UserPermissions {
  canViewAllTickets?: boolean;
  canAssignTickets?: boolean;
  canManageUsers?: boolean;
  canPublishOffers?: boolean;
  canNotifyEmployees?: boolean;
}

interface User {
  id?: string;
  _id?: string;
  name?: string;
  userName: string;
  email: string;
  role: string;
  designation?: string;
  Hospital?: string;
  isSuperAdmin?: boolean;
  permissions?: UserPermissions;
}

const BottomNavigation: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const { theme, isDarkMode } = useTheme();

  const getUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setUser(null);
        return;
      }

      const response = await axios.get(`${Config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const authenticatedUser = response.data?.user;

      if (!authenticatedUser) {
        setUser(null);
        return;
      }

      setUser(authenticatedUser);
    } catch (error: any) {
      console.log(
        'GET AUTHENTICATED USER ERROR:',
        error?.response?.data || error,
      );

      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    getUser();
  }, [getUser]);

  const role = String(user?.role || '')
    .trim()
    .toLowerCase();

  const isClient = role === 'client';

  const permissions = user?.permissions;

  const canViewAllTickets = permissions?.canViewAllTickets === true;
  const canManageUsers = permissions?.canManageUsers === true;
  const canPublishOffers = permissions?.canPublishOffers === true;
  const canNotifyEmployees = permissions?.canNotifyEmployees === true;

  const canAccessManage =
    canManageUsers || canPublishOffers || canNotifyEmployees;

  const tabIcon = (
    focused: boolean,
    activeIcon: string,
    inactiveIcon: string,
  ) => (
    <View style={styles.iconContainer}>
      <Ionicons
        name={focused ? activeIcon : inactiveIcon}
        size={23}
        color={focused ? theme.primary : theme.muted}
      />
    </View>
  );

  if (userLoading) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Loading your account...
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <Ionicons name="lock-closed-outline" size={34} color={theme.muted} />

        <Text style={[styles.loadingText, { color: theme.text }]}>
          Unable to load your account.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: false,

        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,

        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingTop: 7,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,

          backgroundColor: theme.white,

          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,

          elevation: isDarkMode ? 0 : 8,

          shadowColor: isDarkMode ? '#000000' : theme.dark,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: isDarkMode ? 0.25 : 0.07,
          shadowRadius: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
          includeFontPadding: false,
        },

        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },

        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 0,
          paddingVertical: 2,
        },

        tabBarBackground: () => (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.white }]}
          />
        ),

        sceneStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Tab.Screen
        name="Tickets"
        component={ComplainPage}
        options={{
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'document-text', 'document-text-outline'),
        }}
      />

      {isClient ? (
        <>
          <Tab.Screen
            name="New Ticket"
            component={ReportPage}
            options={{
              tabBarLabel: 'New Ticket',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'add-circle', 'add-circle-outline'),
            }}
          />

          <Tab.Screen
            name="Client Offers"
            component={ClientOffersPage}
            options={{
              tabBarLabel: 'Offers',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'gift', 'gift-outline'),
            }}
          />

          <Tab.Screen
            name="ClientFeedback"
            component={ClientFeedbackScreen}
            options={{
              tabBarLabel: 'Feedback',
              tabBarIcon: ({ focused }) =>
                tabIcon(focused, 'chatbubbles', 'chatbubbles-outline'),
            }}
          />
        </>
      ) : (
        <>
          {canViewAllTickets && (
            <Tab.Screen
              name="Search"
              component={SearchPage}
              options={{
                tabBarLabel: 'Search',
                tabBarIcon: ({ focused }) =>
                  tabIcon(focused, 'search', 'search-outline'),
              }}
            />
          )}

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

          {canAccessManage && (
            <Tab.Screen
              name="Manage"
              component={ManagePage}
              options={{
                tabBarLabel: 'Manage',
                tabBarIcon: ({ focused }) =>
                  tabIcon(focused, 'grid', 'grid-outline'),
              }}
            />
          )}
        </>
      )}

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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomNavigation;
