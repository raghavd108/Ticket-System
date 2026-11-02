import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

import { useTheme } from '../context/ThemeContext';
import en from '../i18n/en';

import LeaveManagement from '../components/LeaveManagement';
import DesignationPicker from '../components/DesignationPicker';
import CompanyCalendarScreen from '../components/CompanyCalander';
import OfferPage from '../components/OfferPage';
import SendNotificationModal from '../components/SendNotificationModal';

const API_URL = Config.API_URL;

type ModalType =
  | 'notification'
  | 'leave'
  | 'organisation'
  | 'designation'
  | 'calendar'
  | 'offers'
  | 'feedback'
  | null;

interface CurrentUser {
  id?: string;
  _id?: string;
  userName?: string;
  email?: string;
  role?: string;
  designation?: string;
  isSuperAdmin?: boolean;
  canPublishOffers?: boolean;
  designationRef?: {
    name?: string;
    canPublishOffers?: boolean;
    canNotifyEmployees?: boolean;
  };
  permissions?: {
    canViewAllTickets?: boolean;
    canAssignTickets?: boolean;
    canManageUsers?: boolean;
    canPublishOffers?: boolean;
    canNotifyEmployees?: boolean;
    managementLevel?: number;
  };
}

interface ClientFeedbackItem {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
  client?: {
    id?: string;
    userName?: string;
    email?: string;
  };
  organisation?: {
    id?: string;
    name?: string;
  };
}

interface FeedbackStatistics {
  total: number;
  averageRating: number;
}

interface ManageItem {
  title: string;
  subtitle: string;
  icon: string;
  permission: 'canManageUsers' | 'canPublishOffers' | 'canNotifyEmployees';
  modal?: ModalType;
}

const manageItems: ManageItem[] = [
  {
    title: en.manage.items.sendNotification.title,
    subtitle: en.manage.items.sendNotification.subtitle,
    icon: 'notifications-outline',
    permission: 'canNotifyEmployees',
    modal: 'notification',
  },
  {
    title: en.manage.items.offers.title,
    subtitle: en.manage.items.offers.subtitle,
    icon: 'pricetag-outline',
    permission: 'canPublishOffers',
    modal: 'offers',
  },
  {
    title: en.manage.items.clientFeedback.title,
    subtitle: en.manage.items.clientFeedback.subtitle,
    icon: 'chatbubbles-outline',
    permission: 'canManageUsers',
    modal: 'feedback',
  },

  {
    title: en.manage.items.leaveManagement.title,
    subtitle: en.manage.items.leaveManagement.subtitle,
    icon: 'briefcase-outline',
    permission: 'canManageUsers',
    modal: 'leave',
  },
  {
    title: en.manage.items.companyCalendar.title,
    subtitle: en.manage.items.companyCalendar.subtitle,
    icon: 'today-outline',
    permission: 'canManageUsers',
    modal: 'calendar',
  },
  {
    title: en.manage.items.designations.title,
    subtitle: en.manage.items.designations.subtitle,
    icon: 'people-outline',
    permission: 'canManageUsers',
    modal: 'designation',
  },
  {
    title: en.manage.items.organisationCategories.title,
    subtitle: en.manage.items.organisationCategories.subtitle,
    icon: 'layers-outline',
    permission: 'canManageUsers',
    modal: 'organisation',
  },
];

const ManagePage: React.FC = () => {
  const { theme } = useTheme();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Organisation
  const [organisationName, setOrganisationName] = useState('');
  const [organisationType, setOrganisationType] = useState('');
  const [showOrganisationTypeList, setShowOrganisationTypeList] =
    useState(false);
  const [creatingOrganisation, setCreatingOrganisation] = useState(false);

  const organisationTypes = [
    'Hospital',
    'School',
    'Real Estate',
    'Inventory & Accounting',
    'Games',
  ];

  // Designation
  const [designation, setDesignation] = useState('');

  // Client feedback
  const [feedbackList, setFeedbackList] = useState<ClientFeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackRefreshing, setFeedbackRefreshing] = useState(false);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackStatistics, setFeedbackStatistics] =
    useState<FeedbackStatistics>({ total: 0, averageRating: 0 });

  const styles = useMemo(() => createStyles(theme), [theme]);
  const permissions = user?.permissions;

  const isSuperAdmin = user?.isSuperAdmin === true;

  const hasPermission = (
    permission: 'canManageUsers' | 'canPublishOffers' | 'canNotifyEmployees',
  ): boolean => {
    // SuperAdmin has access to all management features.
    if (isSuperAdmin) {
      return true;
    }

    return permissions?.[permission] === true;
  };

  const canManageUsers = hasPermission('canManageUsers');
  const canPublishOffers = hasPermission('canPublishOffers');
  const canSendEmployeeNotifications = hasPermission('canNotifyEmployees');

  const canManage =
    isSuperAdmin ||
    canManageUsers ||
    canPublishOffers ||
    canSendEmployeeNotifications;

  const fetchClientFeedback = async (page = 1, refreshing = false) => {
    try {
      if (refreshing) {
        setFeedbackRefreshing(true);
      } else {
        setFeedbackLoading(true);
      }

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error(en.errors.authentication);
      }

      const response = await axios.get(`${API_URL}/api/feedback`, {
        params: { page, limit: 10 },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = response.data || {};
      const nestedData = payload.data || {};
      const list =
        payload.feedback ||
        payload.items ||
        (Array.isArray(payload.data) ? payload.data : null) ||
        nestedData.feedback ||
        nestedData.items ||
        [];

      const pagination = payload.pagination || nestedData.pagination || {};
      const statistics = payload.statistics || nestedData.statistics || {};

      setFeedbackList(Array.isArray(list) ? list : []);
      setFeedbackPage(Number(pagination.page || page));
      setFeedbackTotalPages(
        Math.max(1, Number(pagination.totalPages || pagination.pages || 1)),
      );
      setFeedbackStatistics({
        total: Number(
          statistics.totalFeedback ??
            statistics.total ??
            pagination.total ??
            (Array.isArray(list) ? list.length : 0),
        ),
        averageRating: Number(
          statistics.averageRating ??
            statistics.avgRating ??
            statistics.average ??
            0,
        ),
      });
    } catch (error: any) {
      console.log(
        'FETCH CLIENT FEEDBACK ERROR:',
        error?.response?.data || error,
      );
      Alert.alert(
        'Unable to load feedback',
        error?.response?.data?.message || error?.message || 'Please try again.',
      );
    } finally {
      setFeedbackLoading(false);
      setFeedbackRefreshing(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (activeModal === 'feedback') {
      fetchClientFeedback(1);
    }
  }, [activeModal]);

  const getCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error(en.errors.authentication);
      }

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data?.user || null);
    } catch (error: any) {
      console.log('MANAGE USER ERROR:', error?.response?.data || error);

      Alert.alert(
        en.manage.authenticationErrorTitle,
        en.manage.loadAccountError,
      );
    } finally {
      setUserLoading(false);
    }
  };

  // -----------------------------------------
  // OPEN AND CLOSE MODALS
  // -----------------------------------------

  const openModal = (modal?: ModalType) => {
    if (!modal) return;

    if (!canManage) {
      Alert.alert(en.manage.accessDeniedTitle, en.manage.featureAccessDenied);
      return;
    }

    if (modal === 'notification' && !canSendEmployeeNotifications) {
      Alert.alert(en.manage.accessDeniedTitle, en.manage.featureAccessDenied);
      return;
    }

    if (modal === 'offers' && !canPublishOffers) {
      Alert.alert(en.manage.accessDeniedTitle, en.manage.featureAccessDenied);
      return;
    }

    if (modal === 'feedback' && !canManageUsers) {
      Alert.alert(en.manage.accessDeniedTitle, en.manage.featureAccessDenied);
      return;
    }

    if (
      ['designation', 'organisation', 'leave', 'calendar'].includes(modal) &&
      !canManageUsers
    ) {
      Alert.alert(
        en.manage.accessDeniedTitle,
        en.manage.designationAccessDenied,
      );
      return;
    }

    setActiveModal(modal);
  };

  const closeModal = () => {
    if (creatingOrganisation) return;
    setShowOrganisationTypeList(false);
    setActiveModal(null);
  };

  // -----------------------------------------
  // CREATE ORGANISATION
  // -----------------------------------------

  const createOrganisation = async () => {
    const cleanName = organisationName.trim();
    const cleanType = organisationType.trim();

    if (!cleanType || !cleanName) {
      Alert.alert(
        en.manage.requiredFieldsTitle,
        en.manage.organisationFieldsRequired,
      );
      return;
    }

    try {
      setCreatingOrganisation(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error(en.errors.authentication);
      }

      const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const currentUserId =
        userResponse.data?.user?._id || userResponse.data?.user?.id;

      if (!currentUserId) {
        throw new Error(en.manage.userIdentificationError);
      }

      const response = await axios.post(
        `${API_URL}/api/org/add-org/${currentUserId}`,
        {
          orgType: cleanType,
          name: cleanName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('ORGANISATION CREATED:', response.data);

      Alert.alert(
        en.manage.organisationCreatedTitle,
        en.manage.organisationCreatedMessage,
      );

      setOrganisationName('');
      setOrganisationType('');
      setShowOrganisationTypeList(false);
      setActiveModal(null);
    } catch (error: any) {
      console.log('CREATE ORGANISATION ERROR:', error?.response?.data || error);

      Alert.alert(
        en.manage.creationFailedTitle,
        error?.response?.data?.message ||
          error?.message ||
          en.manage.createOrganisationError,
      );
    } finally {
      setCreatingOrganisation(false);
    }
  };

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (userLoading) {
    return (
      <SafeAreaView
        style={[styles.loading, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />

        <Text style={{ color: theme.muted, marginTop: 12 }}>
          {en.manage.loading}
        </Text>
      </SafeAreaView>
    );
  }

  // -----------------------------------------
  // ACCESS CONTROL
  // -----------------------------------------

  if (!canManage) {
    return (
      <SafeAreaView
        style={[styles.loading, { backgroundColor: theme.background }]}
      >
        <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />

        <Text style={[styles.heading, { color: theme.text, marginTop: 15 }]}>
          {en.manage.accessRestricted}
        </Text>

        <Text style={{ color: theme.muted, marginTop: 6 }}>
          {en.manage.managementAccessDenied}
        </Text>
      </SafeAreaView>
    );
  }

  const visibleItems = manageItems.filter(item =>
    hasPermission(item.permission),
  );

  // -----------------------------------------
  // MAIN SCREEN
  // -----------------------------------------

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: 20,
        backgroundColor: theme.background,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={[styles.heading, { color: theme.text }]}>
              {en.manage.title}
            </Text>

            <Text style={[styles.subtitle, { color: theme.muted }]}>
              {en.manage.subtitle}
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={24} color={theme.primary} />
          </View>
        </View>

        {/* MANAGEMENT GRID */}

        <View style={styles.grid}>
          {visibleItems.map(item => (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.75}
              onPress={() => openModal(item.modal)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Ionicons name={item.icon} size={24} color={theme.primary} />
              </View>

              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {item.title}
              </Text>

              <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                {item.subtitle}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={{ color: theme.primary, fontSize: 11 }}>
                  {en.manage.open}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={theme.primary}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* SEND NOTIFICATION ONLY */}
      <SendNotificationModal
        visible={activeModal === 'notification'}
        onClose={closeModal}
      />

      {/* =====================================
          LEAVE MANAGEMENT MODAL
      ===================================== */}

      <Modal
        visible={activeModal === 'leave'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.drawerOverlay}>
          <SafeAreaView
            style={[styles.drawer, { backgroundColor: theme.background }]}
          >
            <ModalHeader
              title={en.manage.leaveManagementTitle}
              subtitle={en.manage.leaveManagementSubtitle}
              onClose={closeModal}
              theme={theme}
            />

            <View style={{ flex: 1 }}>
              <LeaveManagement />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* =====================================
          ORGANISATION CREATION MODAL
      ===================================== */}

      <Modal
        visible={activeModal === 'organisation'}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <SafeAreaView style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 18, flexGrow: 1 }}
            >
              <ModalHeader
                title={en.manage.addOrganisationTitle}
                subtitle={en.manage.addOrganisationSubtitle}
                onClose={closeModal}
                theme={theme}
              />

              <Text style={styles.inputLabel}>
                {en.manage.organisationTypeLabel}
              </Text>

              <TouchableOpacity
                activeOpacity={0.75}
                disabled={creatingOrganisation}
                onPress={() =>
                  setShowOrganisationTypeList(previous => !previous)
                }
                style={[
                  styles.input,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: creatingOrganisation ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: organisationType ? theme.text : theme.muted,
                    fontSize: 14,
                  }}
                >
                  {organisationType ||
                    en.manage.organisationTypePlaceholder ||
                    'Select organisation type'}
                </Text>
                <Ionicons
                  name={
                    showOrganisationTypeList ? 'chevron-up' : 'chevron-down'
                  }
                  size={19}
                  color={theme.muted}
                />
              </TouchableOpacity>

              {showOrganisationTypeList && (
                <View
                  style={{
                    marginTop: 7,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: theme.white,
                  }}
                >
                  {organisationTypes.map((type, index) => {
                    const selected = organisationType === type;

                    return (
                      <TouchableOpacity
                        key={type}
                        activeOpacity={0.7}
                        onPress={() => {
                          setOrganisationType(type);
                          setShowOrganisationTypeList(false);
                        }}
                        style={{
                          minHeight: 46,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: selected
                            ? theme.primarySoft
                            : theme.white,
                          borderBottomWidth:
                            index === organisationTypes.length - 1 ? 0 : 1,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? theme.primary : theme.text,
                            fontSize: 13,
                            fontWeight: selected ? '700' : '500',
                          }}
                        >
                          {type}
                        </Text>
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={theme.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.inputLabel}>
                {en.manage.organisationNameLabel}
              </Text>

              <TextInput
                value={organisationName}
                onChangeText={setOrganisationName}
                placeholder={en.organisation.namePlaceholder}
                placeholderTextColor={theme.muted}
                editable={!creatingOrganisation}
                returnKeyType="done"
                onSubmitEditing={createOrganisation}
                style={styles.input}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={createOrganisation}
                disabled={creatingOrganisation}
                activeOpacity={0.8}
              >
                {creatingOrganisation ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {en.manage.createOrganisationButton}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================
          DESIGNATION CREATION / MANAGEMENT
      ===================================== */}

      <Modal
        visible={activeModal === 'designation'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.drawerOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <SafeAreaView
            style={[
              styles.drawer,
              styles.designationDrawer,
              { backgroundColor: theme.background },
            ]}
          >
            <ModalHeader
              title={en.manage.designationsTitle}
              subtitle={en.manage.designationsSubtitle}
              onClose={closeModal}
              theme={theme}
            />

            <ScrollView
              style={styles.designationScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.designationScrollContent}
            >
              <Text style={styles.inputLabel}>
                {en.manage.employeeDesignationLabel}
              </Text>

              <DesignationPicker
                value={designation}
                onChange={setDesignation}
                disabled={false}
                allowCreate={canManageUsers}
                isSuperAdmin={isSuperAdmin}
                canManageUsers={canManageUsers}
                managementLevel={user?.permissions?.managementLevel ?? 0}
              />

              <Text
                style={{
                  color: theme.muted,
                  fontSize: 12,
                  marginTop: 14,
                  lineHeight: 19,
                }}
              >
                {en.manage.designationHelp}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================
          OFFERS MANAGEMENT MODAL
      ===================================== */}

      <Modal
        visible={activeModal === 'offers'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.drawerOverlay}>
          <SafeAreaView
            style={[
              styles.drawer,
              {
                height: '96%',
                padding: 0,
                backgroundColor: theme.background,
              },
            ]}
          >
            {/* OFFERS MODAL HEADER */}

            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: 12,
                backgroundColor: theme.background,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: theme.text,
                  }}
                >
                  {en.manage.offersManagementTitle}
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: theme.muted,
                    marginTop: 4,
                  }}
                >
                  {en.manage.offersManagementSubtitle}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeModal}
                activeOpacity={0.7}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.primarySoft,
                }}
              >
                <Ionicons name="close" size={23} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* EXISTING OFFER MANAGEMENT COMPONENT */}

            <View style={{ flex: 1 }}>
              <OfferPage user={user} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* =====================================
          CLIENT FEEDBACK MODAL
      ===================================== */}

      <Modal
        visible={activeModal === 'feedback'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.drawerOverlay}>
          <SafeAreaView
            style={[
              styles.drawer,
              {
                height: '94%',
                padding: 0,
                backgroundColor: theme.background,
              },
            ]}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: '800',
                  }}
                >
                  Client Feedback
                </Text>
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  Review feedback submitted by your clients
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeModal}
                activeOpacity={0.7}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.primarySoft,
                }}
              >
                <Ionicons name="close" size={23} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                paddingVertical: 13,
                gap: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <Text style={{ color: theme.muted, fontSize: 10 }}>
                  Total feedback
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 22,
                    fontWeight: '800',
                    marginTop: 4,
                  }}
                >
                  {feedbackStatistics.total}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <Text style={{ color: theme.muted, fontSize: 10 }}>
                  Average rating
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Ionicons name="star" size={18} color="#E5A83B" />
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 22,
                      fontWeight: '800',
                      marginLeft: 6,
                    }}
                  >
                    {feedbackStatistics.averageRating.toFixed(1)}
                  </Text>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 11,
                      marginLeft: 3,
                    }}
                  >
                    / 5
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingBottom: 12,
              }}
            >
              {feedbackLoading && feedbackList.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={{ color: theme.muted, marginTop: 10 }}>
                    Loading client feedback...
                  </Text>
                </View>
              ) : feedbackList.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 28,
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={42}
                    color={theme.muted}
                  />
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: '700',
                      marginTop: 12,
                    }}
                  >
                    No feedback yet
                  </Text>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 12,
                      textAlign: 'center',
                      marginTop: 6,
                      lineHeight: 18,
                    }}
                  >
                    Client feedback will appear here when submitted.
                  </Text>
                  <TouchableOpacity
                    onPress={() => fetchClientFeedback(1, true)}
                    style={{
                      marginTop: 16,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 11,
                      backgroundColor: theme.primarySoft,
                    }}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>
                      Refresh
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  refreshControl={
                    <RefreshControl
                      refreshing={feedbackRefreshing}
                      onRefresh={() => fetchClientFeedback(feedbackPage, true)}
                      tintColor={theme.primary}
                      colors={[theme.primary]}
                    />
                  }
                  contentContainerStyle={{ paddingBottom: 14 }}
                >
                  <TouchableOpacity
                    onPress={() => fetchClientFeedback(feedbackPage, true)}
                    activeOpacity={0.75}
                    style={{
                      alignSelf: 'flex-end',
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                    }}
                  >
                    {feedbackRefreshing ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name="refresh"
                        size={16}
                        color={theme.primary}
                      />
                    )}
                    <Text
                      style={{
                        color: theme.primary,
                        fontSize: 12,
                        fontWeight: '700',
                        marginLeft: 6,
                      }}
                    >
                      Refresh
                    </Text>
                  </TouchableOpacity>

                  {feedbackList.map((feedback, index) => {
                    const clientName =
                      feedback.client?.userName ||
                      feedback.client?.email ||
                      'Client';
                    const organisationName =
                      feedback.organisation?.name ||
                      'Organisation not available';
                    const createdDate = feedback.createdAt
                      ? new Date(feedback.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Date unavailable';

                    return (
                      <View
                        key={feedback.id || `${feedback.createdAt}-${index}`}
                        style={{
                          backgroundColor: theme.white,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 16,
                          padding: 14,
                          marginBottom: 11,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 14,
                                fontWeight: '800',
                              }}
                            >
                              {clientName}
                            </Text>
                            <Text
                              style={{
                                color: theme.muted,
                                fontSize: 11,
                                marginTop: 3,
                              }}
                            >
                              {organisationName}
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: theme.primarySoft,
                              borderRadius: 9,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                            }}
                          >
                            <Ionicons name="star" size={13} color="#E5A83B" />
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 12,
                                fontWeight: '800',
                                marginLeft: 4,
                              }}
                            >
                              {Number(feedback.rating || 0)}/5
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 13,
                            lineHeight: 20,
                            marginTop: 12,
                          }}
                        >
                          {feedback.message || 'No written comment provided.'}
                        </Text>

                        <View
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: theme.border,
                            marginTop: 12,
                            paddingTop: 9,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={theme.muted}
                          />
                          <Text
                            style={{
                              color: theme.muted,
                              fontSize: 10,
                              marginLeft: 5,
                            }}
                          >
                            {createdDate}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                    }}
                  >
                    <TouchableOpacity
                      disabled={feedbackPage <= 1 || feedbackLoading}
                      onPress={() => fetchClientFeedback(feedbackPage - 1)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: theme.primarySoft,
                        opacity: feedbackPage <= 1 ? 0.4 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.primary,
                          fontWeight: '700',
                          fontSize: 12,
                        }}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <Text style={{ color: theme.muted, fontSize: 11 }}>
                      Page {feedbackPage} of {feedbackTotalPages}
                    </Text>

                    <TouchableOpacity
                      disabled={
                        feedbackPage >= feedbackTotalPages || feedbackLoading
                      }
                      onPress={() => fetchClientFeedback(feedbackPage + 1)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: theme.primarySoft,
                        opacity: feedbackPage >= feedbackTotalPages ? 0.4 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.primary,
                          fontWeight: '700',
                          fontSize: 12,
                        }}
                      >
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* =====================================
          COMPANY CALENDAR MODAL
      ===================================== */}

      <Modal
        visible={activeModal === 'calendar'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.drawerOverlay}>
          <SafeAreaView
            style={[
              styles.drawer,
              {
                backgroundColor: theme.background,
                height: '95%',
                paddingHorizontal: 0,
                paddingTop: 0,
              },
            ]}
          >
            {/* CLOSE BUTTON */}

            <TouchableOpacity
              onPress={closeModal}
              activeOpacity={0.7}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 100,
                elevation: 10,
                backgroundColor: theme.white,
                padding: 9,
                borderRadius: 12,
              }}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>

            {/* COMPANY CALENDAR */}

            <CompanyCalendarScreen
              route={{
                params: {
                  user: {
                    id: user?.id || user?._id,
                    role: user?.role,
                    designation: user?.designation,
                  },
                },
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// -----------------------------------------
// REUSABLE MODAL HEADER
// -----------------------------------------

const ModalHeader = ({
  title,
  subtitle,
  onClose,
  theme,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  theme: any;
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 22,
    }}
  >
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text
        style={{
          color: theme.text,
          fontSize: 21,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: theme.muted,
          fontSize: 12,
          marginTop: 5,
          lineHeight: 18,
        }}
      >
        {subtitle}
      </Text>
    </View>

    <TouchableOpacity
      onPress={onClose}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: theme.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="close" size={22} color={theme.text} />
    </TouchableOpacity>
  </View>
);

// -----------------------------------------
// STYLES
// -----------------------------------------

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 18,
      paddingBottom: 35,
    },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },

    heading: {
      fontSize: 26,
      fontWeight: '800',
    },

    subtitle: {
      fontSize: 13,
      marginTop: 5,
    },

    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    card: {
      width: '48%',
      minHeight: 174,
      padding: 15,
      marginBottom: 14,
      borderRadius: 18,
      borderWidth: 1,
    },

    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 5,
    },

    cardSubtitle: {
      fontSize: 11,
      lineHeight: 16,
      flex: 1,
    },

    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 20,
    },

    modalCard: {
      backgroundColor: theme.background,
      borderRadius: 22,
      padding: 21,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: '90%',
      flexShrink: 1,
    },

    drawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },

    drawer: {
      height: '85%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 20,
      overflow: 'hidden',
    },

    // Larger designation drawer: leaves enough room for the picker
    // and its "New designation" form when the keyboard is visible.
    designationDrawer: {
      height: '92%',
      maxHeight: '92%',
      minHeight: '70%',
      flexShrink: 1,
      paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },

    designationScroll: {
      flex: 1,
      minHeight: 0,
    },

    designationScrollContent: {
      flexGrow: 1,
      paddingBottom: 40,
    },

    inputLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.text,
      marginBottom: 8,
      marginTop: 12,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text,
      fontSize: 14,
    },

    messageInput: {
      height: 115,
    },

    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
      marginTop: 18,
    },

    infoText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      marginLeft: 10,
    },

    primaryButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 22,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
  });

export default ManagePage;
