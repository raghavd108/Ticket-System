import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../context/ThemeContext';

const BASE_URL = 'http://10.0.2.2:3000/api';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: 'NEW_TICKET' | 'STATUS_UPDATE' | 'CUSTOM';
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
  const [isAdmin, setIsAdmin] = useState(false);

  const [showCustomNotification, setShowCustomNotification] = useState(false);

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  // =========================================================
  // GET CURRENT USER
  // =========================================================

  const getCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.log('No authentication token found');
        return null;
      }

      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.user;
    } catch (error) {
      console.log('GET CURRENT USER ERROR:', error);

      return null;
    }
  };

  // =========================================================
  // CHECK CURRENT USER ROLE
  // =========================================================

  const checkCurrentUser = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        console.log('Unable to get current user.');
        setIsAdmin(false);
        return;
      }

      const userRole = user.role;

      console.log('Logged-in user:', user.userName);
      console.log('Logged-in user role:', userRole);

      setIsAdmin(userRole === 'admin');
    } catch (error) {
      console.log('CHECK CURRENT USER ERROR:', error);
      setIsAdmin(false);
    }
  };

  // =========================================================
  // SEND CUSTOM NOTIFICATION
  // =========================================================

  const sendCustomNotification = async () => {
    try {
      if (!notificationTitle.trim()) {
        Alert.alert('Required', 'Please enter a notification title.');
        return;
      }

      if (!notificationMessage.trim()) {
        Alert.alert('Required', 'Please enter a notification message.');
        return;
      }

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found.');
        return;
      }

      setSendingNotification(true);

      await axios.post(
        `${BASE_URL}/notification/custom-notification`,
        {
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Alert.alert(
        'Notification Sent 🎉',
        'Your notification has been sent successfully to all clients and employees.',
      );

      setNotificationTitle('');
      setNotificationMessage('');
      setShowCustomNotification(false);
    } catch (error: any) {
      console.log(
        'SEND CUSTOM NOTIFICATION ERROR:',
        error?.response?.data || error,
      );

      Alert.alert(
        'Failed',
        error?.response?.data?.message || 'Unable to send notification.',
      );
    } finally {
      setSendingNotification(false);
    }
  };

  // =========================================================
  // GET NOTIFICATIONS
  // =========================================================

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

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

  // =========================================================
  // LOAD WHEN SCREEN OPENS
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      checkCurrentUser();
      fetchNotifications();
    }, []),
  );

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = () => {
    setRefreshing(true);

    checkCurrentUser();
    fetchNotifications();
  };

  // =========================================================
  // MARK ONE AS READ
  // =========================================================

  const markAsRead = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');

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

      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.log('MARK NOTIFICATION READ ERROR:', error);
    }
  };

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);

      const token = await AsyncStorage.getItem('token');

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

      setNotifications(prev =>
        prev.map(notification => ({
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

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (date: string) => {
    const notificationDate = new Date(date);
    const now = new Date();

    const difference = now.getTime() - notificationDate.getTime();

    const minutes = Math.floor(difference / (1000 * 60));

    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d ago`;
    }

    return notificationDate.toLocaleDateString();
  };

  // =========================================================
  // NOTIFICATION ICON
  // =========================================================

  const getNotificationIcon = (type: NotificationItem['type']) => {
    if (type === 'NEW_TICKET') {
      return '🎫';
    }

    if (type === 'STATUS_UPDATE') {
      return '✓';
    }

    return '🔔';
  };

  // =========================================================
  // STATUS
  // =========================================================

  const getStatusLabel = (status?: string) => {
    if (!status) return '';

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // =========================================================
  // NOTIFICATION CARD
  // =========================================================

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => markAsRead(item._id)}
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
      >
        {/* ICON */}

        <View
          style={[
            styles.iconContainer,
            item.type === 'NEW_TICKET' ? styles.ticketIcon : styles.statusIcon,
          ]}
        >
          <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
        </View>

        {/* CONTENT */}

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

          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>

          {/* TICKET INFO */}

          {item.complaint && (
            <View style={styles.ticketInfo}>
              {item.complaint.module && (
                <Text style={styles.moduleText}>{item.complaint.module}</Text>
              )}

              {item.complaint.status && (
                <Text style={styles.statusText}>
                  {getStatusLabel(item.complaint.status)}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // EMPTY STATE
  // =========================================================

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>🔔</Text>
        </View>

        <Text style={styles.emptyTitle}>No notifications</Text>

        <Text style={styles.emptyText}>
          You're all caught up. New ticket updates will appear here.
        </Text>
      </View>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <View style={styles.container}>
      {/* HEADER */}

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

        {/* HEADER ACTIONS */}

        <View style={styles.headerActions}>
          {/* ADMIN ONLY */}

          {isAdmin && (
            <TouchableOpacity
              onPress={() => setShowCustomNotification(true)}
              style={styles.sendNotificationButton}
              activeOpacity={0.8}
            >
              <Text style={styles.sendNotificationText}>+ Send</Text>
            </TouchableOpacity>
          )}

          {/* MARK ALL */}

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              disabled={markingAll}
              style={styles.markAllButton}
              activeOpacity={0.8}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.markAllText}>Mark all read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* NOTIFICATIONS */}

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

      {/* CUSTOM NOTIFICATION MODAL */}

      <Modal
        visible={showCustomNotification}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sendingNotification) {
            setShowCustomNotification(false);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.notificationModal}>
            {/* HEADER */}

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Send Notification</Text>

                <Text style={styles.modalSubtitle}>
                  Send to all clients & employees
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowCustomNotification(false)}
                disabled={sendingNotification}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* TITLE */}

            <Text style={styles.inputLabel}>Notification Title</Text>

            <TextInput
              value={notificationTitle}
              onChangeText={setNotificationTitle}
              placeholder="e.g. Happy Diwali 🎉"
              placeholderTextColor={theme.light}
              style={styles.notificationInput}
              maxLength={100}
            />

            {/* MESSAGE */}

            <Text style={styles.inputLabel}>Message</Text>

            <TextInput
              value={notificationMessage}
              onChangeText={setNotificationMessage}
              placeholder="Write your notification..."
              placeholderTextColor={theme.light}
              style={[styles.notificationInput, styles.messageInput]}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />

            {/* RECIPIENT INFO */}

            <View style={styles.recipientInfo}>
              <Text style={styles.recipientIcon}>👥</Text>

              <Text style={styles.recipientText}>
                This notification will be sent to all clients and employees in
                your organisation.
              </Text>
            </View>

            {/* BUTTONS */}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowCustomNotification(false)}
                disabled={sendingNotification}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={sendCustomNotification}
                disabled={sendingNotification}
                style={styles.sendButton}
              >
                {sendingNotification ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Notification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any, isDarkMode: boolean) =>
  StyleSheet.create({
    /* =====================================================
       CONTAINER
    ===================================================== */

    container: {
      flex: 1,
      paddingTop: 10,
      backgroundColor: theme.background,
    },

    /* =====================================================
       HEADER
    ===================================================== */

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
      marginRight: 10,
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
      gap: 8,
    },

    sendNotificationButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },

    sendNotificationText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.white,
    },

    /* =====================================================
       CUSTOM NOTIFICATION MODAL
    ===================================================== */

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },

    notificationModal: {
      backgroundColor: theme.white,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },

    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.ink,
    },

    modalSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.muted,
    },

    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      fontSize: 25,
      lineHeight: 28,
      color: theme.text,
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
      height: 110,
      paddingTop: 12,
    },

    recipientInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primarySoft,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },

    recipientIcon: {
      fontSize: 18,
      marginRight: 9,
    },

    recipientText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: theme.text,
    },

    modalActions: {
      flexDirection: 'row',
      gap: 10,
    },

    cancelButton: {
      flex: 1,
      paddingVertical: 13,
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
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },

    sendButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.white,
    },

    /* =====================================================
       MARK ALL
    ===================================================== */

    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: theme.primarySoft,
      borderWidth: 1,
      borderColor: theme.border,
    },

    markAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },

    /* =====================================================
       LIST
    ===================================================== */

    listContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 30,
    },

    /* =====================================================
       NOTIFICATION CARD
    ===================================================== */

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

    /* =====================================================
       ICON
    ===================================================== */

    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    ticketIcon: {
      backgroundColor: theme.orangeSoft,
    },

    statusIcon: {
      backgroundColor: theme.greenSoft,
    },

    iconText: {
      fontSize: 19,
    },

    /* =====================================================
       CONTENT
    ===================================================== */

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

    /* =====================================================
       TICKET INFO
    ===================================================== */

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

    /* =====================================================
       EMPTY
    ===================================================== */

    emptyList: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
      shadowColor: theme.dark,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: isDarkMode ? 0 : 0.06,
      shadowRadius: 8,
      elevation: isDarkMode ? 0 : 2,
    },

    emptyIconText: {
      fontSize: 30,
    },

    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: theme.ink,
    },

    emptyText: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 20,
      color: theme.muted,
    },

    /* =====================================================
       LOADING
    ===================================================== */

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
  });

export default Notification;
