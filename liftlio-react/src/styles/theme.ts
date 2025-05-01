import COLORS from './colors';

// Base theme object with shared properties
const baseTheme = {
  colors: {
    // PALETA DE CORES PRINCIPAL
    primary: COLORS.ACCENT,         // Azul escuro naval (accent) - 10%
    secondary: COLORS.SECONDARY,    // Branco - 30%
    tertiary: COLORS.DOMINANT,      // Cinza médio (dominant) - 60%
    
    // Cores derivadas para animações e estados
    primaryLight: COLORS.ACCENT_LIGHT,
    primaryDark: COLORS.ACCENT_DARK,
    tertiaryLight: COLORS.DOMINANT_LIGHT,
    tertiaryDark: COLORS.DOMINANT_DARK,
    
    // Cores de background e texto
    background: COLORS.DOMINANT,    // dominant como background principal
    white: COLORS.SECONDARY,
    lightGrey: COLORS.DOMINANT_LIGHT,
    grey: COLORS.DOMINANT,          // dominant
    darkGrey: COLORS.DOMINANT_DARK,
    text: {
      primary: COLORS.ACCENT,
      secondary: COLORS.TEXT.SECONDARY,
      light: COLORS.TEXT.ON_LIGHT
    },
    textLight: COLORS.TEXT.ON_LIGHT,
    
    // Cores semânticas
    success: COLORS.SUCCESS,        // Verde para métricas positivas
    successLight: COLORS.SUCCESS_LIGHT,
    success_light: COLORS.SUCCESS_LIGHT, // Alias para compatibilidade
    warning: COLORS.WARNING,        // Laranja para avisos
    warningLight: COLORS.WARNING_LIGHT,
    warning_light: COLORS.WARNING_LIGHT, // Alias para compatibilidade
    error: COLORS.ERROR,            // Vermelho para métricas negativas
    errorLight: COLORS.ERROR_LIGHT,
    error_light: COLORS.ERROR_LIGHT, // Alias para compatibilidade
    info: COLORS.INFO,
    infoLight: COLORS.INFO_LIGHT,
    info_light: COLORS.INFO_LIGHT, // Alias para compatibilidade
    
    // Cores do tema accent
    accent: COLORS.ACCENT,
    ACCENT_LIGHT: COLORS.ACCENT_LIGHT,
    dominant_light: COLORS.DOMINANT_LIGHT,
    dominant_lighter: COLORS.DOMINANT_LIGHTER,
    lightBg: COLORS.DOMINANT_LIGHTER,
    
    sentiment: {
      positive: COLORS.SUCCESS,     // Verde para sentimento positivo
      neutral: COLORS.DOMINANT,     // Cinza (dominant) para neutro
      negative: COLORS.ERROR        // Vermelho para negativo
    },
    
    gradient: {
      primary: COLORS.GRADIENT.PRIMARY,
      secondary: COLORS.GRADIENT.SECONDARY,
      accent: COLORS.GRADIENT.PRIMARY,
      success: COLORS.GRADIENT.SUCCESS,
      warning: COLORS.GRADIENT.WARNING,
      error: COLORS.GRADIENT.ERROR,
      info: COLORS.GRADIENT.INFO,
      glass: COLORS.GRADIENT.GLASS,
      dark: COLORS.GRADIENT.DARK,
      hoverOverlay: 'rgba(255, 255, 255, 0.1)'
    },
    
    chart: [
      '#2196F3', '#FF7A30', '#673AB7', '#4CAF50', // Cores para gráficos 
      COLORS.SUCCESS, COLORS.ERROR, COLORS.WARNING, COLORS.INFO
    ]
  },
  shadows: {
    sm: '0 2px 10px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1)',
    md: '0 5px 15px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.1)',
    lg: '0 12px 24px rgba(0,0,0,0.09), 0 0 1px rgba(0,0,0,0.1)',
    xl: '0 20px 30px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)',
    intense: '0 10px 25px rgba(45, 62, 80, 0.25)',
    hover: '0 14px 28px rgba(45, 62, 80, 0.2), 0 10px 10px rgba(45, 62, 80, 0.1)',
    glow: '0 0 20px rgba(45, 62, 80, 0.3)',
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
    default: 'all 0.3s ease',
    fast: 'all 0.2s ease',
    slow: 'all 0.5s ease',
    springy: 'all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
    bounce: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    elastic: 'all 0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6)'
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
    background: COLORS.DOMINANT,    // Cinza médio (dominant)
    white: COLORS.SECONDARY,        // Branco
    text: {
      primary: COLORS.ACCENT,      // Azul escuro naval (accent)
      secondary: COLORS.TEXT.SECONDARY,
      light: COLORS.TEXT.ON_LIGHT
    },
    lightGrey: COLORS.DOMINANT_LIGHT,
    grey: COLORS.DOMINANT,         // dominant
    darkGrey: COLORS.DOMINANT_DARK,
  }
};

// Dark theme - versão escura personalizada
export const darkTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    primary: COLORS.ACCENT_LIGHT,    // Versão mais clara do azul escuro naval
    background: COLORS.ACCENT_DARK,  // Versão escura do azul naval
    white: COLORS.ACCENT,            // Azul escuro naval (accent)
    text: {
      primary: COLORS.SECONDARY,    // Texto branco
      secondary: COLORS.TEXT.SECONDARY,
      light: COLORS.TEXT.ON_LIGHT
    },
    lightGrey: COLORS.ACCENT_LIGHT,
    grey: COLORS.ACCENT,             // accent
    darkGrey: COLORS.DOMINANT,       // dominant (cinza) para contraste no dark mode
  }
};

// Export the original theme for backward compatibility
export const theme = baseTheme;