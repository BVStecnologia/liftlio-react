export const theme = {
  colors: {
    primary: '#5e35b1',
    secondary: '#8561c5',
    tertiary: '#7D4CDB',
    background: '#f5f7f9',
    white: '#ffffff',
    lightGrey: '#e9ecef',
    grey: '#ced4da',
    darkGrey: '#6c757d',
    text: '#2c3e50',
    success: '#00C781', // Brighter green
    warning: '#FFAA15', // Warmer orange
    error: '#FF4040',   // Brighter red
    info: '#00A9DB',    // Brighter blue
    sentiment: {
      positive: '#00C781',
      neutral: '#FFAA15',
      negative: '#FF4040'
    },
    gradient: {
      primary: 'linear-gradient(135deg, #5e35b1 0%, #8561c5 100%)',
      success: 'linear-gradient(135deg, #00C781 0%, #82ffc9 100%)',
      warning: 'linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)',
      error: 'linear-gradient(135deg, #FF4040 0%, #ff9b9b 100%)',
    },
    chart: [
      '#5e35b1', '#8561c5', '#00C781', '#FFAA15', 
      '#FF4040', '#00A9DB', '#7D4CDB', '#6FFFB0'
    ]
  },
  shadows: {
    sm: '0 2px 8px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    lg: '0 12px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.05)',
    xl: '0 20px 30px rgba(0,0,0,0.1), 0 6px 12px rgba(0,0,0,0.05)',
    intense: '0 10px 25px rgba(94, 53, 177, 0.25)',
    hover: '0 14px 28px rgba(94, 53, 177, 0.25), 0 10px 10px rgba(94, 53, 177, 0.1)'
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    circle: '50%'
  },
  transitions: {
    default: '0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    fast: '0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
    slow: '0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
    springy: '0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
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