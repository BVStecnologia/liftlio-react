// Base theme object with shared properties
const baseTheme = {
  colors: {
    // PALETA DE CORES PRINCIPAL
    primary: '#2d3e50',     // Azul escuro naval (accent) - 10%
    secondary: '#ffffff',   // Branco - 30%
    tertiary: '#a5b1b7',    // Cinza médio (dominant) - 60%
    
    // Cores derivadas para animações e estados
    primaryLight: '#34495e', // accentLight
    primaryDark: '#243444',  // accentDark
    tertiaryLight: '#c9d1d6', // dominantLight
    tertiaryDark: '#8a969c',  // dominantDark
    
    // Cores de background e texto
    background: '#a5b1b7',   // dominant como background principal
    white: '#ffffff',
    lightGrey: '#c9d1d6',    // dominantLight
    grey: '#a5b1b7',         // dominant
    darkGrey: '#8a969c',     // dominantDark
    text: '#2d3e50',        // accent para texto
    
    // Cores semânticas
    success: '#4CAF50',     // Verde para métricas positivas
    successLight: '#E7F7EF', 
    warning: '#FFAA15',     // Laranja para avisos
    warningLight: '#FFF5E5',
    error: '#e74c3c',       // Vermelho para métricas negativas
    errorLight: '#FFEBEB',
    info: '#00A9DB',
    infoLight: '#E5F6FB',
    
    sentiment: {
      positive: '#4CAF50',  // Verde para sentimento positivo
      neutral: '#a5b1b7',   // Cinza (dominant) para neutro
      negative: '#e74c3c'   // Vermelho para negativo
    },
    
    gradient: {
      primary: 'linear-gradient(135deg, #243444 0%, #2d3e50 100%)',
      secondary: 'linear-gradient(135deg, #8a969c 0%, #a5b1b7 100%)',
      accent: 'linear-gradient(135deg, #2d3e50 0%, #34495e 100%)',
      success: 'linear-gradient(135deg, #4CAF50 0%, #81c784 100%)',
      warning: 'linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)',
      error: 'linear-gradient(135deg, #e74c3c 0%, #e57373 100%)',
      info: 'linear-gradient(135deg, #00A9DB 0%, #85DEFF 100%)',
      glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.3) 100%)',
      dark: 'linear-gradient(135deg, rgba(45, 62, 80, 0.95) 0%, rgba(45, 62, 80, 0.6) 100%)',
      hoverOverlay: 'rgba(255, 255, 255, 0.1)'
    },
    
    chart: [
      '#2d3e50', '#a5b1b7', '#ffffff', '#34495e', 
      '#4CAF50', '#e74c3c', '#FFAA15', '#00A9DB'
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

// Light theme - usando o tema base
export const lightTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    // Mantém as cores da nova paleta
    background: '#a5b1b7',    // Cinza médio (dominant)
    white: '#ffffff',         // Branco
    text: '#2d3e50',          // Azul escuro naval (accent)
    lightGrey: '#c9d1d6',     // dominantLight
    grey: '#a5b1b7',          // dominant
    darkGrey: '#8a969c',      // dominantDark
  }
};

// Dark theme - versão escura personalizada
export const darkTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    primary: '#34495e',       // Versão mais clara do azul escuro naval (accentLight)
    background: '#243444',    // Versão escura do azul naval (accentDark)
    white: '#2d3e50',         // Azul escuro naval (accent)
    text: '#ffffff',          // Texto branco
    lightGrey: '#34495e',     // accentLight
    grey: '#2d3e50',          // accent
    darkGrey: '#a5b1b7',      // dominant (cinza) para contraste no dark mode
  }
};

// Export the original theme for backward compatibility
export const theme = baseTheme;