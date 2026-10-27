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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import LeaveRequest from '../components/leaveRequest';
import LeaveManagement from '../components/LeaveManagement';
import Config from 'react-native-config';

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

  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Document preview
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(
    null,
  );

  const [documentPreviewVisible, setDocumentPreviewVisible] = useState(false);

  const [loading, setLoading] = useState(true);

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
    'documents' | 'attendance' | 'leave' | null
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
      return 'Not assigned';
    }

    if (typeof organisation === 'string') {
      return organisation;
    }

    return organisation.name || 'Not assigned';
  };

  useEffect(() => {
    getUser();
    getDocuments();
  }, []);

  // GET USER
  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Session expired', 'Please login again.');
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
    } catch (error) {
      console.log('GET USER ERROR:', error);
      Alert.alert('Error', 'Unable to load your profile.');
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
      Alert.alert('Invalid Username', 'Username cannot be empty.');
      return;
    }

    if (!editEmail.trim()) {
      Alert.alert('Invalid Email', 'Email cannot be empty.');
      return;
    }

    try {
      setUpdatingProfile(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Session expired', 'Please login again.');
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

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
      );
    } catch (error: any) {
      console.log('UPDATE PROFILE ERROR:', error?.response?.data || error);

      Alert.alert(
        'Update Failed',
        error?.response?.data?.message || 'Unable to update your profile.',
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
      Alert.alert('Missing Fields', 'Please fill all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Weak Password',
        'Password must contain at least 6 characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'New password and confirm password do not match.',
      );
      return;
    }

    try {
      setUpdatingPassword(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Session expired', 'Please login again.');
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

      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully.',
      );
    } catch (error: any) {
      console.log('UPDATE PASSWORD ERROR:', error?.response?.data || error);

      Alert.alert(
        'Password Update Failed',
        error?.response?.data?.message || 'Unable to update your password.',
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

      console.log('DOCUMENTS RESPONSE:', response.data);

      setDocuments(response.data.documents || []);
    } catch (error: any) {
      console.log('GET DOCUMENTS ERROR:', error?.response?.data || error);
    }
  };

  // OPEN DOCUMENT
  const openDocument = async (file: DocumentFile) => {
    if (!file.url) {
      Alert.alert('Error', 'Document URL is unavailable.');
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

      Alert.alert(
        'Cannot Open Document',
        'Unable to open this file. Check that the URL is accessible and that a compatible viewer is installed.',
      );
    }
  };

  // LOGOUT
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const isEmployee = user?.role?.toLowerCase() === 'employee';
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // LOADING
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202124" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // NO USER
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Unable to load profile.</Text>

        <TouchableOpacity style={styles.retryButton} onPress={getUser}>
          <Text style={styles.retryButtonText}>Try Again</Text>
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
                <Text style={styles.sectionTitle}>Account Information</Text>
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
                    <Text style={styles.infoLabel}>Organisation</Text>

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
                        <Text style={styles.infoLabel}>Attendance</Text>
                        <Text style={styles.infoValue}>
                          View attendance history
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
                        <Text style={styles.infoLabel}>Documents</Text>
                        <Text style={styles.infoValue}>
                          {documents.length} documents
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
                    <Text style={styles.infoLabel}>Account Role</Text>
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
                      <Text style={styles.infoLabel}>Designation</Text>
                      <Text style={styles.infoValue}>
                        {user.designation || 'Not assigned'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* ACCOUNT SETTINGS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Settings</Text>

              <View style={styles.settingsCard}>
                <View
                  style={[styles.settingRow, { backgroundColor: theme.white }]}
                >
                  <View>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                      Dark Mode
                    </Text>

                    <Text
                      style={[styles.settingSubtitle, { color: theme.text }]}
                    >
                      {isDarkMode ? 'Dark mode is on' : 'Dark mode is off'}
                    </Text>
                  </View>

                  <Switch value={isDarkMode} onValueChange={toggleTheme} />
                </View>
                <View style={styles.divider} />
                {/*Leave Request */}
                {(isEmployee || isAdmin) && (
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
                        {isAdmin ? 'Leave Management' : 'Leave Request'}
                      </Text>

                      <Text style={styles.settingDescription}>
                        {isAdmin
                          ? 'Review, approve, or reject employee leave requests'
                          : 'Submit a leave request and track its status'}
                      </Text>
                    </View>

                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
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
                    <Text style={styles.settingTitle}>Change Password</Text>

                    <Text style={styles.settingDescription}>
                      Update your account password
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
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>Account settings</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

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
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <Text style={styles.modalSubtitle}>
                    Update your username and email
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
                <Text style={styles.modalLabel}>Username</Text>

                <TextInput
                  style={styles.modalInput}
                  value={editUserName}
                  onChangeText={setEditUserName}
                  placeholder="Enter username"
                  placeholderTextColor="#9CA1A7"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* EMAIL */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalLabel}>Email Address</Text>

                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter email"
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
                    Save Changes
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
                <Text style={styles.modalTitle}>Change Password</Text>
                <Text style={styles.modalSubtitle}>
                  Create a new secure password
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
              <Text style={styles.modalLabel}>Current Password</Text>

              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA1A7"
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>New Password</Text>

              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA1A7"
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Confirm New Password</Text>

              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
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
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* LEAVE REQUEST MODAL */}
      <Modal
        visible={leaveRequestModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setLeaveRequestModalVisible(false);
        }}
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
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                >
                  {user?.role?.toLowerCase() === 'admin'
                    ? 'Leave Management'
                    : 'Leave Request'}
                </Text>

                <Text
                  style={{
                    color: theme.text,
                    opacity: 0.65,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {user?.role?.toLowerCase() === 'admin'
                    ? 'Review and manage employee leave requests'
                    : 'Submit a new leave request and track its status'}
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

            {/* ROLE-BASED CONTENT */}
            <View style={{ flex: 1 }}>
              {user?.role?.toLowerCase() === 'employee' &&
                (user?._id || user?.id) && (
                  <LeaveRequest employeeId={user._id || user.id} />
                )}

              {user?.role?.toLowerCase() === 'admin' && <LeaveManagement />}

              {!user && (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text
                    style={{
                      color: theme.text,
                      marginTop: 12,
                    }}
                  >
                    Loading profile...
                  </Text>
                </View>
              )}

              {user &&
                !['admin', 'employee'].includes(
                  user.role?.toLowerCase() || '',
                ) && (
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={36}
                      color={theme.text}
                    />
                    <Text
                      style={{
                        color: theme.text,
                        marginTop: 12,
                        textAlign: 'center',
                      }}
                    >
                      Leave management is not available for this role.
                    </Text>
                  </View>
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
                  My Documents
                </Text>

                <Text
                  style={{
                    color: theme.text,
                    opacity: 0.65,
                    marginTop: 4,
                  }}
                >
                  {documents.length} documents
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
                    No documents available
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
                                  ? 'PDF DOCUMENT'
                                  : 'OPEN DOCUMENT'}
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
            accessibilityLabel="Close document preview"
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
                  Attendance History
                </Text>

                <Text
                  style={{
                    color: theme.text,
                    opacity: 0.65,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  View your attendance records
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
              <AttendanceHistory />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ProfilePage;
