import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { useTheme } from '../context/ThemeContext';
import { Config } from 'react-native-config';

const BASE_URL = Config.API_URL;

type AttendanceRecord = {
  status?: string;
  inTime?: string | null;
  outTime?: string | null;
};

const AttendanceToggle = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [holiday, setHoliday] = useState(false);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { theme, isDarkMode } = useTheme();

  const colors = {
    card: theme.white,
    surface: theme.background,
    text: theme.ink,
    muted: theme.muted,
    // Keep existing style property names to avoid layout changes.
    purple: theme.primary,
    purpleSoft: theme.primarySoft,
    green: theme.green,
    greenSoft: theme.greenSoft,
    border: theme.border,
    switchOff: theme.divider,
  };

  const styles = makeStyles(colors);

  const getToken = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Please log in again.');
    }

    return token;
  };

  const getHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const loadAttendance = useCallback(async () => {
    const token = await getToken();

    const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getHeaders(token),
    });

    const user = userResponse.data?.user || userResponse.data;
    const id = user?._id || user?.id;

    if (!id || user?.role?.toLowerCase() !== 'employee') {
      throw new Error('Unable to identify the logged-in employee.');
    }

    setEmployeeId(id);

    const response = await axios.get(`${BASE_URL}/api/attendance/today`, {
      params: { employeeId: id },
      headers: getHeaders(token),
    });

    const record: AttendanceRecord | null = response.data?.attendance || null;

    setHoliday(Boolean(response.data?.isHoliday));
    setInTime(record?.inTime || '');
    setOutTime(record?.outTime || '');
    setAttendanceStatus(record?.status || '');

    setCheckedIn(
      Boolean(
        record?.inTime &&
          !record?.outTime &&
          ['present', 'late'].includes(record.status || ''),
      ),
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialise = async () => {
      try {
        await loadAttendance();
      } catch (error: any) {
        if (mounted) {
          Alert.alert(
            'Attendance',
            error?.response?.data?.message ||
              error?.message ||
              'Unable to load attendance.',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialise();

    return () => {
      mounted = false;
    };
  }, [loadAttendance]);

  const getLocation = async (): Promise<string> => {
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission',
          message: 'Your location is required to check in.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );

      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Location permission is required to check in.');
      }
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          resolve(`${latitude},${longitude}`);
        },
        () => {
          reject(new Error('Unable to get location. Please enable GPS.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
          showLocationDialog: true,
        },
      );
    });
  };

  const handleToggle = async (value: boolean) => {
    if (!employeeId || processing || holiday) {
      return;
    }

    setProcessing(true);

    try {
      const token = await getToken();

      if (value) {
        const location = await getLocation();

        await axios.post(
          `${BASE_URL}/api/attendance/check-in`,
          {
            employeeId,
            location,
          },
          {
            headers: getHeaders(token),
          },
        );
      } else {
        await axios.patch(
          `${BASE_URL}/api/attendance/check-out`,
          {
            employeeId,
          },
          {
            headers: getHeaders(token),
          },
        );
      }

      await loadAttendance();

      Alert.alert(
        'Attendance updated',
        value
          ? 'You have checked in successfully.'
          : 'You have checked out successfully.',
      );
    } catch (error: any) {
      Alert.alert(
        'Attendance failed',
        error?.response?.data?.message || error?.message || 'Please try again.',
      );

      try {
        await loadAttendance();
      } catch {
        // Keep the last known attendance state.
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (value: string) => {
    if (!value) {
      return '--:--';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }

    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const statusLabel = holiday
    ? 'Scheduled holiday'
    : checkedIn
    ? attendanceStatus === 'late'
      ? 'Checked in · Late'
      : 'Checked in'
    : outTime
    ? 'Shift completed'
    : 'Not checked in';

  const statusColor = holiday
    ? colors.muted
    : checkedIn
    ? colors.green
    : outTime
    ? colors.purple
    : colors.muted;

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color={colors.purple} size="small" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Main attendance row */}
      <View style={styles.topRow}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <View style={styles.mainInfo}>
          <Text style={styles.title}>Attendance</Text>

          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />

            <Text
              style={[styles.statusText, { color: statusColor }]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Small check-in/check-out toggle */}
        <View style={styles.switchWrap}>
          {processing ? (
            <ActivityIndicator size="small" color={colors.purple} />
          ) : (
            <Switch
              value={checkedIn}
              onValueChange={handleToggle}
              disabled={holiday || !employeeId || processing}
              trackColor={{
                false: colors.switchOff,
                true: '#BFB2FF',
              }}
              thumbColor={checkedIn ? colors.purple : '#FFFFFF'}
              ios_backgroundColor={colors.switchOff}
              accessibilityRole="switch"
              accessibilityLabel={checkedIn ? 'Check out' : 'Check in'}
            />
          )}
        </View>
      </View>

      {/* Helper text and expandable details button */}
      <View style={styles.bottomRow}>
        <Text style={styles.helperText}>
          {holiday
            ? 'Enjoy your day off.'
            : checkedIn
            ? 'You are currently on shift.'
            : outTime
            ? 'Your attendance for today is complete.'
            : 'Turn on to check in with your location.'}
        </Text>

        <TouchableOpacity
          onPress={() => setShowDetails(previous => !previous)}
          activeOpacity={0.7}
          style={styles.detailsButton}
          accessibilityRole="button"
          accessibilityLabel={
            showDetails ? 'Hide attendance details' : 'Show attendance details'
          }
          accessibilityState={{ expanded: showDetails }}
        >
          <Text style={styles.detailsButtonText}>
            {showDetails ? 'Hide  ⌃' : 'Details  ⌄'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Processing feedback */}
      {processing && (
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color={colors.purple} />
          <Text style={styles.processingText}>Updating attendance...</Text>
        </View>
      )}

      {/* Details appear only when the user taps Details */}
      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <View
              style={[styles.detailIcon, { backgroundColor: colors.greenSoft }]}
            >
              <Text style={[styles.detailIconText, { color: colors.green }]}>
                ↗
              </Text>
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>CHECK-IN</Text>
              <Text style={styles.timeText}>{formatTime(inTime)}</Text>
            </View>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.detailItem}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: colors.purpleSoft },
              ]}
            >
              <Text style={[styles.detailIconText, { color: colors.purple }]}>
                ↙
              </Text>
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>CHECK-OUT</Text>
              <Text style={styles.timeText}>{formatTime(outTime)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const makeStyles = (c: {
  card: string;
  surface: string;
  text: string;
  muted: string;
  purple: string;
  purpleSoft: string;
  green: string;
  greenSoft: string;
  border: string;
  switchOff: string;
}) =>
  StyleSheet.create({
    loadingCard: {
      width: 'auto',
      alignSelf: 'stretch',
      marginHorizontal: 0,
      marginVertical: 0,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },

    card: {
      width: 'auto',
      alignSelf: 'stretch',
      minWidth: 0,
      marginHorizontal: 0,
      marginVertical: 0,
      paddingHorizontal: 13,
      paddingVertical: 11,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
    },

    loadingText: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '500',
    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },

    iconBadge: {
      width: 34,
      height: 34,
      flexShrink: 0,
      borderRadius: 10,
      backgroundColor: c.purpleSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },

    iconText: {
      color: c.purple,
      fontSize: 19,
      fontWeight: '800',
    },

    mainInfo: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      marginRight: 5,
    },

    title: {
      color: c.text,
      fontSize: 14,
      fontWeight: '700',
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      minWidth: 0,
    },

    statusDot: {
      width: 6,
      height: 6,
      flexShrink: 0,
      borderRadius: 3,
      marginRight: 5,
    },

    statusText: {
      flexShrink: 1,
      fontSize: 10,
      fontWeight: '600',
    },

    switchWrap: {
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },

    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },

    helperText: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      color: c.muted,
      fontSize: 10,
      lineHeight: 14,
      marginRight: 6,
    },

    detailsButton: {
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: c.surface,
    },

    detailsButtonText: {
      color: c.purple,
      fontSize: 10,
      fontWeight: '700',
    },

    processingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 9,
    },

    processingText: {
      color: c.muted,
      fontSize: 10,
    },

    details: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },

    detailItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },

    detailIcon: {
      width: 28,
      height: 28,
      flexShrink: 0,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 7,
    },

    detailIconText: {
      fontSize: 15,
      fontWeight: '700',
    },

    detailInfo: {
      flex: 1,
      minWidth: 0,
    },

    detailLabel: {
      color: c.muted,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    timeText: {
      color: c.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 3,
    },

    verticalDivider: {
      width: 1,
      height: 28,
      flexShrink: 0,
      backgroundColor: c.border,
      marginHorizontal: 8,
    },
  });

export default AttendanceToggle;
