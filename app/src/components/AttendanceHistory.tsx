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
import { useTheme } from '../context/ThemeContext';
import { Config } from 'react-native-config';

const BASE_URL = Config.API_URL;

type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'leave'
  | 'holiday'
  | 'pending';

interface DailyAttendance {
  date: string;
  day: string;
  status: AttendanceStatus;
  isHoliday: boolean;
  inTime: string | null;
  outTime: string | null;
  location: string | null;
}

interface AttendanceSummary {
  totalCalendarDays: number;
  workingDays: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  holidays: number;
  pending: number;
  completedWorkingDays: number;
  attendancePercentage: number;
}

interface HistoryResponse {
  employeeId: string;
  period: {
    year: number;
    month: number | null;
    startDate: string;
    endDate: string;
  };
  summary: AttendanceSummary;
  attendance: DailyAttendance[];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const EMPTY_SUMMARY: AttendanceSummary = {
  totalCalendarDays: 0,
  workingDays: 0,
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
  holidays: 0,
  pending: 0,
  completedWorkingDays: 0,
  attendancePercentage: 0,
};

interface AttendanceHistoryProps {
  /** When supplied, show this employee's history (admin view). */
  employeeId?: string;
  employeeName?: string;
}

const AttendanceHistory = ({
  employeeId: selectedEmployeeId,
  employeeName,
}: AttendanceHistoryProps) => {
  const { isDarkMode, theme } = useTheme();

  const currentDate = new Date();

  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [history, setHistory] = useState<DailyAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showDailyAttendance, setShowDailyAttendance] = useState(false);

  const colors = {
    background: theme.background,
    card: theme.white,
    surface: isDarkMode ? '#202D3A' : '#FFFFFF',
    text: theme.ink,
    muted: theme.muted,
    border: theme.border,

    primary: theme.primary,
    primarySoft: theme.primarySoft,

    green: theme.green,
    greenSoft: theme.greenSoft,

    red: theme.coral,
    redSoft: theme.coralSoft,

    orange: theme.orange,
    orangeSoft: theme.orangeSoft,

    purple: isDarkMode ? '#C4B5FD' : '#7958D9',
    purpleSoft: isDarkMode ? '#352C50' : '#F1ECFF',

    track: isDarkMode ? '#354453' : '#EAEFF3',
  };

  const styles = useMemo(() => createStyles(colors), [isDarkMode, theme]);

  const getToken = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Session expired. Please log in again.');
    }

    return token;
  };

  const fetchHistory = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      try {
        const token = await getToken();

        // Use the selected employee ID when the admin opens this component.
        // Otherwise, preserve the existing logged-in employee flow.
        let id = selectedEmployeeId || employeeId;

        // Resolve the logged-in employee once when necessary.
        if (!id) {
          const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const user = userResponse.data?.user || userResponse.data;

          id = user?._id || user?.id || '';

          if (!id || user?.role?.toLowerCase() !== 'employee') {
            throw new Error('Unable to identify the logged-in employee.');
          }

          setEmployeeId(id);
        }

        const response = await axios.get<HistoryResponse>(
          `${BASE_URL}/api/attendance/history`,
          {
            params: {
              employeeId: id,
              month,
              year,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setHistory(response.data.attendance || []);
        setSummary(response.data.summary || EMPTY_SUMMARY);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Unable to load attendance history.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId, selectedEmployeeId, employeeName, month, year],
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const changeMonth = (nextMonth: number) => {
    if (nextMonth < 1) {
      if (year > 2000) {
        setYear(previous => previous - 1);
        setMonth(12);
      }
      return;
    }

    if (nextMonth > 12) {
      if (year < 2100) {
        setYear(previous => previous + 1);
        setMonth(1);
      }
      return;
    }

    setMonth(nextMonth);
  };

  const changeYear = (direction: number) => {
    setYear(previous => Math.min(2100, Math.max(2000, previous + direction)));
  };

  const formatTime = (value: string | null) => {
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

  const formatDate = (value: string) => {
    const date = new Date(`${value}T12:00:00`);

    return {
      dayNumber: date.getDate().toString().padStart(2, '0'),
      monthName: date.toLocaleDateString('en-IN', {
        month: 'short',
      }),
      weekday: date.toLocaleDateString('en-IN', {
        weekday: 'short',
      }),
    };
  };

  const statusConfig = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return {
          label: 'Present',
          color: colors.green,
          background: colors.greenSoft,
          symbol: '✓',
        };

      case 'late':
        return {
          label: 'Late',
          color: colors.orange,
          background: colors.orangeSoft,
          symbol: '!',
        };

      case 'absent':
        return {
          label: 'Absent',
          color: colors.red,
          background: colors.redSoft,
          symbol: '×',
        };

      case 'leave':
        return {
          label: 'On Leave',
          color: colors.purple,
          background: colors.purpleSoft,
          symbol: '↗',
        };

      case 'holiday':
        return {
          label: 'Holiday',
          color: colors.muted,
          background: colors.surface,
          symbol: '—',
        };

      default:
        return {
          label: 'Pending',
          color: colors.primary,
          background: colors.primarySoft,
          symbol: '○',
        };
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(false);
  };

  const renderSummaryCard = (
    label: string,
    value: number,
    description: string,
    color: string,
    background: string,
    icon: string,
  ) => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <Text style={[styles.summaryIconText, { color }]}>{icon}</Text>
      </View>

      <Text style={styles.summaryValue}>{value}</Text>

      <Text style={styles.summaryLabel}>{label}</Text>

      <Text style={styles.summaryDescription}>{description}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Page heading */}
      <View style={styles.pageHeading}>
        <View style={styles.headingIcon}>
          <Text style={styles.headingIconText}>▦</Text>
        </View>

        <View style={styles.headingTextContainer}>
          <Text style={styles.pageTitle}>Attendance</Text>
          <Text style={styles.pageSubtitle}>
            {employeeName
              ? `${employeeName}'s attendance overview and history`
              : 'Your attendance overview and history'}
          </Text>
        </View>
      </View>

      {/* Month and year filters */}
      <View style={styles.filterCard}>
        <View style={styles.filterHeading}>
          <View>
            <Text style={styles.sectionTitle}>Attendance history</Text>
            <Text style={styles.sectionSubtitle}>Select a month and year</Text>
          </View>

          <TouchableOpacity
            style={styles.currentMonthButton}
            onPress={() => {
              setMonth(currentDate.getMonth() + 1);
              setYear(currentDate.getFullYear());
            }}
          >
            <Text style={styles.currentMonthText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={styles.yearArrow}
            onPress={() => changeYear(-1)}
            disabled={year <= 2000}
          >
            <Text style={styles.yearArrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.yearText}>{year}</Text>

          <TouchableOpacity
            style={styles.yearArrow}
            onPress={() => changeYear(1)}
            disabled={year >= 2100}
          >
            <Text style={styles.yearArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthList}
        >
          {MONTHS.map((name, index) => {
            const selected = month === index + 1;

            return (
              <TouchableOpacity
                key={name}
                activeOpacity={0.75}
                onPress={() => setMonth(index + 1)}
                style={[styles.monthChip, selected && styles.monthChipSelected]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    selected && styles.monthChipTextSelected,
                  ]}
                >
                  {name.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.selectedPeriod}>
          <Text style={styles.selectedPeriodText}>
            Showing {MONTHS[month - 1]} {year}
          </Text>

          <Text style={styles.liveDot}>●</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading attendance...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Couldn't load attendance</Text>

          <Text style={styles.stateText}>{error}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchHistory()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Attendance analytics */}
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeading}>
              <View>
                <Text style={styles.sectionTitle}>Attendance analytics</Text>
                <Text style={styles.sectionSubtitle}>
                  Your monthly performance at a glance
                </Text>
              </View>

              <View style={styles.analyticsBadge}>
                <View style={styles.analyticsDot} />
                <Text style={styles.analyticsBadgeText}>SUMMARY</Text>
              </View>
            </View>

            <View style={styles.rateCard}>
              <View style={styles.rateTopRow}>
                <View style={styles.rateCircle}>
                  <View style={styles.rateCircleInner}>
                    <Text style={styles.rateValue}>
                      {summary.attendancePercentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.rateInfo}>
                  <Text style={styles.rateTitle}>Attendance rate</Text>

                  <Text style={styles.rateDescription}>
                    {summary.present + summary.late} days attended
                  </Text>

                  <Text style={styles.rateFootnote}>
                    Out of {summary.completedWorkingDays} completed working days
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(0, summary.attendancePercentage),
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.summaryGrid}>
              {renderSummaryCard(
                'Present',
                summary.present,
                'On-time arrivals',
                colors.green,
                colors.greenSoft,
                '✓',
              )}

              {renderSummaryCard(
                'Late',
                summary.late,
                'Late arrivals',
                colors.orange,
                colors.orangeSoft,
                '◷',
              )}

              {renderSummaryCard(
                'Absent',
                summary.absent,
                'Missed working days',
                colors.red,
                colors.redSoft,
                '×',
              )}

              {renderSummaryCard(
                'Leave',
                summary.leave,
                'Recorded leave days',
                colors.purple,
                colors.purpleSoft,
                '↗',
              )}
            </View>

            <View style={styles.footerStats}>
              <View style={styles.footerStat}>
                <Text style={styles.footerStatValue}>
                  {summary.workingDays}
                </Text>
                <Text style={styles.footerStatLabel}>Working days</Text>
              </View>

              <View style={styles.footerDivider} />

              <View style={styles.footerStat}>
                <Text style={styles.footerStatValue}>{summary.holidays}</Text>
                <Text style={styles.footerStatLabel}>Holidays</Text>
              </View>

              <View style={styles.footerDivider} />

              <View style={styles.footerStat}>
                <Text style={styles.footerStatValue}>{summary.pending}</Text>
                <Text style={styles.footerStatLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Daily attendance records */}

          <View style={styles.historyHeading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Daily attendance</Text>
              <Text style={styles.sectionSubtitle}>
                View your day-by-day attendance records
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowDailyAttendance(prev => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: colors.primarySoft,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 11,
                  fontWeight: '800',
                }}
              >
                {showDailyAttendance ? 'Hide days' : 'Show days'}
              </Text>

              <Text
                style={{
                  color: colors.primary,
                  fontSize: 15,
                  fontWeight: '800',
                  marginLeft: 6,
                }}
              >
                {showDailyAttendance ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          </View>
          {showDailyAttendance && (
            <>
              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyIconText}>▦</Text>
                  </View>

                  <Text style={styles.emptyTitle}>No attendance records</Text>

                  <Text style={styles.emptyDescription}>
                    There are no daily records for this period.
                  </Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {history.map(item => {
                    const badge = statusConfig(item.status);
                    const date = formatDate(item.date);

                    return (
                      <View key={item.date} style={styles.dayCard}>
                        <View style={styles.dayTopRow}>
                          <View style={styles.dateBlock}>
                            <View style={styles.dateIcon}>
                              <Text style={styles.dateIconText}>▦</Text>
                            </View>

                            <View>
                              <Text style={styles.dateText}>
                                {date.dayNumber} {date.monthName}
                              </Text>

                              <Text style={styles.weekdayText}>
                                {date.weekday}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: badge.background },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusSymbol,
                                { color: badge.color },
                              ]}
                            >
                              {badge.symbol}
                            </Text>

                            <Text
                              style={[
                                styles.statusLabel,
                                { color: badge.color },
                              ]}
                            >
                              {badge.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.dayDivider} />

                        <View style={styles.timesRow}>
                          <View style={styles.timeBlock}>
                            <Text style={styles.timeLabel}>CHECK-IN</Text>

                            <Text style={styles.timeValue}>
                              {formatTime(item.inTime)}
                            </Text>
                          </View>

                          <View style={styles.timeSeparator} />

                          <View style={styles.timeBlock}>
                            <Text style={styles.timeLabel}>CHECK-OUT</Text>

                            <Text style={styles.timeValue}>
                              {formatTime(item.outTime)}
                            </Text>
                          </View>
                        </View>

                        {item.location ? (
                          <View style={styles.locationRow}>
                            <Text style={styles.locationIcon}>⌖</Text>
                            <Text style={styles.locationText} numberOfLines={1}>
                              Location: {item.location}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.bottomNote}>
                All attendance times are displayed in IST.
              </Text>
            </>
          )}

          <Text style={styles.bottomNote}>
            All attendance times are displayed in IST.
          </Text>
        </>
      )}
    </ScrollView>
  );
};

const createStyles = (c: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },

    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },

    // Page heading
    pageHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },

    headingIcon: {
      width: 45,
      height: 45,
      borderRadius: 13,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    headingIconText: {
      fontSize: 25,
      fontWeight: '800',
      color: c.primary,
    },

    headingTextContainer: {
      flex: 1,
    },

    pageTitle: {
      fontSize: 25,
      fontWeight: '900',
      letterSpacing: -0.6,
      color: c.text,
    },

    pageSubtitle: {
      fontSize: 12,
      color: c.muted,
      marginTop: 3,
    },

    // Month and year filters
    filterCard: {
      backgroundColor: c.card,
      borderRadius: 17,
      padding: 15,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.border,
    },

    filterHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },

    sectionSubtitle: {
      fontSize: 11,
      lineHeight: 17,
      color: c.muted,
      marginTop: 4,
    },

    currentMonthButton: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.border,
    },

    currentMonthText: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '800',
    },

    yearSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginTop: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },

    yearArrow: {
      width: 38,
      height: 35,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },

    yearArrowText: {
      fontSize: 25,
      color: c.text,
      lineHeight: 29,
    },

    yearText: {
      minWidth: 70,
      textAlign: 'center',
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
    },

    monthList: {
      paddingTop: 14,
      paddingBottom: 5,
      gap: 7,
    },

    monthChip: {
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor: c.surface,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.border,
    },

    monthChipSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },

    monthChipText: {
      color: c.muted,
      fontSize: 11,
      fontWeight: '700',
    },

    monthChipTextSelected: {
      color: '#FFFFFF',
    },

    selectedPeriod: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },

    selectedPeriodText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.muted,
    },

    liveDot: {
      color: c.green,
      fontSize: 11,
    },

    // Attendance analytics
    analyticsCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 24,
    },

    analyticsHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    analyticsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: c.greenSoft,
    },

    analyticsDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.green,
    },

    analyticsBadgeText: {
      color: c.green,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    rateCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 11,
    },

    rateTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    rateCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 7,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    rateCircleInner: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    rateValue: {
      fontSize: 23,
      fontWeight: '900',
      color: c.text,
    },

    rateInfo: {
      flex: 1,
    },

    rateTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
    },

    rateDescription: {
      color: c.muted,
      fontSize: 11,
      marginTop: 6,
    },

    rateFootnote: {
      color: c.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },

    progressTrack: {
      height: 5,
      backgroundColor: c.track,
      borderRadius: 5,
      overflow: 'hidden',
      marginTop: 13,
    },

    progressFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: c.primary,
    },

    // Present, late, absent and leave cards
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },

    summaryCard: {
      width: '48%',
      flexGrow: 1,
      flexBasis: '40%',
      minWidth: 0,
      padding: 12,
      borderRadius: 13,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },

    summaryIcon: {
      width: 31,
      height: 31,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },

    summaryIconText: {
      fontSize: 17,
      fontWeight: '900',
    },

    summaryValue: {
      color: c.text,
      fontSize: 25,
      fontWeight: '900',
    },

    summaryLabel: {
      color: c.text,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 2,
    },

    summaryDescription: {
      color: c.muted,
      fontSize: 10,
      marginTop: 4,
    },

    // Working days, holidays and pending
    footerStats: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 14,
      paddingTop: 13,
    },

    footerStat: {
      flex: 1,
      alignItems: 'center',
    },

    footerStatValue: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },

    footerStatLabel: {
      fontSize: 10,
      color: c.muted,
      marginTop: 4,
    },

    footerDivider: {
      width: 1,
      height: 30,
      backgroundColor: c.border,
    },

    // Daily attendance heading
    historyHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    countBadge: {
      backgroundColor: c.primarySoft,
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    countBadgeText: {
      color: c.primary,
      fontSize: 10,
      fontWeight: '800',
    },

    historyList: {
      gap: 11,
    },

    // Individual attendance record
    dayCard: {
      backgroundColor: c.card,
      borderRadius: 15,
      padding: 13,
      borderWidth: 1,
      borderColor: c.border,
    },

    dayTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    dateBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },

    dateIcon: {
      width: 39,
      height: 39,
      borderRadius: 11,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    dateIconText: {
      fontSize: 21,
      fontWeight: '800',
      color: c.primary,
    },

    dateText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
    },

    weekdayText: {
      color: c.muted,
      fontSize: 11,
      marginTop: 3,
    },

    // Attendance status badge
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      marginLeft: 8,
    },

    statusSymbol: {
      fontSize: 12,
      fontWeight: '900',
      marginRight: 5,
    },

    statusLabel: {
      fontSize: 10,
      fontWeight: '800',
    },

    dayDivider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 12,
    },

    // Check-in and check-out times
    timesRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    timeBlock: {
      flex: 1,
    },

    timeLabel: {
      fontSize: 9,
      letterSpacing: 0.7,
      fontWeight: '800',
      color: c.muted,
    },

    timeValue: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 5,
    },

    timeSeparator: {
      width: 1,
      height: 33,
      backgroundColor: c.border,
      marginHorizontal: 12,
    },

    // Location information
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },

    locationIcon: {
      fontSize: 16,
      color: c.primary,
      marginRight: 6,
    },

    locationText: {
      flex: 1,
      color: c.muted,
      fontSize: 10,
    },

    // Empty attendance history
    emptyCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 34,
    },

    emptyIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },

    emptyIconText: {
      fontSize: 27,
      color: c.primary,
    },

    emptyTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
    },

    emptyDescription: {
      color: c.muted,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 7,
    },

    // Loading and error states
    centerState: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 15,
    },

    stateText: {
      color: c.muted,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 10,
    },

    errorTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
    },

    retryButton: {
      marginTop: 15,
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },

    retryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    bottomNote: {
      textAlign: 'center',
      fontSize: 10,
      color: c.muted,
      marginTop: 18,
    },
  });

export default AttendanceHistory;
