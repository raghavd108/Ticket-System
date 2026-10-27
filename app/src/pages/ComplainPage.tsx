import React, { useEffect, useState, useMemo } from 'react';
import createStyles from '../style/complainStyle';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import AttendanceToggle from '../components/attendance';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFilter } from '../hooks/useFilter';
import Filter from '../components/filter';
import { Config } from 'react-native-config';

interface User {
  id: string;
  userName: string;
  email: string;
  mobileNumber?: string | null;
  role: string;
  organisation: {
    _id: string;
    orgType: string;
    name: string;
  };
}

interface Complaint {
  _id: string;
  module: string;
  problem: string;

  image: {
    url: string;
  }[];

  status: string;
  assignedEmployeeId?: string | null;
  assignedEmployee?: {
    _id?: string;
    id?: string;
    userName: string;
    email?: string;
    mobileNumber?: string | null;
    designation?: string | null;
  } | null;

  organisation: {
    _id: string;
    orgType: string;
    name: string;
  };

  createdAt: string;

  user?: {
    _id: string;
    userName: string;
    email: string;
  };
}

const normalizeComplaintStatus = (status: unknown): string => {
  if (typeof status !== 'string') return 'pending';
  return status === 'in_progress' ? 'in-progress' : status;
};

const normalizeComplaint = (complaint: any): Complaint => ({
  ...complaint,
  _id: String(complaint?._id ?? complaint?.id ?? ''),
  status: normalizeComplaintStatus(complaint?.status),
  image: Array.isArray(complaint?.image)
    ? complaint.image
    : Array.isArray(complaint?.images)
    ? complaint.images.map((image: any) => ({ ...image, url: image.url ?? '' }))
    : [],
  assignedEmployee: complaint?.assignedEmployee
    ? {
        ...complaint.assignedEmployee,
        _id: String(
          complaint.assignedEmployee._id ?? complaint.assignedEmployee.id ?? '',
        ),
      }
    : null,
});

const ComplainPage = () => {
  const navigation = useNavigation<any>();

  const { theme, isDarkMode } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [openFilter, setOpenFilter] = useState(false);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [employees, setEmployees] = useState<
    Array<{
      id: string;
      userName: string;
      email?: string;
      designation?: string | null;
    }>
  >([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState(false);
  const [activeTicketDropdown, setActiveTicketDropdown] = useState<
    'status' | 'employee' | null
  >(null);

  const {
    softwareFilter,
    setSoftwareFilter,
    organisationFilter,
    setorganisationFilter,
    orgTypeFilter,
    setOrgTypeFilter,
    statusFilter,
    setStatusFilter,
    sortFilter,
    setSortFilter,
    displayComplain,
    getOrganisations,
  } = useFilter(complaints);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'client' && user?.organisation) {
      setorganisationFilter(user.organisation?.name);
    }
    if (user?.role?.toLowerCase() === 'admin') {
      getEmployees();
    }
  }, [user]);

  /* 
     USER
   */

  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setMessage('Authentication token not found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${Config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const loggedInUser = response.data.user;

      setUser(loggedInUser);

      await getComplaints();
    } catch (error) {
      console.log('GET USER ERROR:', error);
      setMessage('Unable to get user information');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees available to the admin for ticket assignment.
  const getEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${Config.API_URL}/api/auth/getUser`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = response.data;
      const rawUsers = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload?.user)
        ? payload.user
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

      const adminOrgId = String(
        user?.organisation?._id ?? (user as any)?.organisationId ?? '',
      );
      const employeeList = rawUsers
        .filter(
          (item: any) => String(item?.role ?? '').toLowerCase() === 'employee',
        )
        .filter((item: any) => {
          const orgId = String(
            item?.organisationId ??
              item?.organisation?._id ??
              item?.organisation?.id ??
              '',
          );
          return !adminOrgId || !orgId || orgId === adminOrgId;
        })
        .map((item: any) => ({
          id: String(item?.id ?? item?._id ?? ''),
          userName: String(item?.userName ?? item?.name ?? 'Unnamed employee'),
          email: item?.email,
          designation: item?.designation,
        }))
        .filter((item: any) => item.id);

      setEmployees(employeeList);
    } catch (error) {
      console.log('GET EMPLOYEES ERROR:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const assignTicket = async () => {
    if (!selectedComplaint?._id) return;
    if (!selectedEmployeeId) {
      Alert.alert(
        'Select employee',
        'Please select an employee to assign this ticket.',
      );
      return;
    }

    try {
      setAssigningTicket(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        return;
      }

      const response = await axios.patch(
        `${Config.API_URL}/api/complain/${selectedComplaint._id}/assign`,
        { employeeId: selectedEmployeeId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updated = response.data?.complaint;
      if (updated) {
        const normalized = normalizeComplaint(updated);
        setComplaints(prev =>
          prev.map(item =>
            item._id === normalized._id ? { ...item, ...normalized } : item,
          ),
        );
        setSelectedComplaint(normalized);
      } else {
        await getComplaints();
      }

      Alert.alert(
        'Ticket assigned',
        'The ticket has been assigned successfully.',
      );
    } catch (error: any) {
      console.log('ASSIGN TICKET ERROR:', error?.response?.data ?? error);
      Alert.alert(
        'Assignment failed',
        error?.response?.data?.message ??
          'Unable to assign this ticket. Check that the assignment route is registered in your backend.',
      );
    } finally {
      setAssigningTicket(false);
    }
  };

  /* 
     COMPLAINTS
   */

  const getComplaints = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await axios.get(
        `${Config.API_URL}/api/complain/getcomplain`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const responseComplaints =
        response.data?.complains ?? response.data?.complaint ?? [];
      setComplaints(
        Array.isArray(responseComplaints)
          ? responseComplaints.map(normalizeComplaint)
          : [],
      );
      setMessage('');
    } catch (error) {
      console.log('GET COMPLAINTS ERROR:', error);
      setMessage('Unable to fetch complaints');
    }
  };

  /* 
     UPDATE STATUS
   */

  const updateStatus = async (complaintId: string, status: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const normalizedStatus = normalizeComplaintStatus(status);

      await axios.patch(
        `${Config.API_URL}/api/complain/update-status/${complaintId}`,
        {
          status: normalizedStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setComplaints(prev =>
        prev.map(complaint =>
          complaint._id === complaintId
            ? {
                ...complaint,
                status: normalizedStatus,
              }
            : complaint,
        ),
      );

      setSelectedComplaint(prev =>
        prev && prev._id === complaintId
          ? {
              ...prev,
              status: normalizedStatus,
            }
          : prev,
      );

      Alert.alert('Updated', 'Ticket status has been updated.');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  /* 
     REFRESH
   */

  const onRefresh = async () => {
    setRefreshing(true);
    await getComplaints();
    setRefreshing(false);
  };

  /* 
     DETAILS
   */

  const openComplaintDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setSelectedEmployeeId(
      complaint.assignedEmployeeId ?? complaint.assignedEmployee?._id ?? '',
    );
  };

  const closeComplaintDetails = () => {
    setSelectedComplaint(null);
  };

  /* 
     ATTACHMENTS
   */

  const openAttachments = (complaint: Complaint) => {
    if (!complaint.image || complaint.image.length === 0) {
      Alert.alert('Attachments', 'No attachments available.');
      return;
    }

    const images = complaint.image.map(item => item.url);

    setAttachmentImages(images);
    setAttachmentModalVisible(true);
  };

  const closeAttachments = () => {
    setAttachmentModalVisible(false);
    setAttachmentImages([]);
  };

  const openImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

  /* 
     FILTER
   */

  const handleFilter = () => {
    setOpenFilter(true);
  };

  const handleNotification = () => {
    navigation.navigate('Notification');
  };
  const handleCompanyCalendar = () => {
    navigation.navigate('CompanyCalendar', { user });
  };
  /* 
     STATUS
   */

  const getStatusLabel = (status: string) => {
    switch (normalizeComplaintStatus(status)?.toLowerCase()) {
      case 'pending':
        return 'Pending';

      case 'in-progress':
        return 'In Progress';

      case 'resolved':
        return 'Resolved';

      default:
        return status || 'Unknown';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (normalizeComplaintStatus(status)?.toLowerCase()) {
      case 'pending':
        return styles.statusPending;

      case 'in-progress':
        return styles.statusProgress;

      case 'resolved':
        return styles.statusResolved;

      default:
        return styles.statusUnknown;
    }
  };

  const getStatusDotStyle = (status: string) => {
    switch (normalizeComplaintStatus(status)?.toLowerCase()) {
      case 'pending':
        return styles.statusDotPending;

      case 'in-progress':
        return styles.statusDotProgress;

      case 'resolved':
        return styles.statusDotResolved;

      default:
        return styles.statusDotUnknown;
    }
  };

  /* 
     MODULE ICON
   */

  const getModuleIcon = (module: string) => {
    const value = module?.toLowerCase() || '';

    if (value.includes('opd')) {
      return '✚';
    }

    if (value.includes('ipd')) {
      return '▰';
    }

    if (value.includes('lab')) {
      return '⌬';
    }

    if (value.includes('billing')) {
      return '▤';
    }

    if (value.includes('user')) {
      return '●';
    }

    return '▦';
  };

  const getModuleStyle = (module: string) => {
    const value = module?.toLowerCase() || '';

    if (value.includes('opd')) {
      return styles.moduleIconPurple;
    }

    if (value.includes('ipd')) {
      return styles.moduleIconCoral;
    }

    if (value.includes('lab')) {
      return styles.moduleIconGreen;
    }

    if (value.includes('billing')) {
      return styles.moduleIconBlue;
    }

    return styles.moduleIconPurple;
  };

  /* 
     DATE
   */

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /* 
     STATISTICS
   */

  const totalTickets = displayComplain.length;

  const pendingTickets = displayComplain.filter(
    item => item.status?.toLowerCase() === 'pending',
  ).length;

  const progressTickets = displayComplain.filter(
    item =>
      normalizeComplaintStatus(item.status)?.toLowerCase() === 'in-progress',
  ).length;

  const resolvedTickets = displayComplain.filter(
    item => item.status?.toLowerCase() === 'resolved',
  ).length;

  const resolvedPercent =
    totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  const pendingPercent =
    totalTickets > 0 ? (pendingTickets / totalTickets) * 100 : 0;
  const progressPercent =
    totalTickets > 0 ? (progressTickets / totalTickets) * 100 : 0;
  const resolvedBarPercent =
    totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isEmployee = user?.role?.toLowerCase() === 'employee';

  /* 
     LOADING
   */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Text style={styles.loadingIconText}>✓</Text>
        </View>

        <Text style={styles.loadingTitle}>Loading your tickets</Text>

        <Text style={styles.loadingText}>Getting everything ready...</Text>

        <ActivityIndicator
          size="small"
          color={theme.primary}
          style={{ marginTop: 18 }}
        />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          {
            flex: 1,
            backgroundColor: isDarkMode ? theme.background : '#F0E7DA',
          },
        ]}
        edges={['top', 'left', 'right']}
      >
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={
            isAdmin ? styles.adminContent : styles.clientContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* HEADER */}
          <View
            style={[
              styles.headerBackground,
              {
                backgroundColor: isDarkMode ? theme.background : '#F0E7DA',
              },
            ]}
          >
            <View style={styles.pageHeader}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.eyebrow}>
                    {isAdmin || isEmployee ? 'SUPPORT CENTER' : 'MY SUPPORT'}
                  </Text>

                  <Text style={styles.title}>
                    {isAdmin || isEmployee ? 'Tickets' : 'My Tickets'}
                  </Text>

                  <Text style={styles.subtitle}>
                    {isAdmin || isEmployee
                      ? `Manage support requests from ${
                          user?.organisation?.name || 'your organisations'
                        }`
                      : 'Track and manage your submitted support requests'}
                  </Text>
                </View>

                {(isAdmin || isEmployee) && (
                  <TouchableOpacity
                    style={styles.notificationButton}
                    activeOpacity={0.8}
                    onPress={handleCompanyCalendar}
                    accessibilityLabel="Open company calendar"
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={21}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.notificationButton}
                  activeOpacity={0.75}
                  onPress={handleNotification}
                  accessibilityLabel="Open notifications"
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color={theme.text}
                  />
                  <View style={styles.notificationDot} />
                </TouchableOpacity>
              </View>

              {isEmployee && (
                <View style={styles.attendanceContainer}>
                  <AttendanceToggle />
                </View>
              )}
            </View>
          </View>

          {/* =================================================
              STATS
          ================================================= */}

          <View
            style={{
              width: '100%',
              backgroundColor: theme.white || '#FFFFFF',
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.border || '#E9E5EF',
              marginTop: 12,
              marginBottom: 10,
              shadowColor: '#17131D',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.045,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    color: theme.muted || '#8A8494',
                    marginBottom: 5,
                  }}
                >
                  TICKET OVERVIEW
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    lineHeight: 24,
                    fontWeight: '800',
                    color: theme.ink || theme.text || '#211C2A',
                  }}
                >
                  Resolution progress
                </Text>
              </View>
              <View
                style={{
                  width: 43,
                  height: 43,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.primarySoft || '#F0EAFE',
                }}
              >
                <Ionicons
                  name="analytics-outline"
                  size={22}
                  color={theme.primary}
                />
              </View>
            </View>

            {/* TICKET STATUS GRAPH */}
            <View style={{ marginTop: 24, marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 18,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: theme.ink || theme.text || '#211C2A',
                    }}
                  >
                    Ticket breakdown
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: theme.muted || '#8A8494',
                      marginTop: 4,
                    }}
                  >
                    Tickets by current status
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: theme.primarySoft || '#F0EAFE',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: theme.primary,
                    }}
                  >
                    {totalTickets} total
                  </Text>
                </View>
              </View>

              <View
                accessibilityRole="image"
                accessibilityLabel={`Ticket breakdown chart. ${pendingTickets} pending, ${progressTickets} in progress, ${resolvedTickets} resolved.`}
                style={{
                  height: 150,
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  paddingTop: 8,
                }}
              >
                {[
                  {
                    label: 'Pending',
                    count: pendingTickets,
                    color: theme.orange || '#D99024',
                  },
                  {
                    label: 'In progress',
                    count: progressTickets,
                    color: theme.blue || '#6551C9',
                  },
                  {
                    label: 'Resolved',
                    count: resolvedTickets,
                    color: theme.green || '#23845D',
                  },
                ].map(item => {
                  const maxCount = Math.max(
                    pendingTickets,
                    progressTickets,
                    resolvedTickets,
                    1,
                  );
                  const barHeight =
                    item.count > 0
                      ? Math.max((item.count / maxCount) * 92, 8)
                      : 4;

                  return (
                    <View
                      key={item.label}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: theme.ink || theme.text || '#211C2A',
                          marginBottom: 8,
                        }}
                      >
                        {item.count}
                      </Text>

                      <View
                        style={{
                          width: 34,
                          height: barHeight,
                          backgroundColor: item.color,
                          borderRadius: 10,
                          opacity: item.count === 0 ? 0.35 : 1,
                        }}
                      />

                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: theme.muted || '#8A8494',
                          marginTop: 9,
                          textAlign: 'center',
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.divider || theme.border || '#E9E5EF',
                marginTop: 22,
                marginBottom: 17,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
              <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 5 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: theme.orange || '#D99024',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: theme.muted || '#8A8494',
                      flexShrink: 1,
                    }}
                  >
                    Pending
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 23,
                    lineHeight: 29,
                    fontWeight: '800',
                    color: theme.ink || theme.text || '#211C2A',
                  }}
                >
                  {pendingTickets}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    lineHeight: 14,
                    color: theme.muted || '#8A8494',
                    marginTop: 3,
                  }}
                >
                  Awaiting action
                </Text>
              </View>

              <View
                style={{
                  width: 1,
                  backgroundColor: theme.divider || theme.border || '#E9E5EF',
                  marginHorizontal: 5,
                }}
              />

              <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 5 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: theme.blue || '#6551C9',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: theme.muted || '#8A8494',
                      flexShrink: 1,
                    }}
                  >
                    In progress
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 23,
                    lineHeight: 29,
                    fontWeight: '800',
                    color: theme.ink || theme.text || '#211C2A',
                  }}
                >
                  {progressTickets}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    lineHeight: 14,
                    color: theme.muted || '#8A8494',
                    marginTop: 3,
                  }}
                >
                  Being handled
                </Text>
              </View>

              <View
                style={{
                  width: 1,
                  backgroundColor: theme.divider || theme.border || '#E9E5EF',
                  marginHorizontal: 5,
                }}
              />

              <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 5 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: theme.green || '#23845D',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: theme.muted || '#8A8494',
                      flexShrink: 1,
                    }}
                  >
                    Resolved
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 23,
                    lineHeight: 29,
                    fontWeight: '800',
                    color: theme.ink || theme.text || '#211C2A',
                  }}
                >
                  {resolvedTickets}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    lineHeight: 14,
                    color: theme.muted || '#8A8494',
                    marginTop: 3,
                  }}
                >
                  Successfully closed
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              MESSAGE
          ================================================= */}

          {message ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIconCircle}>
                <Text style={styles.errorIcon}>!</Text>
              </View>

              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          {/* =================================================
              SECTION HEADER
          ================================================= */}

          {/* SECTION HEADER */}
          {displayComplain.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Recent Tickets</Text>
                <Text style={styles.sectionSubtitle}>
                  Tap a ticket to see full details
                </Text>
              </View>

              <View style={styles.sectionHeaderActions}>
                <View style={styles.ticketCountBadge}>
                  <Text style={styles.ticketCountText}>
                    {displayComplain.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.filterButton}
                  activeOpacity={0.85}
                  onPress={handleFilter}
                  accessibilityLabel="Filter tickets"
                >
                  <Ionicons
                    name="options-outline"
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =================================================
              EMPTY
          ================================================= */}

          {displayComplain.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>✓</Text>
              </View>

              <Text style={styles.emptyTitle}>No tickets found</Text>

              <Text style={styles.emptyText}>
                {isAdmin
                  ? 'There are no tickets matching your current filters.'
                  : "You haven't submitted any support requests yet."}
              </Text>
            </View>
          ) : (
            <View style={styles.ticketList}>
              {displayComplain.map((complaint, index) => (
                <TouchableOpacity
                  key={complaint._id}
                  activeOpacity={0.9}
                  style={styles.ticketCard}
                  onPress={() => openComplaintDetails(complaint)}
                >
                  {/* CARD TOP */}

                  <View style={styles.ticketTopRow}>
                    <View style={styles.ticketNumber}>
                      <Text style={styles.ticketNumberText}>
                        #{String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        getStatusStyle(complaint.status),
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          getStatusDotStyle(complaint.status),
                        ]}
                      />

                      <Text style={styles.statusBadgeText}>
                        {getStatusLabel(complaint.status)}
                      </Text>
                    </View>
                  </View>

                  {/* MODULE */}

                  <View style={styles.ticketTitleRow}>
                    <View
                      style={[
                        styles.moduleIcon,
                        getModuleStyle(complaint.module),
                      ]}
                    >
                      <Text style={styles.moduleIconText}>
                        {getModuleIcon(complaint.module)}
                      </Text>
                    </View>

                    <View style={styles.moduleTextContainer}>
                      <Text style={styles.ticketModule} numberOfLines={1}>
                        {complaint.module}
                      </Text>

                      <View style={styles.dateRow}>
                        <Text style={styles.ticketDate}>
                          {formatDate(complaint.createdAt)}
                        </Text>

                        <View style={styles.dateDot} />

                        <Text style={styles.ticketDate}>
                          {formatTime(complaint.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.chevronContainer}>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </View>

                  {/* PROBLEM */}

                  <Text style={styles.ticketProblem} numberOfLines={2}>
                    {complaint.problem}
                  </Text>

                  {/* META */}

                  <View style={styles.ticketMetaRow}>
                    {isAdmin && (
                      <>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaIcon}>●</Text>

                          <Text style={styles.metaText} numberOfLines={1}>
                            {complaint.user?.userName || 'Unknown user'}
                          </Text>
                        </View>

                        <View style={styles.metaDivider} />
                      </>
                    )}

                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>⌂</Text>

                      <Text style={styles.metaText} numberOfLines={1}>
                        {complaint.organisation?.name || 'Unknown organisation'}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />

                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>⌂</Text>

                      <Text style={styles.metaText} numberOfLines={1}>
                        {complaint.organisation?.orgType || 'Unknown Type'}
                      </Text>
                    </View>

                    {complaint.image && complaint.image.length > 0 && (
                      <>
                        <View style={styles.metaDivider} />

                        <View style={styles.attachmentMiniBadge}>
                          <Text style={styles.attachmentMiniIcon}>▧</Text>

                          <Text style={styles.attachmentMiniText}>
                            {complaint.image.length}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* 
          FILTER MODAL
       */}

      <Modal
        visible={openFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenFilter(false)}
      >
        <View style={styles.filterOverlay}>
          <View style={styles.filterContainer}>
            <View style={styles.modalHandle} />

            <Filter
              role={user?.role}
              clientorganisation={user?.organisation?.name}
              organisations={getOrganisations()}
              softwareFilter={softwareFilter}
              setSoftwareFilter={setSoftwareFilter}
              organisationFilter={organisationFilter}
              setorganisationFilter={setorganisationFilter}
              orgTypeFilter={orgTypeFilter}
              setOrgTypeFilter={setOrgTypeFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortFilter={sortFilter}
              setSortFilter={setSortFilter}
              onClose={() => setOpenFilter(false)}
              onApply={() => setOpenFilter(false)}
            />
          </View>
        </View>
      </Modal>

      {/* 
          DETAILS MODAL
       */}

      <Modal
        visible={selectedComplaint !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeComplaintDetails}
      >
        <View style={styles.premiumOverlay}>
          <View style={styles.premiumSheet}>
            {/* COMPACT TOP BAR */}
            <View style={styles.premiumTop}>
              <View style={styles.premiumGrabber} />
              <View style={styles.premiumTopRow}>
                <View>
                  <Text style={styles.premiumOverline}>SUPPORT DESK</Text>
                  <Text style={styles.premiumTopTitle}>Ticket overview</Text>
                </View>

                <TouchableOpacity
                  onPress={closeComplaintDetails}
                  style={styles.premiumClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={21} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.premiumScroll}
              contentContainerStyle={styles.premiumScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedComplaint && (
                <>
                  {/* TICKET IDENTITY */}
                  <View style={styles.premiumIdentity}>
                    <View
                      style={[
                        styles.premiumModuleIcon,
                        getModuleStyle(selectedComplaint.module || ''),
                      ]}
                    >
                      <Text style={styles.detailsModuleIconText}>
                        {getModuleIcon(selectedComplaint.module || '')}
                      </Text>
                    </View>

                    <View style={styles.premiumIdentityText}>
                      <Text style={styles.premiumModuleName}>
                        {selectedComplaint.module || 'General complaint'}
                      </Text>
                      <Text style={styles.premiumTicketId}>
                        TICKET / #{selectedComplaint._id}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.premiumStatusChip,
                        getStatusStyle(selectedComplaint.status),
                      ]}
                    >
                      <View
                        style={[
                          styles.largeStatusDot,
                          getStatusDotStyle(selectedComplaint.status),
                        ]}
                      />
                      <Text style={styles.premiumStatusText}>
                        {getStatusLabel(selectedComplaint.status)}
                      </Text>
                    </View>
                  </View>

                  {/* PROBLEM FIRST — HERO SECTION */}
                  <View style={styles.premiumProblem}>
                    <View style={styles.premiumProblemHeading}>
                      <Text style={styles.premiumOverline}>REPORTED ISSUE</Text>
                      <Ionicons
                        name="document-text-outline"
                        size={19}
                        color={theme.primary}
                      />
                    </View>

                    <Text style={styles.premiumProblemTitle}>
                      What needs attention?
                    </Text>

                    <Text style={styles.premiumProblemDescription}>
                      {selectedComplaint.problem ||
                        'No description was provided for this ticket.'}
                    </Text>

                    <View style={styles.premiumDateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={'#898692'}
                      />
                      <Text style={styles.premiumDateText}>
                        Reported {formatDate(selectedComplaint.createdAt)}
                      </Text>
                      <View style={styles.premiumDateDot} />
                      <Text style={styles.premiumDateText}>
                        {formatTime(selectedComplaint.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* ATTACHMENTS — RIGHT AFTER DESCRIPTION */}
                  <View style={styles.premiumSection}>
                    <View style={styles.premiumSectionHeading}>
                      <View>
                        <Text style={styles.premiumSectionTitle}>
                          Evidence & attachments
                        </Text>
                        <Text style={styles.premiumSectionHint}>
                          Supporting images for this issue
                        </Text>
                      </View>

                      <View style={styles.premiumCount}>
                        <Text style={styles.premiumCountText}>
                          {selectedComplaint.image?.length || 0}
                        </Text>
                      </View>
                    </View>

                    {selectedComplaint.image?.length > 0 ? (
                      <TouchableOpacity
                        style={styles.premiumAttachment}
                        activeOpacity={0.8}
                        onPress={() => openAttachments(selectedComplaint)}
                      >
                        <View style={styles.premiumAttachmentIcon}>
                          <Ionicons
                            name="images-outline"
                            size={23}
                            color={theme.primary}
                          />
                        </View>

                        <View style={styles.premiumAttachmentInfo}>
                          <Text style={styles.premiumAttachmentTitle}>
                            View attached files
                          </Text>
                          <Text style={styles.premiumSectionHint}>
                            {selectedComplaint.image.length}{' '}
                            {selectedComplaint.image.length === 1
                              ? 'image attached'
                              : 'images attached'}
                          </Text>
                        </View>

                        <Ionicons
                          name="arrow-up-right"
                          size={20}
                          color={theme.text}
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.premiumNoAttachment}>
                        <Ionicons
                          name="image-outline"
                          size={20}
                          color={'#898692'}
                        />
                        <Text style={styles.premiumSectionHint}>
                          No supporting files
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* PROGRESS — MINIMAL TIMELINE */}
                  <View style={styles.premiumSection}>
                    <View style={styles.premiumSectionHeading}>
                      <View>
                        <Text style={styles.premiumSectionTitle}>
                          Resolution progress
                        </Text>
                        <Text style={styles.premiumSectionHint}>
                          From submission to completion
                        </Text>
                      </View>
                      <Ionicons
                        name="git-branch-outline"
                        size={20}
                        color={theme.primary}
                      />
                    </View>

                    <View style={styles.premiumProgressTrack}>
                      <View style={styles.premiumProgressStep}>
                        <View
                          style={[
                            styles.premiumProgressIcon,
                            styles.premiumProgressDone,
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.premiumProgressCopy}>
                          <Text style={styles.premiumProgressTitle}>
                            Submitted
                          </Text>
                          <Text style={styles.premiumSectionHint}>
                            Request received
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumProgressConnector} />

                      <View style={styles.premiumProgressStep}>
                        <View
                          style={[
                            styles.premiumProgressIcon,
                            ['in-progress', 'resolved'].includes(
                              normalizeComplaintStatus(
                                selectedComplaint.status,
                              ),
                            )
                              ? styles.premiumProgressDone
                              : styles.premiumProgressPending,
                          ]}
                        >
                          {['in-progress', 'resolved'].includes(
                            normalizeComplaintStatus(selectedComplaint.status),
                          ) && (
                            <Ionicons
                              name="checkmark"
                              size={15}
                              color="#FFFFFF"
                            />
                          )}
                        </View>
                        <View style={styles.premiumProgressCopy}>
                          <Text style={styles.premiumProgressTitle}>
                            In progress
                          </Text>
                          <Text style={styles.premiumSectionHint}>
                            Support team handling
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumProgressConnector} />

                      <View style={styles.premiumProgressStep}>
                        <View
                          style={[
                            styles.premiumProgressIcon,
                            normalizeComplaintStatus(
                              selectedComplaint.status,
                            ) === 'resolved'
                              ? styles.premiumProgressDone
                              : styles.premiumProgressPending,
                          ]}
                        >
                          {normalizeComplaintStatus(
                            selectedComplaint.status,
                          ) === 'resolved' && (
                            <Ionicons
                              name="checkmark"
                              size={15}
                              color="#FFFFFF"
                            />
                          )}
                        </View>
                        <View style={styles.premiumProgressCopy}>
                          <Text style={styles.premiumProgressTitle}>
                            Resolved
                          </Text>
                          <Text style={styles.premiumSectionHint}>
                            Issue completed
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* MANAGEMENT — ROLE RESTRICTIONS PRESERVED */}
                  {(isAdmin || isEmployee) && (
                    <View style={styles.premiumSection}>
                      <View style={styles.premiumSectionHeading}>
                        <View>
                          <Text style={styles.premiumSectionTitle}>
                            Manage ticket
                          </Text>
                          <Text style={styles.premiumSectionHint}>
                            Update the current workflow status
                          </Text>
                        </View>
                        <View style={styles.premiumRoleTag}>
                          <Text style={styles.premiumRoleTagText}>
                            {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setActiveTicketDropdown('status')}
                        style={{
                          minHeight: 54,
                          paddingHorizontal: 15,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: theme.border || '#E5DFD5',
                          backgroundColor: theme.background,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 15,
                            lineHeight: 22,
                            fontWeight: '600',
                            color: theme.text,
                            includeFontPadding: true,
                          }}
                        >
                          {getStatusLabel(selectedComplaint.status)}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={19}
                          color={'#8A8494'}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ASSIGNMENT */}
                  {isAdmin && (
                    <View style={styles.premiumSection}>
                      <View style={styles.premiumSectionHeading}>
                        <View>
                          <Text style={styles.premiumSectionTitle}>
                            Ticket ownership
                          </Text>
                          <Text style={styles.premiumSectionHint}>
                            Select the responsible employee
                          </Text>
                        </View>
                        <Ionicons
                          name="person-add-outline"
                          size={20}
                          color={theme.primary}
                        />
                      </View>

                      {loadingEmployees ? (
                        <ActivityIndicator
                          color={theme.primary}
                          style={{ paddingVertical: 16 }}
                        />
                      ) : employees.length > 0 ? (
                        <>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setActiveTicketDropdown('employee')}
                            style={{
                              minHeight: 54,
                              paddingHorizontal: 15,
                              borderRadius: 14,
                              borderWidth: 1,
                              borderColor: theme.border || '#E5DFD5',
                              backgroundColor: theme.background,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 12 }}>
                              <Text
                                numberOfLines={1}
                                style={{
                                  fontSize: 14,
                                  lineHeight: 21,
                                  fontWeight: selectedEmployeeId
                                    ? '600'
                                    : '400',
                                  color: selectedEmployeeId
                                    ? theme.text
                                    : '#8A8494',
                                  includeFontPadding: true,
                                }}
                              >
                                {employees.find(
                                  item => item.id === selectedEmployeeId,
                                )
                                  ? `${
                                      employees.find(
                                        item => item.id === selectedEmployeeId,
                                      )?.userName
                                    }${
                                      employees.find(
                                        item => item.id === selectedEmployeeId,
                                      )?.designation
                                        ? ` — ${
                                            employees.find(
                                              item =>
                                                item.id === selectedEmployeeId,
                                            )?.designation
                                          }`
                                        : ''
                                    }`
                                  : 'Select an employee...'}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-down"
                              size={19}
                              color={'#8A8494'}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.premiumAssignButton,
                              { opacity: assigningTicket ? 0.65 : 1 },
                            ]}
                            activeOpacity={0.85}
                            disabled={assigningTicket}
                            onPress={assignTicket}
                          >
                            {assigningTicket ? (
                              <ActivityIndicator color="#FFFFFF" />
                            ) : (
                              <Text style={styles.premiumAssignButtonText}>
                                {selectedComplaint.assignedEmployeeId ||
                                selectedComplaint.assignedEmployee
                                  ? 'Reassign employee'
                                  : 'Assign employee'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.premiumEmpty}>
                          <Text style={styles.premiumSectionHint}>
                            No employees were returned by /api/auth/getUser.
                            Check that this endpoint returns users to admins.
                          </Text>
                          <TouchableOpacity
                            onPress={getEmployees}
                            style={{ marginTop: 10 }}
                          >
                            <Text style={styles.premiumRetry}>Try again</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* CURRENT OWNER */}
                  {(isAdmin || isEmployee) && (
                    <View style={styles.premiumSection}>
                      <Text style={styles.premiumSectionTitle}>
                        Assigned to
                      </Text>

                      <View style={styles.premiumOwner}>
                        <View style={styles.premiumOwnerIcon}>
                          <Ionicons
                            name="person-outline"
                            size={21}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.premiumOwnerCopy}>
                          <Text style={styles.premiumOwnerName}>
                            {selectedComplaint.assignedEmployee?.userName ||
                              'Not assigned'}
                          </Text>
                          {!!selectedComplaint.assignedEmployee
                            ?.designation && (
                            <Text style={styles.premiumSectionHint}>
                              {selectedComplaint.assignedEmployee.designation}
                            </Text>
                          )}
                          {!!selectedComplaint.assignedEmployee?.email && (
                            <Text style={styles.premiumSectionHint}>
                              {selectedComplaint.assignedEmployee.email}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* FIXED BOTTOM ACTION */}
            <View style={styles.premiumFooter}>
              <TouchableOpacity
                style={styles.premiumFooterButton}
                activeOpacity={0.85}
                onPress={closeComplaintDetails}
              >
                <Text style={styles.premiumFooterText}>Done</Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM TICKET DROPDOWNS: avoids Android native Picker popup clipping */}
      <Modal
        visible={activeTicketDropdown !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setActiveTicketDropdown(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveTicketDropdown(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 13, 18, 0.42)',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{
              width: '100%',
              maxHeight: '72%',
              alignSelf: 'center',
              backgroundColor: theme.background,
              borderRadius: 20,
              paddingTop: 19,
              paddingBottom: 10,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: theme.border || '#E7E1D8',
              elevation: 18,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 18,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                color: '#8A8494',
                marginBottom: 5,
              }}
            >
              {activeTicketDropdown === 'status'
                ? 'TICKET WORKFLOW'
                : 'TICKET OWNER'}
            </Text>
            <Text
              style={{
                fontSize: 20,
                lineHeight: 27,
                fontWeight: '800',
                color: theme.text,
                marginBottom: 13,
              }}
            >
              {activeTicketDropdown === 'status'
                ? 'Update status'
                : 'Assign employee'}
            </Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {activeTicketDropdown === 'status' ? (
                [
                  { label: 'Pending', value: 'pending', icon: 'time-outline' },
                  {
                    label: 'In Progress',
                    value: 'in-progress',
                    icon: 'sync-outline',
                  },
                  {
                    label: 'Resolved',
                    value: 'resolved',
                    icon: 'checkmark-circle-outline',
                  },
                ].map(option => {
                  const selected =
                    normalizeComplaintStatus(selectedComplaint?.status) ===
                    option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.75}
                      onPress={() => {
                        if (selectedComplaint) {
                          updateStatus(selectedComplaint._id, option.value);
                        }
                        setActiveTicketDropdown(null);
                      }}
                      style={{
                        minHeight: 54,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        marginBottom: 5,
                        borderRadius: 12,
                        backgroundColor: selected
                          ? theme.primarySoft || '#F1E7D9'
                          : 'transparent',
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={selected ? theme.primary : '#8A8494'}
                      />
                      <Text
                        style={{
                          flex: 1,
                          marginLeft: 12,
                          fontSize: 15,
                          lineHeight: 22,
                          fontWeight: selected ? '700' : '500',
                          color: theme.text,
                          includeFontPadding: true,
                        }}
                      >
                        {option.label}
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={19}
                          color={theme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedEmployeeId('');
                      setActiveTicketDropdown(null);
                    }}
                    style={{
                      minHeight: 50,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      marginBottom: 5,
                    }}
                  >
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color={'#8A8494'}
                    />
                    <Text
                      style={{
                        marginLeft: 12,
                        fontSize: 14,
                        lineHeight: 21,
                        color: theme.text,
                      }}
                    >
                      Unassigned
                    </Text>
                    {!selectedEmployeeId && (
                      <Ionicons
                        name="checkmark"
                        size={19}
                        color={theme.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                  {employees.map(employee => {
                    const selected = selectedEmployeeId === employee.id;
                    return (
                      <TouchableOpacity
                        key={employee.id}
                        activeOpacity={0.75}
                        onPress={() => {
                          setSelectedEmployeeId(employee.id);
                          setActiveTicketDropdown(null);
                        }}
                        style={{
                          minHeight: 58,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          marginBottom: 5,
                          borderRadius: 12,
                          backgroundColor: selected
                            ? theme.primarySoft || '#F1E7D9'
                            : 'transparent',
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selected
                              ? theme.background
                              : theme.background || '#F7F5F1',
                            borderWidth: 1,
                            borderColor: theme.border || '#E7E1D8',
                          }}
                        >
                          <Ionicons
                            name="person-outline"
                            size={18}
                            color={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 11 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 14,
                              lineHeight: 20,
                              fontWeight: selected ? '700' : '600',
                              color: theme.text,
                            }}
                          >
                            {employee.userName}
                          </Text>
                          {!!employee.designation && (
                            <Text
                              numberOfLines={1}
                              style={{
                                fontSize: 11,
                                lineHeight: 16,
                                marginTop: 2,
                                color: '#8A8494',
                              }}
                            >
                              {employee.designation}
                            </Text>
                          )}
                        </View>
                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={theme.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveTicketDropdown(null)}
              style={{
                height: 45,
                marginTop: 8,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border || '#E7E1D8',
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: '700', color: theme.text }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 
          ATTACHMENTS MODAL
       */}

      <Modal
        visible={attachmentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAttachments}
      >
        <View style={styles.attachmentsModalOverlay}>
          <View style={styles.attachmentsModalContainer}>
            <View style={styles.attachmentsModalHeader}>
              <View>
                <Text style={styles.attachmentsModalTitle}>Attachments</Text>

                <Text style={styles.attachmentsModalSubtitle}>
                  {attachmentImages.length}{' '}
                  {attachmentImages.length === 1 ? 'image' : 'images'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeAttachments}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.attachmentGrid}
              showsVerticalScrollIndicator={false}
            >
              {attachmentImages.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.attachmentImageWrapper}
                  activeOpacity={0.85}
                  onPress={() => openImage(imageUrl)}
                >
                  <Image
                    source={{
                      uri: imageUrl,
                    }}
                    style={styles.attachmentGridImage}
                    resizeMode="cover"
                  />

                  <View style={styles.attachmentImageNumber}>
                    <Text style={styles.attachmentImageNumberText}>
                      {index + 1}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 
          FULL IMAGE
       */}

      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={closeImage}
      >
        <View style={styles.imageModal}>
          <TouchableOpacity style={styles.closeButton} onPress={closeImage}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{
                uri: selectedImage,
              }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
};

export default ComplainPage;
