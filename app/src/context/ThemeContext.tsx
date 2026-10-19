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
  softPrimary: string;

  blue: string;
  blueSoft: string;

  coral: string;
  coralSoft: string;

  orange: string;
  orangeSoft: string;

  green: string;
  greenSoft: string;

  success: string;
  successSoft: string;

  danger: string;
  dangerSoft: string;

  warning: string;
  warningSoft: string;

  input: string;

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
  background: '#F7F6F2',

  // Cards and surfaces
  white: '#FFFFFF',
  everWhite: '#FFFFFF',

  // Text
  ink: '#242720',
  text: '#242720',
  muted: '#777D72',
  light: '#A7ADA4',

  // Primary brand — warm earthy brown
  primary: '#A47745',
  primaryDark: '#805A32',
  primarySoft: '#F5EDE2',
  softPrimary: '#F5EDE2',

  // Supporting colours
  blue: '#4FA3D1',
  blueSoft: '#E8F4FA',

  // Coral
  coral: '#C34D4D',
  coralSoft: '#FCECEC',

  // Warning orange
  orange: '#A66C13',
  orangeSoft: '#FFF3D9',

  // Success green
  green: '#238653',
  greenSoft: '#E7F5EC',

  // Status colours
  success: '#238653',
  successSoft: '#E7F5EC',

  danger: '#C34D4D',
  dangerSoft: '#FCECEC',

  warning: '#A66C13',
  warningSoft: '#FFF3D9',

  // Inputs
  input: '#FFFFFF',

  // Borders and dividers
  border: '#E6E5DD',
  divider: '#ECEBE5',

  // Dark surface
  dark: '#242720',
};

const darkTheme: Theme = {
  // Main background
  background: '#151715',

  // Cards and surfaces
  white: '#202320',
  everWhite: '#FFFFFF',

  // Text
  ink: '#F4F4EF',
  text: '#F4F4EF',
  muted: '#A7ADA4',
  light: '#777D72',

  // Primary brand — warm earthy brown
  primary: '#A47745',
  primaryDark: '#C29460',
  primarySoft: '#3A3025',
  softPrimary: '#3A3025',

  // Supporting colours
  blue: '#62B5E5',
  blueSoft: '#1C3445',

  // Coral
  coral: '#F07870',
  coralSoft: '#3D2525',

  // Warning orange
  orange: '#FFB74D',
  orangeSoft: '#3D3320',

  // Success green
  green: '#43B98D',
  greenSoft: '#1D3829',

  // Status colours
  success: '#238653',
  successSoft: '#1D3829',

  danger: '#C34D4D',
  dangerSoft: '#3D2525',

  warning: '#A66C13',
  warningSoft: '#3D3320',

  // Inputs
  input: '#202320',

  // Borders and dividers
  border: '#3A4039',
  divider: '#2B302A',

  // Dark surface
  dark: '#0D100D',
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
