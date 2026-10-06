import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext.tsx';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  launchImageLibrary,
  launchCamera,
  Asset,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';

import createStyles from '../style/TicketGen.ts';

const ReportPage = () => {
  const [module, setModule] = useState('');
  const [problem, setProblem] = useState('');
  const [image, setImage] = useState<Asset[]>([]);

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setMessage('Authentication token not found');
        return;
      }

      await axios.get('http://10.0.2.2:3000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log('GET USER ERROR:', error);
      setMessage('Unable to get user information');
    }
  };

  const pickImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 10,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        console.log('Image Picker Error:', response.errorMessage);

        Alert.alert('Error', 'Unable to select image');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        setImage(response.assets);
      }
    });
  };
  const takePhoto = () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      cameraType: 'back',
      saveToPhotos: false,
    };
    launchCamera(options, response => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        console.log('Camera Error:', response.errorMessage);

        Alert.alert(
          'Camera Error',
          response.errorMessage || 'Unable to open camera',
        );

        return;
      }
      if (response.assets && response.assets.length > 0) {
        const photo = response.assets[0];

        setImage(prev => [...prev, photo]);
      }
    });
  };
  const removeImage = (indexToRemove: number) => {
    setImage(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!module.trim() || !problem.trim() || image.length === 0) {
      setMessage(
        'Please complete the required fields and attach at least one screenshot.',
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setMessage('Authentication token not found');
        return;
      }

      const formData = new FormData();

      formData.append('module', module.trim());
      formData.append('problem', problem.trim());

      image.forEach((item, index) => {
        if (item.uri) {
          formData.append('image', {
            uri: item.uri,
            type: item.type || 'image/jpeg',
            name: item.fileName || `complaint-image-${index}.jpg`,
          } as any);
        }
      });

      const response = await axios.post(
        'http://10.0.2.2:3000/api/complain/postcomplain',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      console.log('SUBMIT RESPONSE:', response.data);

      setMessage('Complaint submitted successfully.');

      setModule('');
      setProblem('');
      setImage([]);
    } catch (error) {
      console.log('SUBMIT COMPLAINT ERROR:', error);

      setMessage('We could not submit your complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSuccess = message.includes('successfully');

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.clientContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cont}>
          {/* ================================================= */}
          {/* TOP HEADER */}
          {/* ================================================= */}

          <View style={styles.pageHeader}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>?</Text>
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerLabel}>SUPPORT CENTER</Text>

              <Text style={styles.title}>Create a Ticket</Text>

              <Text style={styles.subtitle}>
                Report an issue and our support team will help you resolve it.
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* FORM CARD */}
          {/* ================================================= */}

          <View style={styles.formCard}>
            {/* CARD TOP */}
            <View style={styles.cardTopRow}>
              <View>
                <Text style={styles.cardTitle}>Issue details</Text>

                <Text style={styles.cardSubtitle}>
                  Provide enough information to help us understand the issue.
                </Text>
              </View>
            </View>

            {/* MESSAGE */}
            {message ? (
              <View
                style={[
                  styles.messageBox,
                  isSuccess ? styles.successBox : styles.errorBox,
                ]}
              >
                <View
                  style={[
                    styles.messageIcon,
                    isSuccess ? styles.successIcon : styles.errorIcon,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageIconText,
                      isSuccess ? styles.successText : styles.errorText,
                    ]}
                  >
                    {isSuccess ? '✓' : '!'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.messageText,
                    isSuccess ? styles.successText : styles.errorText,
                  ]}
                >
                  {message}
                </Text>
              </View>
            ) : null}

            {/* ================================================= */}
            {/* MODULE */}
            {/* ================================================= */}

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Module</Text>

                <Text style={styles.requiredText}>Required</Text>
              </View>

              <View style={[styles.inputWrapper]}>
                <TextInput
                  style={styles.input}
                  placeholder="Billing, Login, Appointment..."
                  placeholderTextColor="#A49DAF"
                  value={module}
                  onChangeText={setModule}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.fieldHint}>
                Select the part of the application where the problem occurred.
              </Text>
            </View>

            {/* ================================================= */}
            {/* PROBLEM */}
            {/* ================================================= */}

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>What happened?</Text>

                <Text style={styles.requiredText}>Required</Text>
              </View>

              <View style={[styles.inputWrapper]}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe what you were trying to do, what happened, and what you expected..."
                  placeholderTextColor="#A49DAF"
                  value={problem}
                  onChangeText={setProblem}
                  multiline
                  numberOfLines={7}
                  textAlignVertical="top"
                  maxLength={1000}
                />

                <Text style={styles.characterCount}>{problem.length}/1000</Text>
              </View>

              <Text style={styles.fieldHint}>
                Include any error message or important steps that led to the
                issue.
              </Text>
            </View>

            {/* ================================================= */}
            {/* SCREENSHOTS */}
            {/* ================================================= */}

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <View>
                  <Text style={styles.inputLabel}>Screenshots</Text>
                </View>

                <Text style={styles.requiredText}>Required</Text>
              </View>

              {/* UPLOAD BOX */}

              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={takePhoto}
                  activeOpacity={0.85}
                >
                  <View style={styles.uploadIconBox}>
                    <Text style={styles.uploadIcon}>📷</Text>
                  </View>

                  <Text style={styles.imageButtonText}>Take Photo</Text>

                  <Text style={styles.uploadHint}>Use camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  <View style={styles.uploadIconBox}>
                    <Text style={styles.uploadIcon}>↑</Text>
                  </View>

                  <Text style={styles.imageButtonText}>Choose Photos</Text>

                  <Text style={styles.uploadHint}>From gallery</Text>
                </TouchableOpacity>
              </View>

              {/* IMAGE PREVIEW GRID */}

              {image.length > 0 ? (
                <View style={styles.previewSection}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>Attachments</Text>

                    <TouchableOpacity
                      onPress={() => setImage([])}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAllText}>Remove all</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.previewGrid}>
                    {image.map((item, index) => (
                      <View
                        key={`${item.uri}-${index}`}
                        style={styles.previewCard}
                      >
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.previewImage}
                          resizeMode="cover"
                        />

                        <View style={styles.imageOverlay}>
                          <View style={styles.imageNumber}>
                            <Text style={styles.imageNumberText}>
                              {index + 1}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.removeImageText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.uploadInfo}>
                <View style={styles.infoDot}>
                  <Text style={styles.infoDotText}>i</Text>
                </View>

                <Text style={styles.helperText}>
                  Screenshots help our support team identify and resolve the
                  issue faster.
                </Text>
              </View>
            </View>

            {/* ================================================= */}
            {/* DIVIDER */}
            {/* ================================================= */}

            <View style={styles.formDivider} />

            {/* ================================================= */}
            {/* SUBMIT */}
            {/* ================================================= */}

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />

                  <Text
                    style={[styles.submitButtonText, styles.submittingText]}
                  >
                    Submitting...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitIcon}>↑</Text>

                  <Text style={styles.submitButtonText}>Submit Complaint</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Your complaint will be securely submitted to the support team.
            </Text>
          </View>

          {/* ================================================= */}
          {/* BOTTOM NOTE */}
          {/* ================================================= */}

          <View style={styles.securityNote}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityIconText}>✓</Text>
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Need help?</Text>

              <Text style={styles.securityText}>
                Include clear details and screenshots so our team can
                investigate your issue efficiently.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ReportPage;
