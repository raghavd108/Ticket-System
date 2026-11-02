import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
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
import en from '../i18n/en';
import Config from 'react-native-config';

// Matches the backend upload limit (5 files, 5 MB each).
const MAX_ATTACHMENTS = 5;

const ReportPage = () => {
  const copy = en.reportPage;
  const [module, setModule] = useState('');
  const [problem, setProblem] = useState('');
  const [image, setImage] = useState<Asset[]>([]);

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setMessage(copy.authTokenMissing);
        return;
      }

      await axios.get(`${Config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log('GET USER ERROR:', error);
      setMessage(copy.userInformationError);
    }
  };

  const pickImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: MAX_ATTACHMENTS,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        console.log('Image Picker Error:', response.errorMessage);

        Alert.alert(copy.errorTitle, copy.imageSelectionError);
        return;
      }

      if (response.assets && response.assets.length > 0) {
        setImage(response.assets);
      }
    });
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: copy.cameraPermissionTitle,
            message: copy.cameraPermissionMessage,
            buttonPositive: copy.allow,
            buttonNegative: en.common.cancel,
          },
        );

        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            copy.cameraPermissionRequiredTitle,
            copy.cameraPermissionRequiredMessage,
          );
          return;
        }
      }

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
            copy.cameraErrorTitle,
            response.errorMessage || copy.cameraOpenError,
          );
          return;
        }

        if (response.assets?.length) {
          setImage(prev => [...prev, response.assets![0]]);
        }
      });
    } catch (error) {
      console.log('Camera Permission Error:', error);
      Alert.alert(copy.errorTitle, copy.cameraAccessError);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImage(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!module.trim() || !problem.trim()) {
      setMessage(copy.moduleProblemRequired);
      return;
    }

    if (image.length > MAX_ATTACHMENTS) {
      setMessage(copy.attachmentLimit(MAX_ATTACHMENTS));
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setMessage(copy.authTokenMissing);
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
        `${Config.API_URL}/api/complain/postcomplain`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      console.log('SUBMIT RESPONSE:', response.data);

      setMessage(copy.submitSuccess);

      // Hide the keyboard and reveal the success message at the top of the page.
      Keyboard.dismiss();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      setModule('');
      setProblem('');
      setImage([]);
    } catch (error) {
      console.log('SUBMIT COMPLAINT ERROR:', error);

      setMessage(copy.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const isSuccess = message.includes(copy.successKeyword);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
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
              <Text style={styles.headerLabel}>{copy.supportEyebrow}</Text>

              <Text style={styles.title}>{copy.title}</Text>

              <Text style={styles.subtitle}>{copy.subtitle}</Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* FORM CARD */}
          {/* ================================================= */}

          <View style={styles.formCard}>
            {/* CARD TOP */}
            <View style={styles.cardTopRow}>
              <View>
                <Text style={styles.cardTitle}>{copy.issueDetails}</Text>

                <Text style={styles.cardSubtitle}>{copy.issueDetailsHint}</Text>
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
                <Text style={styles.inputLabel}>{copy.moduleLabel}</Text>

                <Text style={styles.requiredText}>{copy.required}</Text>
              </View>

              <View style={[styles.inputWrapper]}>
                <TextInput
                  style={styles.input}
                  placeholder={copy.modulePlaceholder}
                  placeholderTextColor="#A49DAF"
                  value={module}
                  onChangeText={setModule}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.fieldHint}>{copy.moduleHint}</Text>
            </View>

            {/* ================================================= */}
            {/* PROBLEM */}
            {/* ================================================= */}

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{copy.problemLabel}</Text>

                <Text style={styles.requiredText}>{copy.required}</Text>
              </View>

              <View style={[styles.inputWrapper]}>
                <TextInput
                  style={styles.textArea}
                  placeholder={copy.problemPlaceholder}
                  placeholderTextColor="#A49DAF"
                  value={problem}
                  onChangeText={setProblem}
                  multiline
                  numberOfLines={7}
                  textAlignVertical="top"
                  maxLength={1000}
                />

                <Text style={styles.characterCount}>
                  {copy.characterCount(problem.length)}
                </Text>
              </View>

              <Text style={styles.fieldHint}>{copy.problemHint}</Text>
            </View>

            {/* ================================================= */}
            {/* SCREENSHOTS */}
            {/* ================================================= */}

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <View>
                  <Text style={styles.inputLabel}>{copy.screenshots}</Text>
                </View>

                <Text style={styles.requiredText}>
                  {copy.optionalLimit(MAX_ATTACHMENTS)}
                </Text>
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

                  <Text style={styles.imageButtonText}>{copy.takePhoto}</Text>

                  <Text style={styles.uploadHint}>{copy.useCamera}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  <View style={styles.uploadIconBox}>
                    <Text style={styles.uploadIcon}>↑</Text>
                  </View>

                  <Text style={styles.imageButtonText}>
                    {copy.choosePhotos}
                  </Text>

                  <Text style={styles.uploadHint}>{copy.fromGallery}</Text>
                </TouchableOpacity>
              </View>

              {/* IMAGE PREVIEW GRID */}

              {image.length > 0 ? (
                <View style={styles.previewSection}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>{copy.attachments}</Text>

                    <TouchableOpacity
                      onPress={() => setImage([])}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAllText}>{copy.removeAll}</Text>
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

                <Text style={styles.helperText}>{copy.uploadHelp}</Text>
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
                    {copy.submitting}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitIcon}>↑</Text>

                  <Text style={styles.submitButtonText}>
                    {copy.submitTicket}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>{copy.footerNote}</Text>
          </View>

          {/* ================================================= */}
          {/* BOTTOM NOTE */}
          {/* ================================================= */}

          <View style={styles.securityNote}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityIconText}>✓</Text>
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>{copy.needHelp}</Text>

              <Text style={styles.securityText}>{copy.securityNote}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ReportPage;
