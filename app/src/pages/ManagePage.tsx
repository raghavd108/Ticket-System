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
    canManageUsers?: boolean;
    canPublishOffers?: boolean;
    canNotifyEmployees?: boolean;
  };
}

interface ManageItem {
  title: string;
  subtitle: string;
  icon: string;
  permission: string[];
  modal?: ModalType;
}

const manageItems: ManageItem[] = [
  {
    title: en.manage.items.sendNotification.title,
    subtitle: en.manage.items.sendNotification.subtitle,
    icon: 'notifications-outline',
    permission: ['admin', 'ceo', 'cto'],
    modal: 'notification',
  },
  {
    title: en.manage.items.offers.title,
    subtitle: en.manage.items.offers.subtitle,
    icon: 'pricetag-outline',
    permission: ['admin', 'ceo', 'cto'],
    modal: 'offers',
  },
  {
    title: en.manage.items.clientFeedback.title,
    subtitle: en.manage.items.clientFeedback.subtitle,
    icon: 'chatbubbles-outline',
    permission: ['admin', 'ceo', 'cto'],
  },
  {
    title: en.manage.items.attendanceReports.title,
    subtitle: en.manage.items.attendanceReports.subtitle,
    icon: 'calendar-outline',
    permission: ['admin', 'ceo', 'cto'],
  },
  {
    title: en.manage.items.leaveManagement.title,
    subtitle: en.manage.items.leaveManagement.subtitle,
    icon: 'briefcase-outline',
    permission: ['admin', 'ceo', 'cto'],
    modal: 'leave',
  },
  {
    title: en.manage.items.companyCalendar.title,
    subtitle: en.manage.items.companyCalendar.subtitle,
    icon: 'today-outline',
    permission: ['admin', 'ceo', 'cto'],
    modal: 'calendar',
  },
  {
    title: en.manage.items.designations.title,
    subtitle: en.manage.items.designations.subtitle,
    icon: 'people-outline',
    permission: ['admin', 'ceo', 'cto'],
    modal: 'designation',
  },
  {
    title: en.manage.items.organisationCategories.title,
    subtitle: en.manage.items.organisationCategories.subtitle,
    icon: 'layers-outline',
    permission: ['admin', 'ceo', 'cto'],
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
  const [creatingOrganisation, setCreatingOrganisation] = useState(false);

  // Designation
  const [designation, setDesignation] = useState('');

  const styles = useMemo(() => createStyles(theme), [theme]);

  const normalizedRole = String(user?.role || '')
    .trim()
    .toLowerCase();

  const normalizedDesignation = String(user?.designation || '')
    .trim()
    .toLowerCase();

  const isAdmin = normalizedRole === 'admin';

  const isCEOorCTO =
    normalizedRole === 'employee' &&
    ['ceo', 'cto'].includes(normalizedDesignation);

  const isSuperAdmin = user?.isSuperAdmin === true;

  const canManage = isSuperAdmin || isAdmin || isCEOorCTO;

  const canManageUsers =
    isSuperAdmin || user?.permissions?.canManageUsers === true;

  // Only SuperAdmin and employees whose designation has
  // canNotifyEmployees permission can access this feature.
  const canSendEmployeeNotifications =
    isSuperAdmin ||
    (normalizedRole === 'employee' &&
      (user?.permissions?.canNotifyEmployees === true ||
        user?.designationRef?.canNotifyEmployees === true));

  // -----------------------------------------
  // GET AUTHENTICATED USER
  // -----------------------------------------

  useEffect(() => {
    getCurrentUser();
  }, []);

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

    if (modal === 'designation' && !canManageUsers) {
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

  const visibleItems = manageItems.filter(item => {
    const hasRoleAccess = item.permission.includes(
      isSuperAdmin
        ? 'admin'
        : isAdmin
        ? 'admin'
        : isCEOorCTO
        ? normalizedDesignation
        : '',
    );

    if (item.modal === 'notification') {
      return hasRoleAccess && canSendEmployeeNotifications;
    }

    return hasRoleAccess;
  });

  // -----------------------------------------
  // MAIN SCREEN
  // -----------------------------------------

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: 15,
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

              <TextInput
                value={organisationType}
                onChangeText={setOrganisationType}
                placeholder={en.manage.organisationTypePlaceholder}
                placeholderTextColor={theme.muted}
                editable={!creatingOrganisation}
                returnKeyType="next"
                blurOnSubmit={false}
                style={styles.input}
              />

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
