import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Config } from 'react-native-config';
import { useTheme } from '../context/ThemeContext';

type Mode = 'daily' | 'monthly';

type DailyRow = {
  employeeId: string;
  userName: string;
  designation: string | null;
  status: string;
  inTime: string | null;
  outTime: string | null;
  location: string | null;
};

type DailyReport = {
  date: string;
  isHoliday: boolean;
  summary: Record<string, number>;
  employees: DailyRow[];
};

type MonthlyRow = {
  employeeId: string;
  userName: string;
  designation: string | null;
  summary: {
    workingDays: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    completedWorkingDays: number;
    attendancePercentage: number;
  };
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  leave: 'On leave',
  holiday: 'Holiday',
  pending: 'Not marked',
  'not-joined': 'Not joined',
};

// Calendar dates are IST; build them without UTC conversion.
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : '—';

// Admin-only: daily and monthly attendance for every employee.
const AttendanceReport = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [mode, setMode] = useState<Mode>('daily');
  const [day, setDay] = useState(() => new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const statusColor = (status: string) => {
    switch (status) {
      case 'present':
        return theme.green;
      case 'late':
        return theme.orange;
      case 'absent':
        return theme.danger;
      case 'leave':
        return theme.blue;
      default:
        return theme.muted;
    }
  };

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError('');

        const token = await AsyncStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (mode === 'daily') {
          const response = await axios.get(
            `${Config.API_URL}/api/attendance/report/daily`,
            { headers, params: { date: toDateKey(day) } },
          );
          setDaily(response.data);
        } else {
          const response = await axios.get(
            `${Config.API_URL}/api/attendance/report/monthly`,
            {
              headers,
              params: {
                month: month.getMonth() + 1,
                year: month.getFullYear(),
              },
            },
          );
          setMonthly(response.data?.employees ?? []);
        }
      } catch (loadError: any) {
        console.log('ATTENDANCE REPORT ERROR:', loadError);
        setError(
          loadError?.response?.data?.message ??
            'Unable to load the attendance report.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mode, day, month],
  );

  useEffect(() => {
    load();
  }, [load]);

  const isToday = toDateKey(day) === toDateKey(new Date());
  const isCurrentMonth =
    month.getFullYear() === new Date().getFullYear() &&
    month.getMonth() === new Date().getMonth();

  const shift = (direction: -1 | 1) => {
    if (mode === 'daily') {
      const next = new Date(day);
      next.setDate(next.getDate() + direction);
      setDay(next);
    } else {
      setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
    }
  };

  const periodLabel =
    mode === 'daily'
      ? day.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const canGoForward = mode === 'daily' ? !isToday : !isCurrentMonth;

  return (
    <View style={styles.container}>
      {/* MODE SWITCH */}
      <View style={styles.segment}>
        {(['daily', 'monthly'] as Mode[]).map(item => (
          <TouchableOpacity
            key={item}
            onPress={() => setMode(item)}
            style={[styles.segmentItem, mode === item && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === item }}
          >
            <Text
              style={[
                styles.segmentText,
                mode === item && styles.segmentTextActive,
              ]}
            >
              {item === 'daily' ? 'Daily' : 'Monthly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PERIOD NAVIGATION */}
      <View style={styles.periodRow}>
        <TouchableOpacity
          onPress={() => shift(-1)}
          style={styles.navButton}
          accessibilityLabel="Previous period"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.periodText}>{periodLabel}</Text>
        <TouchableOpacity
          onPress={() => shift(1)}
          disabled={!canGoForward}
          style={[styles.navButton, !canGoForward && styles.disabled]}
          accessibilityLabel="Next period"
        >
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
            />
          }
        >
          {mode === 'daily' && daily && (
            <>
              {daily.isHoliday && (
                <Text style={styles.holiday}>Company holiday</Text>
              )}

              <View style={styles.summaryRow}>
                {['present', 'late', 'absent', 'leave', 'pending'].map(key => (
                  <View key={key} style={styles.summaryItem}>
                    <Text
                      style={[styles.summaryValue, { color: statusColor(key) }]}
                    >
                      {daily.summary?.[key] ?? 0}
                    </Text>
                    <Text style={styles.summaryLabel}>{STATUS_LABELS[key]}</Text>
                  </View>
                ))}
              </View>

              {daily.employees.length === 0 && (
                <Text style={styles.empty}>No employees found.</Text>
              )}

              {daily.employees.map(row => (
                <View key={row.employeeId} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.userName}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {row.designation || 'Employee'} · In{' '}
                      {formatTime(row.inTime)} · Out {formatTime(row.outTime)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { borderColor: statusColor(row.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: statusColor(row.status) },
                      ]}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {mode === 'monthly' && (
            <>
              {monthly.length === 0 && (
                <Text style={styles.empty}>No employees found.</Text>
              )}

              {monthly.map(row => (
                <View key={row.employeeId} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.userName}
                    </Text>
                    <Text style={styles.meta}>
                      P {row.summary.present} · L {row.summary.late} · A{' '}
                      {row.summary.absent} · Leave {row.summary.leave} · of{' '}
                      {row.summary.workingDays} working days
                    </Text>
                  </View>
                  {/* No completed working day yet (e.g. joined today). */}
                  <Text style={styles.percent}>
                    {row.summary.completedWorkingDays > 0
                      ? `${row.summary.attendancePercentage}%`
                      : '—'}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    segment: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 12,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
    },
    segmentItem: {
      flex: 1,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
    },
    segmentActive: {
      backgroundColor: theme.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    segmentTextActive: {
      color: theme.everWhite,
    },
    periodRow: {
      marginTop: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.white,
    },
    disabled: {
      opacity: 0.35,
    },
    periodText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    loader: {
      marginTop: 30,
    },
    centered: {
      marginTop: 30,
      alignItems: 'center',
    },
    errorText: {
      color: theme.danger,
      textAlign: 'center',
      marginBottom: 10,
    },
    retryText: {
      color: theme.primary,
      fontWeight: '700',
    },
    holiday: {
      textAlign: 'center',
      color: theme.muted,
      marginBottom: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
      marginBottom: 12,
      borderRadius: 14,
      backgroundColor: theme.white,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '800',
    },
    summaryLabel: {
      marginTop: 2,
      fontSize: 11,
      color: theme.muted,
      textAlign: 'center',
    },
    empty: {
      textAlign: 'center',
      color: theme.muted,
      marginTop: 24,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: theme.white,
    },
    rowMain: {
      flex: 1,
      paddingRight: 10,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    meta: {
      marginTop: 3,
      fontSize: 12,
      color: theme.muted,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    percent: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.primary,
    },
  });

export default AttendanceReport;
