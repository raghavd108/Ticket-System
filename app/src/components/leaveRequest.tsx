import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://10.0.2.2:3000/api/leave';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Annual Leave',
  'Emergency Leave',
  'Unpaid Leave',
];

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequestItem {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus | string;
  createdAt?: string;
  reviewComment?: string;
}

interface LeaveApiError {
  message?: string;
}

interface LeaveColors {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  softPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  input: string;
}

interface LeaveRequestProps {
  employeeId?: string;
}

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTodayKey = (): string => toDateKey(new Date());

const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatDate = (value?: string): string => {
  if (!value) {
    return '—';
  }

  // Parse date-only values locally to avoid timezone date shifts.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
        12,
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusColor = (status: string, colors: LeaveColors): string => {
  switch ((status || 'pending').toLowerCase()) {
    case 'approved':
      return colors.success;
    case 'rejected':
      return colors.danger;
    case 'cancelled':
      return colors.muted;
    default:
      return colors.warning;
  }
};

const getStatusBackground = (status: string, colors: LeaveColors): string => {
  switch ((status || 'pending').toLowerCase()) {
    case 'approved':
      return colors.successSoft;
    case 'rejected':
      return colors.dangerSoft;
    case 'cancelled':
      return colors.input;
    default:
      return colors.warningSoft;
  }
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<LeaveApiError>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const LeaveRequest = ({ employeeId }: LeaveRequestProps) => {
  const { theme, isDarkMode } = useTheme();

  const colors = useMemo<LeaveColors>(
    () => ({
      background: theme.background || (isDarkMode ? '#151715' : '#F7F6F2'),
      card: theme.white || (isDarkMode ? '#202320' : '#FFFFFF'),
      text: theme.text || (isDarkMode ? '#F4F4EF' : '#242720'),
      muted: isDarkMode ? '#A7ADA4' : '#777D72',
      border: theme.border || (isDarkMode ? '#3A4039' : '#E6E5DD'),

      primary: '#A47745',
      softPrimary: isDarkMode ? '#3A3025' : '#F5EDE2',

      success: '#238653',
      successSoft: isDarkMode ? '#1D3829' : '#E7F5EC',

      danger: '#C34D4D',
      dangerSoft: isDarkMode ? '#3D2525' : '#FCECEC',

      warning: '#A66C13',
      warningSoft: isDarkMode ? '#3D3320' : '#FFF3D9',

      input: isDarkMode ? '#202320' : '#FFFFFF',
    }),
    [theme, isDarkMode],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Form state
  const [leaveType, setLeaveType] = useState<string>('Casual Leave');

  const [startDate, setStartDate] = useState<Date | null>(null);

  const [endDate, setEndDate] = useState<Date | null>(null);

  const [reason, setReason] = useState<string>('');

  // Dropdown and calendar state
  const [showLeaveTypes, setShowLeaveTypes] = useState<boolean>(false);

  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);

  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);

  // API state
  const [loading, setLoading] = useState<boolean>(false);

  const [fetching, setFetching] = useState<boolean>(true);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);

  const [errorMessage, setErrorMessage] = useState<string>('');

  // Authentication headers
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Your session has expired. Please log in again.');
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Fetch the current employee's leave history.
  const fetchLeaves = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setFetching(true);
      }

      setErrorMessage('');

      const headers = await getAuthHeaders();

      const response = await axios.get(`${API_URL}/my-leaves`, { headers });

      setLeaves(
        Array.isArray(response.data?.leaves) ? response.data.leaves : [],
      );
    } catch (error: unknown) {
      console.log(
        'FETCH LEAVES ERROR:',
        getApiErrorMessage(error, 'Unable to load your leave requests.'),
      );

      setErrorMessage(
        getApiErrorMessage(error, 'Unable to load your leave requests.'),
      );
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaves();
  }, [fetchLeaves]);

  // Reset form after a successful application.
  const resetForm = () => {
    setLeaveType('Casual Leave');
    setStartDate(null);
    setEndDate(null);
    setReason('');
    setShowLeaveTypes(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  // Native start-date picker handler.
  const handleStartDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    const selected = new Date(selectedDate);
    selected.setHours(12, 0, 0, 0);

    setStartDate(selected);

    // Clear the end date if it is now before the start date.
    setEndDate((previousEnd: Date | null) => {
      if (previousEnd && previousEnd.getTime() < selected.getTime()) {
        return null;
      }

      return previousEnd;
    });
  };

  // Native end-date picker handler.
  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    const selected = new Date(selectedDate);
    selected.setHours(12, 0, 0, 0);

    setEndDate(selected);
  };

  // Validate and submit leave application.
  const submitLeaveRequest = async () => {
    if (!employeeId) {
      Alert.alert(
        'Profile unavailable',
        'Your employee ID could not be found. Please reload your profile.',
      );
      return;
    }

    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      Alert.alert(
        'Missing information',
        'Please complete all the fields before submitting.',
      );
      return;
    }

    const start = toDateKey(startDate);
    const end = toDateKey(endDate);
    const today = getTodayKey();

    if (start < today) {
      Alert.alert('Invalid start date', 'Leave cannot start before today.');
      return;
    }

    if (end < start) {
      Alert.alert(
        'Invalid date range',
        'The end date cannot be earlier than the start date.',
      );
      return;
    }

    if (reason.trim().length < 5) {
      Alert.alert(
        'Reason too short',
        'Please provide a reason with at least 5 characters.',
      );
      return;
    }

    try {
      setLoading(true);

      const headers = await getAuthHeaders();

      // The backend obtains employeeId from the authenticated user.
      const response = await axios.post(
        `${API_URL}/apply`,
        {
          leaveType,
          startDate: start,
          endDate: end,
          reason: reason.trim(),
        },
        { headers },
      );

      Alert.alert(
        'Request submitted',
        response.data?.message ||
          'Your leave request has been submitted successfully.',
      );

      resetForm();

      await fetchLeaves();
    } catch (error: unknown) {
      console.log(
        'SUBMIT LEAVE ERROR:',
        getApiErrorMessage(error, 'Unable to submit your leave request.'),
      );

      Alert.alert(
        'Submission failed',
        getApiErrorMessage(
          error,
          'Unable to submit your leave request. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // Render each submitted leave request.
  const renderLeaveCard = (leave: LeaveRequestItem) => {
    const status = (leave.status || 'pending').toLowerCase();

    const statusColor = getStatusColor(status, colors);

    return (
      <View key={leave._id} style={styles.leaveCard}>
        <View style={styles.leaveCardTop}>
          <View style={styles.leaveIcon}>
            <Ionicons
              name="calendar-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.leaveInfo}>
            <Text style={styles.leaveTitle}>{leave.leaveType || 'Leave'}</Text>

            <Text style={styles.submittedDate}>
              Applied {formatDate(leave.createdAt)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBackground(status, colors) },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />

            <Text style={[styles.statusText, { color: statusColor }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.dateRange}>
          <View style={styles.dateBlock}>
            <Text style={styles.smallLabel}>FROM</Text>

            <Text style={styles.dateValue}>{formatDate(leave.startDate)}</Text>
          </View>

          <Ionicons name="arrow-forward" size={17} color={colors.muted} />

          <View style={styles.dateBlock}>
            <Text style={styles.smallLabel}>TO</Text>

            <Text style={styles.dateValue}>{formatDate(leave.endDate)}</Text>
          </View>
        </View>

        <View style={styles.reasonBox}>
          <Text style={styles.smallLabel}>REASON</Text>

          <Text style={styles.reasonText}>
            {leave.reason || 'No reason provided'}
          </Text>
        </View>

        {leave.reviewComment ? (
          <View style={styles.reviewBox}>
            <Text style={styles.smallLabel}>ADMIN RESPONSE</Text>

            <Text style={styles.reasonText}>{leave.reviewComment}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchLeaves(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* PAGE INTRO */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="calendar" size={27} color={colors.primary} />
          </View>

          <View style={styles.introText}>
            <Text style={styles.heading}>Request time off</Text>

            <Text style={styles.subtitle}>
              Submit a leave application and track its progress.
            </Text>
          </View>
        </View>

        {/* EMPLOYEE INFORMATION */}
        <View style={styles.employeeBadge}>
          <Ionicons
            name="person-circle-outline"
            size={22}
            color={colors.primary}
          />

          <View style={styles.employeeInfo}>
            <Text style={styles.employeeLabel}>Employee ID</Text>

            <Text
              style={styles.employeeValue}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {employeeId || 'Loading employee profile...'}
            </Text>
          </View>

          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={colors.success}
          />
        </View>

        {/* LEAVE APPLICATION FORM */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New application</Text>

          <Text style={styles.sectionSubtitle}>
            Enter the details of your requested leave.
          </Text>

          {/* LEAVE TYPE */}
          <Text style={styles.label}>Leave type</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.selectInput}
            onPress={() => setShowLeaveTypes(value => !value)}
          >
            <View style={styles.selectLeft}>
              <Ionicons
                name="briefcase-outline"
                size={19}
                color={colors.muted}
              />

              <Text style={styles.selectText}>{leaveType}</Text>
            </View>

            <Ionicons
              name={showLeaveTypes ? 'chevron-up' : 'chevron-down'}
              size={19}
              color={colors.muted}
            />
          </TouchableOpacity>

          {showLeaveTypes && (
            <View style={styles.optionsList}>
              {LEAVE_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.option,
                    type === leaveType && styles.selectedOption,
                  ]}
                  onPress={() => {
                    setLeaveType(type);
                    setShowLeaveTypes(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      type === leaveType && styles.selectedOptionText,
                    ]}
                  >
                    {type}
                  </Text>

                  {type === leaveType && (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* DATE PICKERS */}
          <View style={styles.dateRow}>
            <View style={styles.dateInputColumn}>
              <Text style={styles.label}>Start date</Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.datePickerButton}
                onPress={() => {
                  setShowEndPicker(false);
                  setShowStartPicker(true);
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.muted}
                />

                <Text
                  style={[
                    styles.datePickerText,
                    !startDate && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {startDate ? formatDate(toDateKey(startDate)) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputColumn}>
              <Text style={styles.label}>End date</Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.datePickerButton}
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker(true);
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.muted}
                />

                <Text
                  style={[
                    styles.datePickerText,
                    !endDate && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {endDate ? formatDate(toDateKey(endDate)) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.hint}>
            Select the first and last day of your leave.
          </Text>

          {/* START DATE CALENDAR */}
          {showStartPicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={
                  startDate ||
                  (endDate &&
                  endDate.getTime() >= parseDateKey(getTodayKey()).getTime()
                    ? endDate
                    : parseDateKey(getTodayKey()))
                }
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                minimumDate={parseDateKey(getTodayKey())}
                maximumDate={new Date(2100, 11, 31)}
                onChange={handleStartDateChange}
              />

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowStartPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* END DATE CALENDAR */}
          {showEndPicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={endDate || startDate || parseDateKey(getTodayKey())}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                minimumDate={startDate || parseDateKey(getTodayKey())}
                maximumDate={new Date(2100, 11, 31)}
                onChange={handleEndDateChange}
              />

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowEndPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* REASON */}
          <Text style={styles.label}>Reason for leave</Text>

          <TextInput
            style={styles.reasonInput}
            placeholder="Explain why you need leave..."
            placeholderTextColor={colors.muted}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          <Text style={styles.characterCount}>
            {reason.length}/500 characters
          </Text>

          {/* SUBMIT */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            activeOpacity={0.85}
            onPress={() => void submitLeaveRequest()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="paper-plane-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.submitButtonText}>Submit application</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* LEAVE HISTORY */}
        <View style={styles.historyHeader}>
          <View style={styles.historyTitleContainer}>
            <Text style={styles.sectionTitle}>My applications</Text>

            <Text style={styles.sectionSubtitle}>
              Track your submitted leave requests.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => void fetchLeaves(true)}
            style={styles.refreshButton}
            accessibilityLabel="Refresh leave requests"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {fetching ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />

            <Text style={styles.emptyText}>Loading applications...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={colors.muted}
            />

            <Text style={styles.emptyTitle}>Couldn't load applications</Text>

            <Text style={styles.emptyText}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void fetchLeaves()}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : leaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="file-tray-outline"
                size={29}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No applications yet</Text>

            <Text style={styles.emptyText}>
              Your submitted leave requests will appear here.
            </Text>
          </View>
        ) : (
          leaves.map(renderLeaveCard)
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: LeaveColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 17,
      paddingTop: 18,
      paddingBottom: 32,
    },
    intro: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 13,
    },
    introIcon: {
      width: 54,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.softPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introText: {
      flex: 1,
    },
    heading: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },
    employeeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 23,
    },
    employeeInfo: {
      flex: 1,
      minWidth: 0,
    },
    employeeLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 4,
    },
    employeeValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    section: {
      padding: 18,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 27,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.muted,
      marginTop: 5,
      marginBottom: 17,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      marginTop: 15,
    },
    selectInput: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    selectText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    optionsList: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      marginTop: 8,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    option: {
      minHeight: 46,
      paddingHorizontal: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    selectedOption: {
      backgroundColor: colors.softPrimary,
    },
    optionText: {
      color: colors.text,
      fontSize: 12,
    },
    selectedOptionText: {
      color: colors.primary,
      fontWeight: '700',
    },
    dateRow: {
      flexDirection: 'row',
      gap: 11,
    },
    dateInputColumn: {
      flex: 1,
      minWidth: 0,
    },
    datePickerButton: {
      minHeight: 49,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 13,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    datePickerText: {
      flex: 1,
      color: colors.text,
      fontSize: 11,
      fontWeight: '600',
    },
    placeholderText: {
      color: colors.muted,
      fontWeight: '400',
    },
    hint: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 9,
      lineHeight: 16,
    },
    pickerContainer: {
      marginTop: 13,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.input,
      overflow: 'hidden',
    },
    pickerDoneButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 11,
      backgroundColor: colors.softPrimary,
      marginTop: 7,
    },
    pickerDoneText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    reasonInput: {
      minHeight: 110,
      maxHeight: 155,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 14,
      padding: 13,
      fontSize: 13,
      lineHeight: 21,
      color: colors.text,
    },
    characterCount: {
      color: colors.muted,
      fontSize: 10,
      textAlign: 'right',
      marginTop: 7,
    },
    submitButton: {
      minHeight: 51,
      borderRadius: 15,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 21,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    disabledButton: {
      opacity: 0.55,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    historyTitleContainer: {
      flex: 1,
    },
    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.softPrimary,
    },
    leaveCard: {
      padding: 15,
      borderRadius: 19,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 13,
    },
    leaveCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    leaveIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.softPrimary,
    },
    leaveInfo: {
      flex: 1,
      minWidth: 0,
    },
    leaveTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    submittedDate: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 5,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 20,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
    },
    dateRange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 16,
      marginTop: 14,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    dateBlock: {
      flex: 1,
    },
    smallLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    dateValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    reasonBox: {
      paddingTop: 14,
    },
    reviewBox: {
      marginTop: 13,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reasonText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 19,
    },
    loadingBox: {
      alignItems: 'center',
      padding: 30,
      gap: 11,
    },
    emptyCard: {
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 28,
      borderRadius: 19,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 19,
      backgroundColor: colors.softPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 8,
      textAlign: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 7,
    },
    retryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.softPrimary,
      marginTop: 14,
    },
    retryText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    bottomSpace: {
      height: 25,
    },
  });

export default LeaveRequest;
