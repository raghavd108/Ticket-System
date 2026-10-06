import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import createStyles from '../style/LoginStyle';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { login } = useAuth();

  const Login = async () => {
    try {
      setMessage('');
      const response = await axios.post('http://10.0.2.2:3000/api/auth/login', {
        userName,
        password,
      });

      const token = response.data.token;

      await login(token);

      console.log('Login successful');
      setMessage('Login successful');
    } catch (error) {
      console.log(error);
      setMessage('login Failed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>

        <Text style={styles.subtitle}>Login to your account</Text>

        {/* Username */}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#9ca3af"
            value={userName}
            onChangeText={setUserName}
          />
        </View>

        {/* Password */}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
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
            {' '}
            <Text
              style={{
                color: message === 'Login successful' ? '#166534' : '#dc2626',
                textAlign: 'center',
              }}
            >
              {' '}
              {message}{' '}
            </Text>{' '}
          </View>
        ) : null}

        {/* Login Button */}

        <TouchableOpacity style={styles.loginButton} onPress={Login}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginPage;
