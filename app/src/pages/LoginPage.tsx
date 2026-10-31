import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';

import axios from 'axios';
import Config from 'react-native-config';
import Ionicons from 'react-native-vector-icons/Ionicons';

import createStyles from '../style/LoginStyle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import en from '../i18n/en';

const companyIcon = require('../assets/icon.png');

const LoginPage = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { login } = useAuth();

  // =====================================================
  // MESSAGE HANDLER
  // =====================================================

  const showMessage = (text: string, success = false) => {
    setMessage(text);
    setIsSuccess(success);
  };

  const clearMessage = () => {
    setMessage('');
    setIsSuccess(false);
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (): Promise<void> => {
    if (loading) return;

    if (!userName.trim() || !password) {
      showMessage(en.auth.missingCredentials);
      return;
    }

    try {
      clearMessage();
      setLoading(true);
      Keyboard.dismiss();

      const response = await axios.post(`${Config.API_URL}/api/auth/login`, {
        userName: userName.trim(),
        password,
      });

      const token = response.data?.token;

      if (!token) {
        showMessage(en.auth.loginError);
        return;
      }

      await login(token);

      console.log('Login successful');
      showMessage(en.auth.loginSuccess, true);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.log('Login error:', error.response?.data || error.message);

        const status = error.response?.status;

        if (status === 401 || status === 400) {
          showMessage(en.auth.invalidCredentials);
        } else if (!error.response) {
          showMessage(en.errors.network);
        } else {
          showMessage(en.auth.loginError);
        }
      } else {
        if (error instanceof Error) {
          console.log('Login error:', error.message);
        } else {
          console.log('Unexpected login error:', error);
        }

        showMessage(en.auth.loginError);
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* COMPANY LOGO */}

            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Image
                source={companyIcon}
                style={{
                  width: 90,
                  height: 90,
                  resizeMode: 'contain',
                }}
                accessibilityLabel={en.auth.companyLogo}
                accessible
              />
            </View>

            {/* HEADER */}

            <Text style={styles.title}>{en.auth.welcome}</Text>

            <Text style={styles.subtitle}>{en.auth.loginTitle}</Text>

            {/* USERNAME */}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{en.auth.usernameLabel}</Text>

              <TextInput
                style={styles.input}
                placeholder={en.auth.usernamePlaceholder}
                placeholderTextColor="#9ca3af"
                value={userName}
                onChangeText={value => {
                  setUserName(value);
                  if (message) clearMessage();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="next"
                blurOnSubmit={false}
                editable={!loading}
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
                accessibilityLabel={en.auth.usernameLabel}
              />
            </View>

            {/* PASSWORD */}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{en.auth.passwordLabel}</Text>

              <View
                style={{
                  position: 'relative',
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.input,
                    {
                      paddingRight: 48,
                    },
                  ]}
                  placeholder={en.auth.passwordPlaceholder}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={value => {
                    setPassword(value);
                    if (message) clearMessage();
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  accessibilityLabel={en.auth.passwordLabel}
                />

                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 14,
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 5,
                  }}
                  onPress={() => setShowPassword(previous => !previous)}
                  disabled={loading}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? en.auth.hidePassword : en.auth.showPassword
                  }
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={21}
                    color={theme.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* STATUS MESSAGE */}

            {message ? (
              <View
                accessibilityRole="alert"
                style={{
                  marginBottom: 15,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: isSuccess ? '#dcfce7' : '#fee2e2',
                }}
              >
                <Text
                  style={{
                    color: isSuccess ? '#166534' : '#dc2626',
                    textAlign: 'center',
                  }}
                >
                  {message}
                </Text>
              </View>
            ) : null}

            {/* LOGIN BUTTON */}

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={en.auth.logInButton}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginText}>{en.auth.logInButton}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginPage;
