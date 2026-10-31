import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Switch,
  Image,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';

import createStyles from '../style/profilePage';
import { useTheme } from '../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AttendanceHistory from '../components/AttendanceHistory';
import AttendanceReport from '../components/AttendanceReport';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import LeaveRequest from '../components/leaveRequest';
import Config from 'react-native-config';
import en from '../i18n/en';

interface Organisation {
  _id: string;
  name: string;
}

interface DocumentFile {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  url: string;
}

interface Document {
  _id: string;
  employeeId: string;
  title: string;
  files: DocumentFile[];
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id?: string;
  id?: string;
  userName: string;
  email: string;
  role: string;
  organisation?: string | Organisation | null;
  designation?: string;
}

const ProfilePage = () => {
  const { logout } = useAuth();
  const copy = en.profilePage;

  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Document preview
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(
    null,
  );

  const [documentPreviewVisible, setDocumentPreviewVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit profile
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Employee menu and modal
  const [employeeMenuVisible, setEmployeeMenuVisible] = useState(false);

  const [leaveRequestModalVisible, setLeaveRequestModalVisible] =
    useState(false);

  const [employeeModal, setEmployeeModal] = useState<
    'documents' | 'attendance' | null
  >(null);

  const drawerSlide = useRef(new Animated.Value(1)).current;

  const drawerWidth = Math.min(Dimensions.get('window').width * 0.82, 360);

  const { theme, isDarkMode, toggleTheme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (employeeMenuVisible) {
      drawerSlide.setValue(1);

      Animated.timing(drawerSlide, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [employeeMenuVisible, drawerSlide]);

  const getOrganisationName = (
    organisation?: string | Organisation | null,
  ): string => {
    if (!organisation) {
      return copy.notAssigned;
    }

    if (typeof organisation === 'string') {
      return organisation;
    }

    return organisation.name || copy.notAssigned;
  };

  useEffect(() => {
    getUser();
  }, []);

  // GET USER
  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(copy.sessionExpiredTitle, copy.loginAgain);
        return;
      }

      const response = await axios.get(`${Config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const loggedInUser = response.data.user;

      setUser(loggedInUser);
      setEditUserName(loggedInUser.userName || '');
      setEditEmail(loggedInUser.email || '');

      // Documents are issued to employees only.
      if (loggedInUser?.role?.toLowerCase() === 'employee') {
        getDocuments();
      }
    } catch (error) {
      console.log('GET USER ERROR:', error);
      Alert.alert(copy.errorTitle, copy.loadProfileError);
    } finally {
      setLoading(false);
    }
  };

  // OPEN EDIT PROFILE
  const openEditProfile = () => {
    if (!user) {
      return;
    }

    setEditUserName(user.userName || '');
    setEditEmail(user.email || '');
    setEditModalVisible(true);
  };

  // UPDATE PROFILE
  const updateProfile = async () => {
    if (!editUserName.trim()) {
      Alert.alert(copy.invalidUsernameTitle, copy.usernameRequired);
      return;
    }

    if (!editEmail.trim()) {
      Alert.alert(copy.invalidEmailTitle, copy.emailRequired);
      return;
    }

    try {
      setUpdatingProfile(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(copy.sessionExpiredTitle, copy.loginAgain);
        return;
      }

      const response = await axios.patch(
        `${Config.API_URL}/api/auth/update-profile`,
        {
          userName: editUserName.trim(),
          email: editEmail.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('UPDATE PROFILE RESPONSE:', response.data);

      setUser(prev =>
        prev
          ? {
              ...prev,
              userName: editUserName.trim(),
              email: editEmail.trim(),
            }
          : prev,
      );

      setEditModalVisible(false);

      Alert.alert(copy.profileUpdatedTitle, copy.profileUpdatedMessage);
    } catch (error: any) {
      console.log('UPDATE PROFILE ERROR:', error?.response?.data || error);

      Alert.alert(
        copy.updateFailedTitle,
        error?.response?.data?.message || copy.updateProfileError,
      );
    } finally {
      setUpdatingProfile(false);
    }
  };

  // UPDATE PASSWORD
  const updatePassword = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert(copy.missingFieldsTitle, copy.passwordFieldsRequired);
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(copy.weakPasswordTitle, copy.passwordMinLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(copy.passwordMismatchTitle, copy.passwordMismatch);
      return;
    }

    try {
      setUpdatingPassword(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(copy.sessionExpiredTitle, copy.loginAgain);
        return;
      }

      const response = await axios.patch(
        `${Config.API_URL}/api/auth/update-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('UPDATE PASSWORD RESPONSE:', response.data);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(false);

      // The server ends every session after a password change.
      Alert.alert(
        copy.passwordUpdatedTitle,
        copy.passwordUpdatedMessage,
        [{ text: copy.ok, onPress: () => logout() }],
        { cancelable: false },
      );
    } catch (error: any) {
      console.log('UPDATE PASSWORD ERROR:', error?.response?.data || error);

      Alert.alert(
        copy.passwordUpdateFailedTitle,
        error?.response?.data?.message || copy.updatePasswordError,
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  // GET EMPLOYEE DOCUMENTS
  const getDocuments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return;
      }

      const response = await axios.get(
        `${Config.API_URL}/api/documents/my-documents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setDocuments(response.data.documents || []);
    } catch (error: any) {
      console.log('GET DOCUMENTS ERROR:', error?.response?.data || error);
    }
  };

  // OPEN DOCUMENT
  const openDocument = async (file: DocumentFile) => {
    if (!file.url) {
      Alert.alert(copy.errorTitle, copy.documentUrlUnavailable);
      return;
    }

    if (file.mimeType?.startsWith('image/')) {
      setSelectedDocument(file);
      setDocumentPreviewVisible(true);
      return;
    }

    try {
      await Linking.openURL(file.url);
    } catch (error) {
      console.log('OPEN DOCUMENT ERROR:', error);

      Alert.alert(copy.cannotOpenDocumentTitle, copy.cannotOpenDocumentMessage);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setLogoutModalVisible(false);
    } catch (error) {
      console.log('LOGOUT ERROR:', error);
      Alert.alert(copy.errorTitle, copy.logoutError);
    } finally {
      setLoggingOut(false);
    }
  };

  const normalizedRole = String(user?.role || '')
    .trim()
    .toLowerCase();
  const isEmployee = normalizedRole === 'employee';
  const isAdmin = normalizedRole === 'admin';

  // LOADING
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202124" />
        <Text style={styles.loadingText}>{copy.loadingProfile}</Text>
      </View>
    );
  }

  // NO USER
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{copy.loadProfileError}</Text>

        <TouchableOpacity style={styles.retryButton} onPress={getUser}>
          <Text style={styles.retryButtonText}>{copy.tryAgain}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {/* PROFILE HEADER */}
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>

              <View style={styles.profileHeaderInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user.userName}
                </Text>

                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user.email}
                </Text>

                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                activeOpacity={0.7}
                onPress={openEditProfile}
              >
                <Ionicons
                  name="create-outline"
                  size={21}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            {/* ACCOUNT INFORMATION */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {copy.accountInformation}
                </Text>
              </View>

              <View style={styles.infoCard}>
                {/* ORGANISATION */}
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons
                      name="business-outline"
                      size={19}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{copy.organisation}</Text>

                    <Text style={styles.infoValue} numberOfLines={2}>
                      {getOrganisationName(user.organisation)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {isEmployee && (
                  <>
                    {/* ATTENDANCE */}
                    <TouchableOpacity
                      style={styles.infoItem}
                      activeOpacity={0.75}
                      onPress={() => setEmployeeModal('attendance')}
                    >
                      <View style={styles.infoIcon}>
                        <Ionicons
                          name="time-outline"
                          size={19}
                          color={theme.primary}
                        />
                      </View>

                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>{copy.attendance}</Text>
                        <Text style={styles.infoValue}>
                          {copy.viewAttendanceHistory}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.text}
                      />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* DOCUMENTS */}
                    <TouchableOpacity
                      style={styles.infoItem}
                      activeOpacity={0.75}
                      onPress={() => setEmployeeModal('documents')}
                    >
                      <View style={styles.infoIcon}>
                        <Ionicons
                          name="folder-open-outline"
                          size={19}
                          color={theme.primary}
                        />
                      </View>

                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>{copy.documents}</Text>
                        <Text style={styles.infoValue}>
                          {copy.documentCount(documents.length)}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.text}
                      />
                    </TouchableOpacity>

                    <View style={styles.divider} />
                  </>
                )}

                {/* ROLE */}
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{copy.accountRole}</Text>
                    <Text style={styles.infoValue}>{user.role}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* DESIGNATION */}
                {isEmployee && (
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons
                        name="briefcase-outline"
                        size={19}
                        color={theme.primary}
                      />
                    </View>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{copy.designation}</Text>
                      <Text style={styles.infoValue}>
                        {user.designation || copy.notAssigned}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* ACCOUNT SETTINGS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.accountSettings}</Text>

              <View style={styles.settingsCard}>
                <View
                  style={[styles.settingRow, { backgroundColor: theme.white }]}
                >
                  <View>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                      {copy.darkMode}
                    </Text>

                    <Text
                      style={[styles.settingSubtitle, { color: theme.text }]}
                    >
                      {isDarkMode ? copy.darkModeOn : copy.darkModeOff}
                    </Text>
                  </View>

                  <Switch value={isDarkMode} onValueChange={toggleTheme} />
                </View>
                <View style={styles.divider} />
                {/* EMPLOYEE LEAVE REQUEST */}
                {isEmployee && (
                  <TouchableOpacity
                    style={styles.settingItem}
                    activeOpacity={0.7}
                    onPress={() => setLeaveRequestModalVisible(true)}
                  >
                    <View style={styles.settingIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={22}
                        color={theme.primary}
                      />
                    </View>

                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>
                        {copy.leaveRequest}
                      </Text>
                      <Text style={styles.settingDescription}>
                        {copy.leaveRequestDescription}
                      </Text>
                    </View>

                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
                )}

                {/* ATTENDANCE REPORTS (admin) */}
                {isAdmin && (
                  <>
                    <View style={styles.divider} />
                    <TouchableOpacity
                      style={styles.settingItem}
                      activeOpacity={0.7}
                      onPress={() => setEmployeeModal('attendance')}
                    >
                      <View style={styles.settingIcon}>
                        <Ionicons
                          name="stats-chart-outline"
                          size={22}
                          color={theme.primary}
                        />
                      </View>

                      <View style={styles.settingContent}>
                        <Text style={styles.settingTitle}>
                          {copy.attendanceReports}
                        </Text>
                        <Text style={styles.settingDescription}>
                          {copy.attendanceReportsDescription}
                        </Text>
                      </View>

                      <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.divider} />

                {/* CHANGE PASSWORD */}
                <TouchableOpacity
                  style={styles.settingItem}
                  activeOpacity={0.7}
                  onPress={() => setPasswordModalVisible(true)}
                >
                  <View style={styles.settingIcon}>
                    <Text style={styles.settingIconText}>•••</Text>
                  </View>

                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>
                      {copy.changePassword}
                    </Text>

                    <Text style={styles.settingDescription}>
                      {copy.changePasswordDescription}
                    </Text>
                  </View>

                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* LOGOUT */}
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.75}
              onPress={handleLogout}
            >
              <Text style={styles.logoutIcon}>↪</Text>
              <Text style={styles.logoutText}>{copy.logOut}</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>{copy.footer}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!loggingOut) {
            setLogoutModalVisible(false);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 18, 24, 0.58)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: theme.background,
              borderRadius: 26,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.text + '18',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: '#FCE8E6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <Ionicons name="log-out-outline" size={30} color="#C7463B" />
            </View>

            <Text
              style={{
                color: theme.text,
                fontSize: 21,
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {copy.logoutTitle}
            </Text>
            <Text
              style={{
                color: theme.text,
                opacity: 0.68,
                fontSize: 14,
                lineHeight: 21,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {copy.logoutMessage}
            </Text>

            <TouchableOpacity
              onPress={confirmLogout}
              disabled={loggingOut}
              activeOpacity={0.85}
              style={{
                width: '100%',
                minHeight: 52,
                borderRadius: 16,
                backgroundColor: '#C7463B',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                marginBottom: 10,
                opacity: loggingOut ? 0.7 : 1,
              }}
            >
              {loggingOut ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '700',
                      marginLeft: 9,
                    }}
                  >
                    {copy.confirmLogout}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLogoutModalVisible(false)}
              disabled={loggingOut}
              activeOpacity={0.75}
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: 16,
                backgroundColor: theme.white,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.text + '18',
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                {copy.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.modalContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{copy.editProfile}</Text>
                  <Text style={styles.modalSubtitle}>
                    {copy.editProfileSubtitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* USERNAME */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalLabel}>{copy.username}</Text>

                <TextInput
                  style={styles.modalInput}
                  value={editUserName}
                  onChangeText={setEditUserName}
                  placeholder={copy.usernamePlaceholder}
                  placeholderTextColor="#9CA1A7"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* EMAIL */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalLabel}>{copy.emailAddress}</Text>

                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor="#9CA1A7"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  updatingProfile && styles.disabledButton,
                ]}
                disabled={updatingProfile}
                onPress={updateProfile}
              >
                {updatingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>
                    {copy.saveChanges}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{copy.changePassword}</Text>
                <Text style={styles.modalSubtitle}>
                  {copy.changePasswordSubtitle}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>{copy.currentPassword}</Text>

              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={copy.currentPasswordPlaceholder}
                placeholderTextColor="#9CA1A7"
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>{copy.newPassword}</Text>

              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={copy.newPasswordPlaceholder}
                placeholderTextColor="#9CA1A7"
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>{copy.confirmNewPassword}</Text>

              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={copy.confirmNewPasswordPlaceholder}
                placeholderTextColor="#9CA1A7"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modalPrimaryButton,
                updatingPassword && styles.disabledButton,
              ]}
              disabled={updatingPassword}
              onPress={updatePassword}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>
                  {copy.updatePassword}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EMPLOYEE LEAVE REQUEST MODAL */}
      <Modal
        visible={leaveRequestModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setLeaveRequestModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              height: '85%',
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingHorizontal: 20,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                >
                  {copy.leaveRequest}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    opacity: 0.65,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {copy.leaveRequestModalSubtitle}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setLeaveRequestModalVisible(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.white,
                  marginLeft: 12,
                }}
              >
                <Ionicons name="close" size={23} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.text,
                opacity: 0.12,
                marginBottom: 12,
              }}
            />

            <View style={{ flex: 1 }}>
              {(user?._id || user?.id) && (
                <LeaveRequest employeeId={user._id || user.id} />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* DOCUMENTS MODAL */}
      <Modal
        visible={employeeModal === 'documents'}
        transparent
        animationType="slide"
        onRequestClose={() => setEmployeeModal(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              height: '80%',
            }}
          >
            {/* DOCUMENT MODAL HEADER */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <View>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                >
                  {copy.myDocuments}
                </Text>

                <Text
                  style={{
                    color: theme.text,
                    opacity: 0.65,
                    marginTop: 4,
                  }}
                >
                  {copy.documentCount(documents.length)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setEmployeeModal(null)}
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* DOCUMENT LIST */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {documents.length === 0 ? (
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 45,
                  }}
                >
                  <Ionicons
                    name="document-outline"
                    size={42}
                    color={theme.text}
                  />

                  <Text
                    style={{
                      color: theme.text,
                      marginTop: 12,
                      opacity: 0.7,
                    }}
                  >
                    {copy.noDocuments}
                  </Text>
                </View>
              ) : (
                documents.map(document => (
                  <View key={document._id} style={{ marginBottom: 22 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 15,
                        fontWeight: '600',
                        marginBottom: 12,
                      }}
                    >
                      {document.title}
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      {document.files.map(file => (
                        <TouchableOpacity
                          key={file._id}
                          activeOpacity={0.8}
                          onPress={() => openDocument(file)}
                          style={{
                            width: '47%',
                            marginBottom: 8,
                          }}
                        >
                          {file.mimeType?.startsWith('image/') ? (
                            <Image
                              source={{ uri: file.url }}
                              style={{
                                width: '100%',
                                height: 125,
                                borderRadius: 12,
                                backgroundColor: '#E5E7EB',
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={{
                                height: 125,
                                borderRadius: 12,
                                backgroundColor: theme.white,
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: 12,
                              }}
                            >
                              <Ionicons
                                name={
                                  file.mimeType === 'application/pdf'
                                    ? 'document-text-outline'
                                    : 'document-outline'
                                }
                                size={42}
                                color={theme.text}
                              />

                              <Text
                                style={{
                                  color: theme.text,
                                  fontSize: 11,
                                  marginTop: 8,
                                }}
                              >
                                {file.mimeType === 'application/pdf'
                                  ? copy.pdfDocument
                                  : copy.openDocument}
                              </Text>
                            </View>
                          )}

                          <Text
                            numberOfLines={2}
                            style={{
                              color: theme.text,
                              fontSize: 12,
                              marginTop: 7,
                            }}
                          >
                            {file.originalName || file.fileName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* IMAGE PREVIEW MODAL */}
      <Modal
        visible={documentPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDocumentPreviewVisible(false);
          setSelectedDocument(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setDocumentPreviewVisible(false);
              setSelectedDocument(null);
            }}
            accessibilityLabel={copy.closeDocumentPreview}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 55 : 25,
              right: 20,
              zIndex: 2,
              padding: 10,
            }}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedDocument && (
            <>
              <Text
                numberOfLines={2}
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 18,
                }}
              >
                {selectedDocument.originalName || selectedDocument.fileName}
              </Text>

              <Image
                source={{ uri: selectedDocument.url }}
                style={{
                  width: '100%',
                  height: '78%',
                }}
                resizeMode="contain"
              />
            </>
          )}
        </View>
      </Modal>

      {/* ATTENDANCE MODAL */}
      <Modal
        visible={employeeModal === 'attendance'}
        transparent
        animationType="slide"
        onRequestClose={() => setEmployeeModal(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              height: '85%',
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingHorizontal: 20,
              overflow: 'hidden',
            }}
          >
            {/* HEADER */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                >
                  {isAdmin ? copy.attendanceReports : copy.attendanceHistory}
                </Text>

                <Text
                  style={{
                    color: theme.text,
                    opacity: 0.65,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {isAdmin
                    ? copy.allEmployeesByPeriod
                    : copy.viewAttendanceRecords}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setEmployeeModal(null)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.white,
                }}
              >
                <Ionicons name="close" size={23} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.text,
                opacity: 0.12,
                marginBottom: 12,
              }}
            />

            {/* ATTENDANCE COMPONENT */}
            <View style={{ flex: 1 }}>
              {isAdmin ? <AttendanceReport /> : <AttendanceHistory />}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ProfilePage;
