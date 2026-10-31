import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../context/ThemeContext';
import { Config } from 'react-native-config';
import { getStatusName } from '../hooks/useTicketStatuses';

const BASE_URL = `${Config.API_URL}/api`;

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: 'NEW_TICKET' | 'STATUS_UPDATE' | 'CUSTOM' | 'ANNOUNCEMENT';
  read: boolean;
  complaint?: {
    _id: string;
    module?: string;
    problem?: string;
    status?: string;
  };
  createdAt: string;
}

const Notification = () => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  // =====================================================
  // FETCH NOTIFICATIONS
  // =====================================================

  const fetchNotifications = async () => {
    try {
      const token = await getToken();

      if (!token) {
        setNotifications([]);
        return;
      }

      const response = await axios.get(`${BASE_URL}/notification/getAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.log('FETCH NOTIFICATIONS ERROR:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // SCREEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const markAsRead = async (notificationId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      await axios.patch(
        `${BASE_URL}/notification/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications(previous =>
        previous.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
    } catch (error) {
      console.log('MARK READ ERROR:', error);
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);

      const token = await getToken();
      if (!token) return;

      await axios.patch(
        `${BASE_URL}/notification/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications(previous =>
        previous.map(notification => ({
          ...notification,
          read: true,
        })),
      );
    } catch (error) {
      console.log('MARK ALL READ ERROR:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (date: string) => {
    const notificationDate = new Date(date);
    const difference = Date.now() - notificationDate.getTime();

    const minutes = Math.floor(difference / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return notificationDate.toLocaleDateString();
  };

  // =====================================================
  // NOTIFICATION ICON
  // =====================================================

  const getNotificationIcon = (type: NotificationItem['type']) => {
    if (type === 'NEW_TICKET') return 'ticket-outline';
    if (type === 'STATUS_UPDATE') return 'checkmark-circle-outline';
    return 'notifications-outline';
  };

  // =====================================================
  // NOTIFICATION CARD
  // =====================================================

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => markAsRead(item._id)}
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={22}
          color={theme.primary}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !item.read && styles.unreadTitle]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>

        {item.complaint && (
          <View style={styles.ticketInfo}>
            {item.complaint.module && (
              <Text style={styles.moduleText}>{item.complaint.module}</Text>
            )}

            {item.complaint.status && (
              <Text style={styles.statusText}>
                {getStatusName(item.complaint.status)}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  // =====================================================
  // EMPTY STATE
  // =====================================================

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={42}
          color={theme.muted}
        />

        <Text style={styles.emptyTitle}>No notifications</Text>

        <Text style={styles.emptyText}>
          You're all caught up. New updates will appear here.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter(
    notification => !notification.read,
  ).length;

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>

          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread notification${
                  unreadCount > 1 ? 's' : ''
                }`
              : 'You are all caught up'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              disabled={markingAll}
              style={styles.markAllButton}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.markAllText}>Read all</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        renderItem={renderNotification}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// =====================================================
// STYLES
// =====================================================

const createStyles = (theme: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 10,
      backgroundColor: theme.background,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 18,
      backgroundColor: theme.white,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    headerLeft: {
      flex: 1,
      marginRight: 8,
    },

    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.ink,
      letterSpacing: -0.5,
    },

    headerSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.muted,
      fontWeight: '500',
    },

    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    sendNotificationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },

    sendNotificationText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.white,
    },

    markAllButton: {
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: theme.primarySoft,
    },

    markAllText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },

    listContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 30,
    },

    notificationCard: {
      flexDirection: 'row',
      backgroundColor: theme.white,
      borderRadius: 16,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },

    unreadCard: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },

    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    notificationContent: {
      flex: 1,
    },

    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },

    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },

    unreadTitle: {
      color: theme.ink,
    },

    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
      marginLeft: 8,
    },

    body: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.muted,
    },

    ticketInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 9,
      gap: 7,
    },

    moduleText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text,
      backgroundColor: theme.blueSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },

    statusText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.green,
      backgroundColor: theme.greenSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },

    time: {
      marginTop: 9,
      fontSize: 11,
      color: theme.light,
      fontWeight: '500',
    },

    emptyList: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },

    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: theme.ink,
      marginTop: 15,
    },

    emptyText: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 20,
      color: theme.muted,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: theme.muted,
    },

    // MODAL

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.48)',
      justifyContent: 'flex-end',
    },

    notificationModal: {
      maxHeight: '94%',
      backgroundColor: theme.white,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 15,
      overflow: 'hidden',
    },

    modalHandle: {
      width: 42,
      height: 4,
      borderRadius: 5,
      backgroundColor: theme.light,
      alignSelf: 'center',
      marginBottom: 17,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },

    modalTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: theme.ink,
    },

    modalSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.muted,
    },

    closeButton: {
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalScroll: {
      paddingBottom: 10,
    },

    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 7,
    },

    notificationInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.background,
      marginBottom: 16,
    },

    messageInput: {
      height: 95,
      paddingTop: 12,
    },

    sectionLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.ink,
      marginBottom: 10,
    },

    audienceContainer: {
      gap: 9,
      marginBottom: 20,
    },

    audienceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      gap: 11,
    },

    audienceSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },

    audienceTextContainer: {
      flex: 1,
    },

    audienceTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },

    selectedText: {
      color: theme.primary,
    },

    audienceSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: theme.muted,
    },

    employeeSection: {
      marginBottom: 18,
    },

    employeeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    selectedCount: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      marginBottom: 14,
    },

    searchInput: {
      flex: 1,
      height: 43,
      fontSize: 13,
      color: theme.text,
      paddingVertical: 0,
    },

    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.muted,
      marginBottom: 9,
    },

    designationList: {
      gap: 7,
      paddingBottom: 13,
    },

    designationChip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },

    designationChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },

    designationChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
    },

    designationChipTextActive: {
      color: theme.white,
    },

    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },

    employeeCount: {
      fontSize: 11,
      color: theme.muted,
      fontWeight: '600',
    },

    selectionButtons: {
      flexDirection: 'row',
      gap: 15,
    },

    actionText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },

    clearText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.muted,
    },

    employeeList: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 13,
      overflow: 'hidden',
    },

    employeeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },

    employeeAvatar: {
      width: 37,
      height: 37,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
      marginRight: 11,
    },

    avatarText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.primary,
    },

    employeeDetails: {
      flex: 1,
    },

    employeeName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },

    employeeDesignation: {
      marginTop: 3,
      fontSize: 11,
      color: theme.muted,
    },

    noEmployees: {
      textAlign: 'center',
      padding: 20,
      color: theme.muted,
      fontSize: 12,
    },

    recipientInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primarySoft,
      borderRadius: 13,
      padding: 13,
      marginBottom: 18,
      gap: 11,
    },

    recipientIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.white,
    },

    recipientDetails: {
      flex: 1,
    },

    recipientHeading: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },

    recipientText: {
      marginTop: 3,
      fontSize: 11,
      color: theme.muted,
    },

    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 3,
    },

    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },

    cancelButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },

    sendButton: {
      flex: 1.5,
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },

    sendButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
  });

export default Notification;
