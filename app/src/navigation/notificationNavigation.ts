import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';

export const notificationNavigationRef = createNavigationContainerRef<any>();

const PENDING_NOTIFICATION_KEY = 'pendingNotificationTap';

let navigationEnabled = false;
let isProcessing = false;

export type NotificationTapData = {
  complaintId?: string;
  ticketId?: string;
  offerId?: string;
  type?: string;
  [key: string]: any;
};

const getString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const normalizeNotificationData = (data: any): NotificationTapData | null => {
  if (!data || typeof data !== 'object') return null;

  const complaintId = getString(data.complaintId) || getString(data.ticketId);

  const offerId = getString(data.offerId);

  if (!complaintId && !offerId) {
    console.log('Notification has no valid navigation target:', data);
    return null;
  }

  return {
    ...data,
    complaintId: complaintId || undefined,
    offerId: offerId || undefined,
  };
};

// =====================================================
// QUEUE NOTIFICATION NAVIGATION
// =====================================================

export const queueNotificationNavigation = async (data: any) => {
  try {
    const normalized = normalizeNotificationData(data);

    if (!normalized) return;

    await AsyncStorage.setItem(
      PENDING_NOTIFICATION_KEY,
      JSON.stringify(normalized),
    );

    console.log('NOTIFICATION NAVIGATION QUEUED:', normalized);

    if (navigationEnabled) {
      await flushPendingNotificationNavigation();
    }
  } catch (error) {
    console.log('QUEUE NOTIFICATION NAVIGATION ERROR:', error);
  }
};

// =====================================================
// ENABLE NAVIGATION AFTER NAVIGATION CONTAINER READY
// =====================================================

export const setNotificationNavigationEnabled = async (enabled: boolean) => {
  navigationEnabled = enabled;

  console.log('NOTIFICATION NAVIGATION ENABLED:', enabled);

  if (enabled) {
    await flushPendingNotificationNavigation();
  }
};

// =====================================================
// PROCESS PENDING NOTIFICATION
// =====================================================

export const flushPendingNotificationNavigation = async () => {
  if (
    !navigationEnabled ||
    isProcessing ||
    !notificationNavigationRef.isReady()
  ) {
    return;
  }

  isProcessing = true;

  try {
    const raw = await AsyncStorage.getItem(PENDING_NOTIFICATION_KEY);

    if (!raw) return;

    let data: NotificationTapData;

    try {
      data = JSON.parse(raw);
    } catch {
      console.log('Invalid pending notification data');

      await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
      return;
    }

    const complaintId = getString(data.complaintId);
    const offerId = getString(data.offerId);

    if (!complaintId && !offerId) {
      await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
      return;
    }

    // Remove the queued item before navigating.
    // This prevents duplicate processing by simultaneous handlers.
    await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);

    if (!navigationEnabled || !notificationNavigationRef.isReady()) {
      // Restore if navigation became unavailable.
      await AsyncStorage.setItem(
        PENDING_NOTIFICATION_KEY,
        JSON.stringify(data),
      );
      return;
    }

    // =================================================
    // OPEN TICKET
    // =================================================

    if (complaintId) {
      console.log('OPENING TICKET FROM NOTIFICATION:', complaintId);

      notificationNavigationRef.navigate('Main', {
        screen: 'Tickets',
        params: {
          openTicketId: complaintId,
        },
      });

      return;
    }

    // =================================================
    // OPEN CLIENT OFFER
    // =================================================

    if (offerId) {
      console.log('OPENING OFFER FROM NOTIFICATION:', offerId);

      notificationNavigationRef.navigate('Main', {
        screen: 'Client Offers',
        params: {
          openOfferId: offerId,
        },
      });
    }
  } catch (error) {
    console.log('FLUSH NOTIFICATION NAVIGATION ERROR:', error);
  } finally {
    isProcessing = false;
  }
};
