import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useTheme } from '../context/ThemeContext';
import { Config } from 'react-native-config';

const API_URL = `${Config.API_URL}/api/leave`;

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type LeaveFilter = 'all' | LeaveStatus;

interface Employee {
  _id: string;
  userName?: string;
  email?: string;
  designation?: string;
}

interface LeaveItem {
  _id: string;
  employeeId: string | Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  Reason?: string;
  status: LeaveStatus | string;
  createdAt?: string;
  reviewComment?: string;
}

interface ApiError {
  message?: string;
}

interface Colors {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
}

const getEmployee = (leave: LeaveItem): Employee | null => {
  if (leave.employeeId && typeof leave.employeeId === 'object') {
    return leave.employeeId;
  }

  return null;
};

const formatDate = (value?: string): string => {
  if (!value) return '—';

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
        12,
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
};

const LeaveManagement = () => {
  const { theme, isDarkMode } = useTheme();

  const colors = useMemo<Colors>(
    () => ({
      background: theme.background || (isDarkMode ? '#151715' : '#F7F6F2'),

      card: theme.white || (isDarkMode ? '#202320' : '#FFFFFF'),

      text: theme.text || (isDarkMode ? '#F4F4EF' : '#242720'),

      muted: isDarkMode ? '#A7ADA4' : '#777D72',

      border: theme.border || (isDarkMode ? '#3A4039' : '#E6E5DD'),

      primary: '#A47745',
      primarySoft: isDarkMode ? '#3A3025' : '#F5EDE2',

      success: '#238653',
      successSoft: isDarkMode ? '#1D3829' : '#E7F5EC',

      danger: '#C34D4D',
      dangerSoft: isDarkMode ? '#3D2525' : '#FCECEC',

      warning: '#A66C13',
      warningSoft: isDarkMode ? '#3D3320' : '#FFF3D9',
    }),
    [theme, isDarkMode],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [filter, setFilter] = useState<LeaveFilter>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string>('');

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Your session has expired. Please log in again.');
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Fetch every leave request visible to the authenticated admin.
  const fetchLeaves = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError('');

      const headers = await getHeaders();

      const response = await axios.get(`${API_URL}/admin/all`, { headers });

      const data = response.data?.leaves;

      setLeaves(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Unable to load leave requests.');

      setLoadError(message);

      console.log('FETCH ADMIN LEAVES ERROR:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaves();
  }, [fetchLeaves]);

  // Counts are calculated from all loaded requests, not just the
  // currently selected filter.
  const counts = useMemo(() => {
    return {
      all: leaves.length,
      pending: leaves.filter(item => item.status?.toLowerCase() === 'pending')
        .length,
      approved: leaves.filter(item => item.status?.toLowerCase() === 'approved')
        .length,
      rejected: leaves.filter(item => item.status?.toLowerCase() === 'rejected')
        .length,
    };
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    if (filter === 'all') return leaves;

    return leaves.filter(item => item.status?.toLowerCase() === filter);
  }, [leaves, filter]);

  const updateLeaveStatus = (
    leave: LeaveItem,
    status: 'approved' | 'rejected',
  ) => {
    const employee = getEmployee(leave);
    const employeeName = employee?.userName || 'this employee';

    const actionLabel = status === 'approved' ? 'Approve' : 'Reject';

    Alert.alert(
      `${actionLabel} leave request?`,
      `Are you sure you want to ${actionLabel.toLowerCase()} ${employeeName}'s ${
        leave.leaveType
      } request?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: actionLabel,
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => {
            void performStatusUpdate(leave, status);
          },
        },
      ],
    );
  };

  const performStatusUpdate = async (
    leave: LeaveItem,
    status: 'approved' | 'rejected',
  ) => {
    try {
      setProcessingId(leave._id);

      const headers = await getHeaders();

      await axios.patch(
        `${API_URL}/admin/${leave._id}/status`,
        { status },
        { headers },
      );

      // Update the UI only after the server confirms the change.
      setLeaves(current =>
        current.map(item =>
          item._id === leave._id ? { ...item, status } : item,
        ),
      );

      Alert.alert('Leave updated', `The leave request has been ${status}.`);
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        'Unable to update this leave request.',
      );

      Alert.alert('Update failed', message);

      console.log('UPDATE LEAVE STATUS ERROR:', message);

      await fetchLeaves(true);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColors = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          foreground: colors.success,
          background: colors.successSoft,
        };

      case 'rejected':
        return {
          foreground: colors.danger,
          background: colors.dangerSoft,
        };

      case 'cancelled':
        return {
          foreground: colors.muted,
          background: colors.border,
        };

      default:
        return {
          foreground: colors.warning,
          background: colors.warningSoft,
        };
    }
  };

  const renderLeaveCard = (leave: LeaveItem) => {
    const employee = getEmployee(leave);
    const status = (leave.status || 'pending').toLowerCase();
    const statusColors = getStatusColors(status);
    const isPending = status === 'pending';
    const isProcessing = processingId === leave._id;

    return (
      <View key={leave._id} style={styles.leaveCard}>
        {/* CARD HEADER */}
        <View style={styles.cardHeader}>
          <View style={styles.employeeAvatar}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
          </View>

          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>
              {employee?.userName || 'Employee'}
            </Text>

            <Text style={styles.employeeDesignation}>
              {employee?.designation || 'Team member'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors.background },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColors.foreground },
              ]}
            />

            <Text
              style={[styles.statusText, { color: statusColors.foreground }]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {employee?.email ? (
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={15} color={colors.muted} />

            <Text style={styles.emailText}>{employee.email}</Text>
          </View>
        ) : null}

        {/* LEAVE TYPE */}
        <View style={styles.leaveTypeRow}>
          <View style={styles.leaveTypeIcon}>
            <Ionicons
              name="calendar-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.leaveTypeInfo}>
            <Text style={styles.leaveTypeLabel}>LEAVE TYPE</Text>

            <Text style={styles.leaveTypeName}>
              {leave.leaveType || 'Leave'}
            </Text>
          </View>
        </View>

        {/* DATE RANGE */}
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>START DATE</Text>

            <Text style={styles.dateValue}>{formatDate(leave.startDate)}</Text>
          </View>

          <View style={styles.dateDivider}>
            <Ionicons name="arrow-forward" size={17} color={colors.muted} />
          </View>

          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>END DATE</Text>

            <Text style={styles.dateValue}>{formatDate(leave.endDate)}</Text>
          </View>
        </View>

        {/* REASON */}
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>REASON FOR LEAVE</Text>

          <Text style={styles.reasonText}>
            {leave.reason || leave.Reason || 'No reason provided'}
          </Text>
        </View>

        <View style={styles.submittedRow}>
          <Ionicons name="time-outline" size={15} color={colors.muted} />

          <Text style={styles.submittedText}>
            Applied on {formatDate(leave.createdAt)}
          </Text>
        </View>

        {/* ADMIN ACTIONS */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={processingId !== null}
              onPress={() => updateLeaveStatus(leave, 'rejected')}
              style={[
                styles.rejectButton,
                isProcessing && styles.disabledButton,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons
                  name="close-circle-outline"
                  size={19}
                  color={colors.danger}
                />
              )}

              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={processingId !== null}
              onPress={() => updateLeaveStatus(leave, 'approved')}
              style={[
                styles.approveButton,
                isProcessing && styles.disabledButton,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <View style={styles.processedInfo}>
            <Ionicons
              name={
                status === 'approved'
                  ? 'checkmark-circle-outline'
                  : 'information-circle-outline'
              }
              size={17}
              color={statusColors.foreground}
            />

            <Text
              style={[styles.processedText, { color: statusColors.foreground }]}
            >
              This request has been {status}.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchLeaves(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* PAGE HEADER */}
        <View style={styles.pageHeader}>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar" size={26} color={colors.primary} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>Leave Management</Text>

            <Text style={styles.pageSubtitle}>
              Review employee leave requests and manage approvals.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void fetchLeaves(true)}
            accessibilityLabel="Refresh leave requests"
          >
            <Ionicons name="refresh-outline" size={21} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARDS */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}
            >
              <Ionicons
                name="documents-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <Text style={styles.statNumber}>{counts.all}</Text>

            <Text style={styles.statLabel}>All requests</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: colors.warningSoft }]}
            >
              <Ionicons name="time-outline" size={19} color={colors.warning} />
            </View>

            <Text style={styles.statNumber}>{counts.pending}</Text>

            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: colors.successSoft }]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={colors.success}
              />
            </View>

            <Text style={styles.statNumber}>{counts.approved}</Text>

            <Text style={styles.statLabel}>Approved</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: colors.dangerSoft }]}
            >
              <Ionicons
                name="close-circle-outline"
                size={19}
                color={colors.danger}
              />
            </View>

            <Text style={styles.statNumber}>{counts.rejected}</Text>

            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* REQUESTS SECTION */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Employee requests</Text>

            <Text style={styles.sectionSubtitle}>
              {filteredLeaves.length}{' '}
              {filteredLeaves.length === 1 ? 'request' : 'requests'} displayed
            </Text>
          </View>
        </View>

        {/* FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {(
            [
              'all',
              'pending',
              'approved',
              'rejected',
              'cancelled',
            ] as LeaveFilter[]
          ).map(value => {
            const selected = filter === value;

            return (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                onPress={() => setFilter(value)}
                style={[
                  styles.filterButton,
                  selected && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextActive,
                  ]}
                >
                  {value === 'all'
                    ? `All (${counts.all})`
                    : `${value.charAt(0).toUpperCase()}${value.slice(1)}${
                        value === 'pending'
                          ? ` (${counts.pending})`
                          : value === 'approved'
                          ? ` (${counts.approved})`
                          : value === 'rejected'
                          ? ` (${counts.rejected})`
                          : ''
                      }`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CONTENT */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={styles.loadingText}>Loading leave requests...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={colors.danger}
              />
            </View>

            <Text style={styles.emptyTitle}>Unable to load requests</Text>

            <Text style={styles.emptySubtitle}>{loadError}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void fetchLeaves()}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={29}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No leave requests found</Text>

            <Text style={styles.emptySubtitle}>
              {filter === 'pending'
                ? 'There are no pending requests requiring your review.'
                : 'Leave requests matching this filter will appear here.'}
            </Text>
          </View>
        ) : (
          filteredLeaves.map(renderLeaveCard)
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: 16,
      paddingBottom: 32,
    },

    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
      gap: 11,
    },

    headerIcon: {
      width: 51,
      height: 51,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerText: {
      flex: 1,
    },

    pageTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
      letterSpacing: -0.4,
    },

    pageSubtitle: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },

    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 27,
    },

    statCard: {
      width: '48%',
      flexGrow: 1,
      minWidth: 130,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    statIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    statNumber: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },

    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginTop: 4,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    sectionHeaderText: {
      flex: 1,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },

    sectionSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 4,
    },

    filterList: {
      gap: 8,
      paddingBottom: 16,
    },

    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },

    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    filterText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },

    filterTextActive: {
      color: '#FFFFFF',
    },

    leaveCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 15,
      marginBottom: 13,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    employeeAvatar: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },

    employeeDetails: {
      flex: 1,
    },

    employeeName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },

    employeeDesignation: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 6,
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

    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 11,
    },

    emailText: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
    },

    leaveTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    leaveTypeIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },

    leaveTypeInfo: {
      flex: 1,
    },

    leaveTypeLabel: {
      fontSize: 10,
      color: colors.muted,
      fontWeight: '700',
      letterSpacing: 0.6,
    },

    leaveTypeName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 4,
    },

    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
    },

    dateBox: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 11,
    },

    dateLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    dateValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },

    dateDivider: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    reasonContainer: {
      marginTop: 15,
    },

    reasonLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      marginBottom: 6,
    },

    reasonText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },

    submittedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
    },

    submittedText: {
      color: colors.muted,
      fontSize: 11,
    },

    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    rejectButton: {
      flex: 1,
      minHeight: 45,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    rejectButtonText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '800',
    },

    approveButton: {
      flex: 1,
      minHeight: 45,
      borderRadius: 12,
      backgroundColor: colors.success,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    approveButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    disabledButton: {
      opacity: 0.55,
    },

    processedInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 15,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    processedText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },

    loadingContainer: {
      paddingVertical: 45,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 12,
    },

    emptyCard: {
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 30,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 13,
      textAlign: 'center',
    },

    emptySubtitle: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 7,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 15,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
    },

    retryButtonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },

    bottomSpace: {
      height: 24,
    },
  });

export default LeaveManagement;
