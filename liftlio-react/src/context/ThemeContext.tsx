import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme as baseLightTheme, darkTheme as baseDarkTheme, GlobalThemeStyles } from '../styles/GlobalThemeSystem';
import { PageSpecificStyles } from '../styles/pageSpecificStyles';
import { extendTheme, ExtendedTheme } from '../styles/themeExtensions';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: ExtendedTheme;
};

// Criar temas estendidos
const lightTheme = extendTheme(baseLightTheme);
const darkTheme = extendTheme(baseDarkTheme);

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleTheme: () => {},
  theme: darkTheme,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check if dark mode is stored in localStorage or use dark theme as default
  const getInitialThemeMode = (): boolean => {
    // Check for theme version to handle legacy users
    const themeVersion = localStorage.getItem('themeVersion');
    const currentVersion = 'v2'; // Increment this when you want to reset theme preferences
    
    // If it's a new version or no version, force dark theme
    if (themeVersion !== currentVersion) {
      localStorage.setItem('themeVersion', currentVersion);
      localStorage.setItem('darkMode', 'true');
      return true;
    }
    
    // Otherwise check saved preference
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedTheme !== null) {
      return savedTheme === 'true';
    }
    
    // If no preference, default to dark theme
    return true;
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialThemeMode());
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(
    localStorage.getItem('darkMode') !== null
  );
  
  // Initialize theme after component mounts
  useEffect(() => {
    // If user hasn't manually toggled, ensure dark theme is set
    if (!hasUserPreference) {
      setIsDarkMode(true);
      localStorage.setItem('darkMode', 'true');
    }
  }, [hasUserPreference]);

  // Removed time-based theme switching since we're defaulting to dark theme

  // Toggle between light and dark mode
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setHasUserPreference(true); // User has now set a preference
    localStorage.setItem('darkMode', newMode.toString());
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <StyledThemeProvider theme={theme}>
        <GlobalThemeStyles theme={theme} />
        <PageSpecificStyles theme={theme} />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);