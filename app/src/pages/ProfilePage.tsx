import React, { useEffect, useState, useMemo } from 'react';

import {
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
} from 'react-native';
import createStyles from '../style/profilePage';
import { useTheme } from '../context/ThemeContext';

import axios from 'axios';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../context/AuthContext';

interface Organisation {
  _id: string;
  name: string;
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

  const [loading, setLoading] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [emailEditModalVisible, emailSetEditModalVisible] = useState(false);

  const [editUserName, setEditUserName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [updatingPassword, setUpdatingPassword] = useState(false);
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

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
  }, []);

  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Session expired', 'Please login again.');
        return;
      }

      const response = await axios.get('http://10.0.2.2:3000/api/auth/me', {
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

  // =========================
  // OPEN EDIT PROFILE
  // =========================

  const openEditProfile = () => {
    if (!user) {
      return;
    }

    setEditUserName(user.userName);

    setEditModalVisible(true);
  };
  const openEditEmailProfile = () => {
    if (!user) {
      return;
    }

    setEditEmail(user.email);

    emailSetEditModalVisible(true);
  };

  // =========================
  // UPDATE PROFILE
  // =========================

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
        'http://10.0.2.2:3000/api/auth/update-profile',
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

      // Update local user
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

  // =========================
  // UPDATE PASSWORD
  // =========================

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
        'http://10.0.2.2:3000/api/auth/update-password',
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

      // Clear fields
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

  // =========================
  // LOGOUT
  // =========================

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

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202124" />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // =========================
  // NO USER
  // =========================

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

  // =========================
  // UI
  // =========================

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* =========================
            PROFILE HEADER
        ========================= */}

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
          </View>

          {/* =========================
            ACCOUNT INFORMATION
        ========================= */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.infoCard}>
              {/* organisation */}

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>O</Text>
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>organisation</Text>

                  <Text style={styles.infoValue} numberOfLines={2}>
                    {getOrganisationName(user.organisation)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* USERNAME */}

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>U</Text>
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Username</Text>

                  <Text style={styles.infoValue} numberOfLines={1}>
                    {user.userName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.settingItem}
                  activeOpacity={0.7}
                  onPress={openEditProfile}
                >
                  <Text
                    style={[
                      styles.settingIconText,
                      { transform: [{ rotateY: '180deg' }] },
                    ]}
                  >
                    ✎
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* EMAIL */}

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>@</Text>
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email Address</Text>

                  <Text style={styles.infoValue} numberOfLines={2}>
                    {user.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.settingItem}
                  activeOpacity={0.7}
                  onPress={openEditEmailProfile}
                >
                  <Text
                    style={[
                      styles.settingIconText,
                      { transform: [{ rotateY: '180deg' }] },
                    ]}
                  >
                    ✎
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* ROLE */}

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>R</Text>
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Account Role</Text>

                  <Text style={styles.infoValue}>{user.role}</Text>
                </View>
              </View>
              {/* designation */}
              {isEmployee && (
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoIconText}>D</Text>
                  </View>

                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Designation</Text>

                    <Text style={styles.infoValue}>{user.designation}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* =========================
            ACCOUNT SETTINGS
        ========================= */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>

            <View style={styles.settingsCard}>
              <View
                style={[
                  styles.settingRow,
                  {
                    backgroundColor: theme.white,
                  },
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.settingTitle,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    Dark Mode
                  </Text>

                  <Text
                    style={[
                      styles.settingSubtitle,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {isDarkMode ? 'Dark mode is on' : 'Dark mode is off'}
                  </Text>
                </View>

                <Switch value={isDarkMode} onValueChange={toggleTheme} />
              </View>

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

          {/* =========================
            LOGOUT
        ========================= */}

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

      {/* =================================================
          EDIT PROFILE MODAL
      ================================================= */}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* HEADER */}

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Profile</Text>

                  <Text style={styles.modalSubtitle}>Update your username</Text>
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
                />
              </View>

              {/* SAVE */}

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
      <Modal
        visible={emailEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => emailSetEditModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* HEADER */}

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Profile</Text>

                  <Text style={styles.modalSubtitle}>
                    Update your email information
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => emailSetEditModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
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
                />
              </View>

              {/* SAVE */}

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

      {/* =================================================
          PASSWORD MODAL
      ================================================= */}

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* HEADER */}

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

            {/* CURRENT PASSWORD */}

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

            {/* NEW PASSWORD */}

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

            {/* CONFIRM PASSWORD */}

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

            {/* UPDATE */}

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
    </>
  );
};
export default ProfilePage;
