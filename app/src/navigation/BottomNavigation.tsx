import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
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

  // =====================================================
  // GET AUTHENTICATED USER
  // =====================================================

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

  // =====================================================
  // AUTHENTICATED USER INFORMATION
  // =====================================================

  const role = String(user?.role || '')
    .trim()
    .toLowerCase();

  // Role is used only to identify client-specific navigation.
  const isClient = role === 'client';

  // All staff access decisions come from backend permissions.
  const permissions = user?.permissions;

  const canViewAllTickets = permissions?.canViewAllTickets === true;

  const canManageUsers = permissions?.canManageUsers === true;

  const canPublishOffers = permissions?.canPublishOffers === true;

  const canNotifyEmployees = permissions?.canNotifyEmployees === true;

  // Manage is displayed only when the user has at least
  // one of the permissions supported by its management features.
  const canAccessManage =
    canManageUsers || canPublishOffers || canNotifyEmployees;

  // =====================================================
  // TAB ICON
  // =====================================================

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

  // =====================================================
  // LOADING SCREEN
  // =====================================================

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

  // =====================================================
  // NO AUTHENTICATED USER
  // =====================================================

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

  // =====================================================
  // TAB NAVIGATION
  // =====================================================

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
      {/* =============================================
          TICKETS
      ============================================= */}

      <Tab.Screen
        name="Tickets"
        component={ComplainPage}
        options={{
          tabBarLabel: 'Tickets',

          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'document-text', 'document-text-outline'),
        }}
      />

      {/* =============================================
          CLIENT NAVIGATION
      ============================================= */}

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
          {/* =========================================
              STAFF SEARCH
              Requires canViewAllTickets
          ========================================= */}

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

          {/* =========================================
              USER MANAGEMENT
              Requires canManageUsers
          ========================================= */}

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

          {/* =========================================
              MANAGE
              Requires at least one supported
              management permission.
          ========================================= */}

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

      {/* =============================================
          PROFILE
      ============================================= */}

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

// =====================================================
// STYLES
// =====================================================

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
});

export default BottomNavigation;
