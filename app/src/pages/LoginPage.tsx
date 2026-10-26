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

import createStyles from '../style/LoginStyle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Update this path if your assets folder is in a different location.
const companyIcon = require('../assets/icon.png');

const LoginPage = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { login } = useAuth();

  const handleLogin = async (): Promise<void> => {
    if (loading) return;

    if (!userName.trim() || !password) {
      setMessage('Please enter your username and password.');
      return;
    }

    try {
      setMessage('');
      setLoading(true);
      Keyboard.dismiss();

      const response = await axios.post(`${Config.API_URL}/api/auth/login`, {
        userName: userName.trim(),
        password,
      });

      const token = response.data?.token;

      if (!token) {
        setMessage('Login failed: authentication token not received.');
        return;
      }

      await login(token);

      console.log('Login successful');
      setMessage('Login successful');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.log('Login error:', error.response?.data || error.message);

        const serverMessage = error.response?.data?.message;

        setMessage(
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Login failed. Please check your credentials and try again.',
        );
      } else if (error instanceof Error) {
        console.log('Login error:', error.message);
        setMessage(error.message || 'Login failed. Please try again.');
      } else {
        console.log('Unexpected login error:', error);
        setMessage('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            {/* Company Icon */}
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
                accessibilityLabel="Company logo"
                accessible
              />
            </View>

            <Text style={styles.title}>Welcome Back</Text>

            <Text style={styles.subtitle}>Login to your account</Text>

            {/* Username */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username / Email / Mobile Number</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter username, email or mobile"
                placeholderTextColor="#9ca3af"
                value={userName}
                onChangeText={setUserName}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>

              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={value => {
                  setPassword(value);
                  if (message) setMessage('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password"
              />
            </View>

            {/* Status message */}
            {message ? (
              <View
                style={{
                  marginBottom: 15,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor:
                    message === 'Login successful' ? '#dcfce7' : '#fee2e2',
                }}
              >
                <Text
                  style={{
                    color:
                      message === 'Login successful' ? '#166534' : '#dc2626',
                    textAlign: 'center',
                  }}
                >
                  {message}
                </Text>
              </View>
            ) : null}

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Login"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginPage;
