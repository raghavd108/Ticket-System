import React from 'react';
import { StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const AppStatusBar: React.FC = () => {
  const { isDarkMode } = useTheme();

  return <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />;
};

export default AppStatusBar;
