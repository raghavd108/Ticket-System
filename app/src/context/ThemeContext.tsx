import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Theme {
  background: string;
  white: string;
  ink: string;
  text: string;
  muted: string;
  light: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  blue: string;
  blueSoft: string;
  coral: string;
  coralSoft: string;
  orange: string;
  orangeSoft: string;
  green: string;
  greenSoft: string;
  border: string;
  divider: string;
  dark: string;
  everWhite: string;
}

interface ThemeContextType {
  isDarkMode: boolean;

  theme: Theme;

  toggleTheme: () => void;
}

const lightTheme: Theme = {
  // Main background
  background: '#F3F6F8',

  // Cards / surfaces
  white: '#FFFFFF',
  everWhite: '#ffffff',
  // Strongest text
  ink: '#17212B',

  // Normal text
  text: '#37475A',

  // Secondary text
  muted: '#6B7785',

  // Disabled / subtle text
  light: '#9AA5B1',

  // Main brand / CTA
  primary: '#FF9900',

  // Dark orange
  primaryDark: '#E47911',

  // Soft orange
  primarySoft: '#FFF3E0',

  // Supporting blue
  blue: '#4FA3D1',

  // Soft blue
  blueSoft: '#E8F4FA',

  // Danger
  coral: '#D9534F',

  // Soft danger
  coralSoft: '#FDECEC',

  // Warning
  orange: '#F5A623',

  // Soft warning
  orangeSoft: '#FFF4DE',

  // Success
  green: '#168F6B',

  // Soft success
  greenSoft: '#E7F6F0',

  // Borders
  border: '#DDE3E8',

  // Dividers
  divider: '#EAEFF3',

  // Deep navy / ink
  dark: '#232F3E',
};

const darkTheme: Theme = {
  // Main background
  background: '#0F1822',

  // Cards / surfaces
  white: '#182533',

  everWhite: '#ffffff',

  // Strongest text
  ink: '#FFFFFF',

  // Normal text
  text: '#E7EDF3',

  // Secondary text
  muted: '#A7B4C0',

  // Disabled / subtle text
  light: '#6F7D89',

  // Main brand / CTA
  primary: '#FF9900',

  // Dark orange
  primaryDark: '#E47911',

  // Soft orange
  primarySoft: '#3A2A18',

  // Supporting blue
  blue: '#62B5E5',

  // Soft blue
  blueSoft: '#1C3445',

  // Danger
  coral: '#F07870',

  // Soft danger
  coralSoft: '#422624',

  // Warning
  orange: '#FFB74D',

  // Soft warning
  orangeSoft: '#3C301E',

  // Success
  green: '#43B98D',

  // Soft success
  greenSoft: '#19382F',

  // Borders
  border: '#2B3A48',

  // Dividers
  divider: '#22313E',

  // Deep navy
  dark: '#0B121A',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
};
