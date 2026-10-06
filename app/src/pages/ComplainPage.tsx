import React, { useEffect, useState, useMemo } from 'react';
import createStyles from '../style/complainStyle';
import { useTheme } from '../context/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

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

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFilter } from '../hooks/useFilter';
import Filter from '../components/filter';

interface User {
  id: string;
  userName: string;
  email: string;
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

      const response = await axios.get('http://10.0.2.2:3000/api/auth/me', {
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

  /* 
     COMPLAINTS
   */

  const getComplaints = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await axios.get(
        'http://10.0.2.2:3000/api/complain/getcomplain',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setComplaints(response.data.complains);
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

      await axios.patch(
        `http://10.0.2.2:3000/api/complain/update-status/${complaintId}`,
        {
          status,
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
                status,
              }
            : complaint,
        ),
      );

      setSelectedComplaint(prev =>
        prev && prev._id === complaintId
          ? {
              ...prev,
              status,
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

  /* 
     STATUS
   */

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
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
    switch (status?.toLowerCase()) {
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
    switch (status?.toLowerCase()) {
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
    item => item.status?.toLowerCase() === 'in-progress',
  ).length;

  const resolvedTickets = displayComplain.filter(
    item => item.status?.toLowerCase() === 'resolved',
  ).length;

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
          color="#7357E8"
          style={{ marginTop: 18 }}
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={
            isAdmin ? styles.adminContent : styles.clientContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7357E8"
            />
          }
        >
          {/* =================================================
              HEADER
          ================================================= */}

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
                        user?.organisation.name || 'your organisations'
                      }`
                    : 'Track and manage your submitted support requests'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.notificationButton}
                activeOpacity={0.8}
                onPress={handleNotification}
              >
                <Text style={styles.notificationIcon}>🔔</Text>

                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>

            {/* =================================================
                FILTER
            ================================================= */}

            <View style={styles.searchRow}>
              <TouchableOpacity
                style={styles.filterButton}
                activeOpacity={0.85}
                onPress={handleFilter}
              >
                <Text style={styles.filterButtonIcon}>☷</Text>

                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* =================================================
              STATS
          ================================================= */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            <View style={[styles.statCard, styles.statTotal]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>▤</Text>
              </View>

              <Text style={styles.statNumber}>{totalTickets}</Text>

              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={[styles.statCard, styles.statPending]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>◷</Text>
              </View>

              <Text style={styles.statNumber}>{pendingTickets}</Text>

              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={[styles.statCard, styles.statProgress]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>↻</Text>
              </View>

              <Text style={styles.statNumber}>{progressTickets}</Text>

              <Text style={styles.statLabel}>In Progress</Text>
            </View>

            <View style={[styles.statCard, styles.statResolved]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>✓</Text>
              </View>

              <Text style={styles.statNumber}>{resolvedTickets}</Text>

              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </ScrollView>

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

          {displayComplain.length > 0 && (
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recent Tickets</Text>

                <Text style={styles.sectionSubtitle}>
                  Tap a ticket to see full details
                </Text>
              </View>

              <View style={styles.ticketCountBadge}>
                <Text style={styles.ticketCountText}>
                  {displayComplain.length}
                </Text>
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
      </View>

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
        onRequestClose={closeComplaintDetails}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsContainer}>
            <View style={styles.modalHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailsContent}
            >
              {/* HEADER */}

              <View style={styles.detailsHeader}>
                <View style={styles.detailsHeaderLeft}>
                  <View
                    style={[
                      styles.detailsModuleIcon,
                      getModuleStyle(selectedComplaint?.module || ''),
                    ]}
                  >
                    <Text style={styles.detailsModuleIconText}>
                      {getModuleIcon(selectedComplaint?.module || '')}
                    </Text>
                  </View>

                  <View style={styles.detailsHeaderText}>
                    <Text style={styles.detailsEyebrow}>TICKET DETAILS</Text>

                    <Text style={styles.detailsTitle} numberOfLines={2}>
                      {selectedComplaint?.module}
                    </Text>

                    <Text style={styles.detailsId}>
                      #{selectedComplaint?._id}
                    </Text>

                    {selectedComplaint && (
                      <Text style={styles.detailsCreated}>
                        {formatDate(selectedComplaint.createdAt)} ·{' '}
                        {formatTime(selectedComplaint.createdAt)}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.detailsCloseButton}
                  onPress={closeComplaintDetails}
                >
                  <Text style={styles.detailsCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* CURRENT STATUS */}

              {selectedComplaint && (
                <View
                  style={[
                    styles.detailsStatusCard,
                    getStatusStyle(selectedComplaint.status),
                  ]}
                >
                  <View>
                    <Text style={styles.detailsSectionLabel}>
                      CURRENT STATUS
                    </Text>

                    <View style={styles.detailsStatusRow}>
                      <View
                        style={[
                          styles.largeStatusDot,
                          getStatusDotStyle(selectedComplaint.status),
                        ]}
                      />

                      <Text style={styles.detailsStatusText}>
                        {getStatusLabel(selectedComplaint.status)}
                      </Text>
                    </View>

                    <Text style={styles.statusDescription}>
                      {selectedComplaint.status?.toLowerCase() === 'pending'
                        ? 'Your request is waiting for support.'
                        : selectedComplaint.status?.toLowerCase() ===
                          'in-progress'
                        ? 'Our support team is working on it.'
                        : 'This ticket has been completed.'}
                    </Text>
                  </View>

                  <View style={styles.statusIndicator}>
                    <View
                      style={[
                        styles.statusIndicatorDot,
                        getStatusDotStyle(selectedComplaint.status),
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* ADMIN UPDATE */}

              {(isAdmin || isEmployee) && selectedComplaint && (
                <View style={styles.statusControlSection}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.detailsSectionTitle}>
                      Update Status
                    </Text>

                    <Text style={styles.adminOnlyLabel}>
                      {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
                    </Text>
                  </View>

                  <View style={styles.statusPickerWrapper}>
                    <Picker
                      selectedValue={selectedComplaint.status}
                      onValueChange={value =>
                        updateStatus(selectedComplaint._id, value)
                      }
                      style={styles.detailsPicker}
                      mode="dropdown"
                    >
                      <Picker.Item label="Pending" value="pending" />

                      <Picker.Item label="In Progress" value="in-progress" />

                      <Picker.Item label="Resolved" value="resolved" />
                    </Picker>
                  </View>
                </View>
              )}

              {/* JOURNEY */}

              {selectedComplaint && (
                <View style={styles.timelineSection}>
                  <View style={styles.sectionHeadingRow}>
                    <View>
                      <Text style={styles.detailsSectionTitle}>
                        Ticket Journey
                      </Text>

                      <Text style={styles.detailsSectionSubtitle}>
                        Track the progress of this request
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeline}>
                    {/* SUBMITTED */}

                    <View style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineCircle,
                          styles.timelineCircleCompleted,
                        ]}
                      >
                        <Text style={styles.timelineCheck}>✓</Text>
                      </View>

                      <View style={styles.timelineText}>
                        <Text style={styles.timelineTitle}>
                          Ticket Submitted
                        </Text>

                        <Text style={styles.timelineDescription}>
                          Your support request was received.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timelineLine} />

                    {/* PROGRESS */}

                    <View style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineCircle,
                          selectedComplaint.status === 'in-progress' ||
                          selectedComplaint.status === 'resolved'
                            ? styles.timelineCircleActive
                            : styles.timelineCircleInactive,
                        ]}
                      >
                        {(selectedComplaint.status === 'in-progress' ||
                          selectedComplaint.status === 'resolved') && (
                          <Text style={styles.timelineCheck}>✓</Text>
                        )}
                      </View>

                      <View style={styles.timelineText}>
                        <Text style={styles.timelineTitle}>In Progress</Text>

                        <Text style={styles.timelineDescription}>
                          Support team is working on the ticket.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timelineLine} />

                    {/* RESOLVED */}

                    <View style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineCircle,
                          selectedComplaint.status === 'resolved'
                            ? styles.timelineCircleCompleted
                            : styles.timelineCircleInactive,
                        ]}
                      >
                        {selectedComplaint.status === 'resolved' && (
                          <Text style={styles.timelineCheck}>✓</Text>
                        )}
                      </View>

                      <View style={styles.timelineText}>
                        <Text style={styles.timelineTitle}>Resolved</Text>

                        <Text style={styles.timelineDescription}>
                          Ticket has been resolved.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* PROBLEM */}

              <View style={styles.detailSection}>
                <View style={styles.sectionHeadingRow}>
                  <View>
                    <Text style={styles.detailsSectionTitle}>
                      Problem Description
                    </Text>

                    <Text style={styles.detailsSectionSubtitle}>
                      Issue reported by the user
                    </Text>
                  </View>
                </View>

                <View style={styles.problemDetailCard}>
                  <Text style={styles.problemDetailText}>
                    {selectedComplaint?.problem || 'No description available.'}
                  </Text>
                </View>
              </View>

              {/* ATTACHMENTS */}

              <View style={styles.detailSection}>
                <View style={styles.attachmentsHeader}>
                  <View>
                    <Text style={styles.detailsSectionTitle}>Attachments</Text>

                    <Text style={styles.detailsSectionSubtitle}>
                      Files attached to this ticket
                    </Text>
                  </View>

                  <View style={styles.attachmentCount}>
                    <Text style={styles.attachmentCountText}>
                      {selectedComplaint?.image?.length || 0}
                    </Text>
                  </View>
                </View>

                {selectedComplaint?.image &&
                selectedComplaint.image.length > 0 ? (
                  <TouchableOpacity
                    style={styles.detailsAttachmentButton}
                    activeOpacity={0.85}
                    onPress={() => openAttachments(selectedComplaint)}
                  >
                    <View style={styles.detailsAttachmentIcon}>
                      <Text>▧</Text>
                    </View>

                    <View style={styles.detailsAttachmentText}>
                      <Text style={styles.detailsAttachmentTitle}>
                        View attachments
                      </Text>

                      <Text style={styles.detailsAttachmentSubtitle}>
                        {selectedComplaint.image.length}{' '}
                        {selectedComplaint.image.length === 1
                          ? 'image'
                          : 'images'}{' '}
                        attached
                      </Text>
                    </View>

                    <Text style={styles.detailsAttachmentArrow}>›</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noAttachmentDetail}>
                    <Text style={styles.noAttachmentDetailText}>
                      No attachments were added to this ticket.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* FOOTER */}

            <View style={styles.detailsFooter}>
              <TouchableOpacity
                style={styles.detailsDoneButton}
                activeOpacity={0.85}
                onPress={closeComplaintDetails}
              >
                <Text style={styles.detailsDoneText}>Close Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
