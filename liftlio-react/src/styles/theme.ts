// Base theme object with shared properties
const baseTheme = {
  colors: {
    primary: '#2D1D42', // Dark purple (from sidebar)
    secondary: '#673AB7', // Medium purple
    tertiary: '#8561C5', // Light purple
    accent: '#9575CD', // Lavender accent
    background: '#f7f7f9', // Light background from reference
    white: '#ffffff',
    lightGrey: '#e9ecef',
    grey: '#ced4da',
    darkGrey: '#6c757d',
    text: '#1a1f36', // Darker for better contrast
    success: '#00C781', // Green from reference
    successLight: '#E7F7EF', // Light green for backgrounds
    warning: '#FFAA15', // Orange from reference
    warningLight: '#FFF5E5', // Light orange for backgrounds
    error: '#FF4040',   // Red from reference
    errorLight: '#FFEBEB', // Light red for backgrounds
    info: '#00A9DB',    // Blue from reference
    infoLight: '#E5F6FB', // Light blue for backgrounds
    sentiment: {
      positive: '#00C781',
      neutral: '#FFAA15',
      negative: '#FF4040'
    },
    gradient: {
      primary: 'linear-gradient(135deg, #2D1D42 0%, #673AB7 100%)',
      secondary: 'linear-gradient(135deg, #673AB7 0%, #9575CD 100%)',
      accent: 'linear-gradient(135deg, #673AB7 0%, #8561C5 100%)',
      success: 'linear-gradient(135deg, #00C781 0%, #82ffc9 100%)',
      warning: 'linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)',
      error: 'linear-gradient(135deg, #FF4040 0%, #ff9b9b 100%)',
      info: 'linear-gradient(135deg, #00A9DB 0%, #85DEFF 100%)',
      glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.3) 100%)',
      dark: 'linear-gradient(135deg, rgba(26, 31, 54, 0.95) 0%, rgba(26, 31, 54, 0.6) 100%)',
    },
    chart: [
      '#673AB7', '#9575CD', '#8561C5', '#7986CB', 
      '#00C781', '#FFAA15', '#FF4040', '#00A9DB'
    ]
  },
  shadows: {
    sm: '0 2px 10px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1)',
    md: '0 5px 15px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.1)',
    lg: '0 12px 24px rgba(0,0,0,0.09), 0 0 1px rgba(0,0,0,0.1)',
    xl: '0 20px 30px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)',
    intense: '0 10px 25px rgba(78, 14, 179, 0.25)',
    hover: '0 14px 28px rgba(78, 14, 179, 0.2), 0 10px 10px rgba(78, 14, 179, 0.1)',
    glow: '0 0 20px rgba(127, 60, 239, 0.3)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  radius: {
    sm: '6px',
    md: '12px',
    lg: '18px',
    xl: '28px',
    pill: '9999px',
    circle: '50%'
  },
  transitions: {
    default: '0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    fast: '0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
    slow: '0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
    springy: '0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: '0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: '0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6)'
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem'
  },
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800
  },
  zIndices: {
    base: 0,
    elevated: 1,
    dropdown: 10,
    sticky: 100,
    overlay: 1000,
    modal: 1100
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px'
  }
};

// Light theme - using the base theme
export const lightTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    background: '#f7f7f9',
    white: '#ffffff',
    text: '#1a1f36',
    lightGrey: '#e9ecef',
    grey: '#ced4da',
    darkGrey: '#6c757d',
  }
};

// Dark theme - custom dark version
export const darkTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    primary: '#351F4A',       // Slightly lighter dark purple for dark mode
    background: '#1a1f36',    // Dark background
    white: '#121212',         // Almost black
    text: '#f7f7f9',          // Light text
    lightGrey: '#2d3748',     // Darker grey
    grey: '#4a5568',          // Mid dark grey
    darkGrey: '#a0aec0',      // Lighter grey for dark mode
  }
};

// Export the original theme for backward compatibility
export const theme = baseTheme;