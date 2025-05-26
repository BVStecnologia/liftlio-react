import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../styles/theme';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof lightTheme;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: lightTheme,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check if dark mode is stored in localStorage or use time-based preference
  const getInitialThemeMode = (): boolean => {
    // First check if user has manually set a preference
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedTheme !== null) {
      return savedTheme === 'true';
    }
    
    // If no preference, use time-based theme
    // Dark mode from 18:00 (6 PM) to 06:00 (6 AM)
    const currentHour = new Date().getHours();
    return currentHour >= 18 || currentHour < 6;
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialThemeMode());
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(
    localStorage.getItem('darkMode') !== null
  );
  
  // Initialize theme after component mounts
  useEffect(() => {
    // Only set based on time if user hasn't manually toggled
    if (!hasUserPreference) {
      const currentHour = new Date().getHours();
      const shouldBeDark = currentHour >= 18 || currentHour < 6;
      setIsDarkMode(shouldBeDark);
    }
  }, [hasUserPreference]);

  // Check time periodically to update theme if user hasn't set preference
  useEffect(() => {
    if (!hasUserPreference) {
      const checkTime = () => {
        const currentHour = new Date().getHours();
        const shouldBeDark = currentHour >= 18 || currentHour < 6;
        if (shouldBeDark !== isDarkMode) {
          setIsDarkMode(shouldBeDark);
        }
      };

      // Check every minute
      const interval = setInterval(checkTime, 60000);
      
      return () => clearInterval(interval);
    }
  }, [hasUserPreference, isDarkMode]);

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
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);