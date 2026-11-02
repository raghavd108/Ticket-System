import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

import { useTheme } from '../context/ThemeContext';

const API_URL = Config.API_URL;

interface Feedback {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
  organisation?: {
    id: string;
    name: string;
    orgType?: string;
  };
}

const ClientFeedbackScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);

  // =====================================================
  // FETCH PREVIOUS FEEDBACK
  // =====================================================

  const fetchFeedbackHistory = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const response = await axios.get(`${API_URL}/api/feedback/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFeedbackHistory(response.data?.feedback || []);
    } catch (error: any) {
      console.log('FEEDBACK HISTORY ERROR:', error?.response?.data || error);

      Alert.alert(
        'Unable to load feedback',
        error?.response?.data?.message || 'Please try again later.',
      );
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbackHistory();
  }, [fetchFeedbackHistory]);

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedbackHistory();
  };

  // =====================================================
  // SUBMIT FEEDBACK
  // =====================================================

  const handleSubmitFeedback = async () => {
    const cleanMessage = message.trim();

    if (rating < 1 || rating > 5) {
      Alert.alert(
        'Rating required',
        'Please select a star rating before submitting.',
      );
      return;
    }

    if (!cleanMessage) {
      Alert.alert('Feedback required', 'Please write your feedback.');
      return;
    }

    if (cleanMessage.length > 5000) {
      Alert.alert(
        'Feedback too long',
        'Feedback cannot exceed 5000 characters.',
      );
      return;
    }

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const response = await axios.post(
        `${API_URL}/api/feedback`,
        {
          rating,
          message: cleanMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data?.success) {
        setRating(0);
        setMessage('');

        Alert.alert(
          'Thank you!',
          'Your feedback has been submitted successfully.',
        );

        await fetchFeedbackHistory();
      }
    } catch (error: any) {
      console.log('SUBMIT FEEDBACK ERROR:', error?.response?.data || error);

      Alert.alert(
        'Submission failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to submit your feedback. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // =====================================================
  // STAR RATING COMPONENT
  // =====================================================

  const renderStars = (selectedRating: number, interactive = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            activeOpacity={interactive ? 0.65 : 1}
            disabled={!interactive || submitting}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= selectedRating ? 'star' : 'star-outline'}
              size={interactive ? 36 : 17}
              color={star <= selectedRating ? '#E6A23C' : theme.light}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Select your rating';
    }
  };

  // =====================================================
  // FEEDBACK HISTORY CARD
  // =====================================================

  const renderFeedbackCard = (item: Feedback) => (
    <View key={item.id} style={styles.historyCard}>
      <View style={styles.historyTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.historyRating}>
            {renderStars(item.rating)}
            <Text style={styles.ratingText}>{item.rating}/5</Text>
          </View>

          <Text style={styles.historyDate}>
            {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
          </Text>
        </View>

        <View style={styles.historyIcon}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={19}
            color={theme.primary}
          />
        </View>
      </View>

      <View style={styles.historyDivider} />

      <Text style={styles.historyMessage}>{item.message}</Text>

      {item.organisation?.name ? (
        <View style={styles.organisationRow}>
          <Ionicons name="business-outline" size={14} color={theme.muted} />
          <Text style={styles.organisationText}>{item.organisation.name}</Text>
        </View>
      ) : null}
    </View>
  );

  // =====================================================
  // MAIN SCREEN
  // =====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          contentContainerStyle={styles.container}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={25}
                color={theme.primary}
              />
            </View>

            <Text style={styles.heading}>Client Feedback</Text>

            <Text style={styles.subtitle}>
              Your feedback helps us improve our services and provide you with a
              better experience.
            </Text>
          </View>

          {/* FEEDBACK FORM */}

          <View style={styles.formCard}>
            <View style={styles.formTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Share your experience</Text>

                <Text style={styles.formSubtitle}>
                  We would love to hear from you.
                </Text>
              </View>

              <View style={styles.formIcon}>
                <Ionicons
                  name="heart-outline"
                  size={21}
                  color={theme.primary}
                />
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* RATING */}

            <Text style={styles.fieldLabel}>
              How would you rate our services?
            </Text>

            <View style={styles.ratingSection}>
              {renderStars(rating, true)}

              <Text
                style={[
                  styles.ratingLabel,
                  {
                    color: rating ? theme.primary : theme.muted,
                  },
                ]}
              >
                {getRatingLabel(rating)}
              </Text>
            </View>

            {/* MESSAGE */}

            <View style={styles.messageHeader}>
              <Text style={styles.fieldLabel}>Your feedback</Text>

              <Text style={styles.characterCount}>{message.length}/5000</Text>
            </View>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us about your experience..."
              placeholderTextColor={theme.muted}
              multiline
              maxLength={5000}
              textAlignVertical="top"
              editable={!submitting}
              style={styles.messageInput}
            />

            <View style={styles.infoRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={theme.success}
              />

              <Text style={styles.infoText}>
                Your feedback will be shared with our management team.
              </Text>
            </View>

            {/* SUBMIT */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitFeedback}
              disabled={submitting}
              style={[styles.submitButton, submitting && { opacity: 0.65 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#FFFFFF" />

                  <Text style={styles.submitText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* FEEDBACK HISTORY */}

          <View style={styles.historySection}>
            <View style={styles.historyHeadingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Your Previous Feedback</Text>

                <Text style={styles.sectionSubtitle}>
                  Your previously submitted responses.
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{feedbackHistory.length}</Text>
              </View>
            </View>

            {loadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />

                <Text style={styles.emptySubtitle}>
                  Loading your feedback...
                </Text>
              </View>
            ) : feedbackHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="chatbox-ellipses-outline"
                    size={29}
                    color={theme.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>No feedback yet</Text>

                <Text style={styles.emptySubtitle}>
                  Your submitted feedback will appear here.
                </Text>
              </View>
            ) : (
              feedbackHistory.map(renderFeedbackCard)
            )}
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons name="heart" size={14} color={theme.coral} />

            <Text style={styles.footerText}>
              Thank you for helping us improve.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      paddingTop: 20,
      backgroundColor: theme.background,
    },

    container: {
      padding: 18,
      paddingBottom: 40,
    },

    // HEADER

    header: {
      alignItems: 'center',
      marginBottom: 25,
      paddingTop: 12,
    },

    headerIcon: {
      width: 58,
      height: 58,
      borderRadius: 19,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    heading: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '800',
    },

    subtitle: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 15,
    },

    // FORM CARD

    formCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 18,
    },

    formTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    formTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },

    formSubtitle: {
      color: theme.muted,
      fontSize: 11,
      marginTop: 5,
    },

    formIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    sectionDivider: {
      height: 1,
      backgroundColor: theme.divider,
      marginVertical: 18,
    },

    fieldLabel: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
    },

    // RATING

    ratingSection: {
      alignItems: 'center',
      marginTop: 15,
      marginBottom: 23,
    },

    starsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    starButton: {
      padding: 3,
    },

    ratingLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginTop: 9,
    },

    // MESSAGE

    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },

    characterCount: {
      color: theme.muted,
      fontSize: 10,
    },

    messageInput: {
      minHeight: 125,
      maxHeight: 200,
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 13,
      padding: 13,
      color: theme.text,
      fontSize: 13,
      lineHeight: 20,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 14,
      gap: 8,
    },

    infoText: {
      color: theme.muted,
      fontSize: 10,
      lineHeight: 16,
      flex: 1,
    },

    // SUBMIT

    submitButton: {
      minHeight: 51,
      backgroundColor: theme.primary,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 21,
    },

    submitText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    // HISTORY

    historySection: {
      marginTop: 29,
    },

    historyHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },

    sectionTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },

    sectionSubtitle: {
      color: theme.muted,
      fontSize: 11,
      marginTop: 5,
    },

    countBadge: {
      minWidth: 32,
      height: 32,
      paddingHorizontal: 8,
      borderRadius: 11,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    countText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '800',
    },

    historyCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 15,
      marginBottom: 12,
    },

    historyTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    historyRating: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    ratingText: {
      color: theme.text,
      fontSize: 11,
      fontWeight: '700',
      marginLeft: 7,
    },

    historyDate: {
      color: theme.muted,
      fontSize: 10,
      marginTop: 7,
    },

    historyIcon: {
      width: 37,
      height: 37,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    historyDivider: {
      height: 1,
      backgroundColor: theme.divider,
      marginVertical: 13,
    },

    historyMessage: {
      color: theme.text,
      fontSize: 12,
      lineHeight: 20,
    },

    organisationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 13,
      gap: 6,
    },

    organisationText: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '600',
    },

    // EMPTY / LOADING

    loadingContainer: {
      padding: 30,
      alignItems: 'center',
      gap: 12,
    },

    emptyCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 17,
      padding: 25,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 57,
      height: 57,
      borderRadius: 18,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    emptyTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
    },

    emptySubtitle: {
      color: theme.muted,
      fontSize: 11,
      marginTop: 7,
      textAlign: 'center',
    },

    // FOOTER

    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 7,
      marginTop: 23,
    },

    footerText: {
      color: theme.muted,
      fontSize: 11,
    },
  });

export default ClientFeedbackScreen;
