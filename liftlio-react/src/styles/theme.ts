import COLORS from './colors';
import { lightTheme as globalLight, darkTheme as globalDark } from './GlobalThemeSystem';

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
    regular: 400,    // Alias para normal
    medium: 500,
    semiBold: 600,
    semibold: 600,   // Alias para semiBold
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

// Light theme - mesclando com o sistema global
export const lightTheme = {
  ...baseTheme,
  ...globalLight,
  name: 'light',
  colors: {
    ...globalLight.colors,
    ...baseTheme.colors,
    // Cores principais
    background: '#F8F9FA',
    primary: '#2D3E50',
    secondary: '#6B00CC',
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
      light: '#9CA3AF'
    },
    textSecondary: '#666666',
    
    // Landing page específico
    gradient: {
      ...baseTheme.colors.gradient,
      landing: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)'
    },
    headerBg: 'rgba(248, 249, 250, 0.95)',
    headerBgSolid: 'rgba(248, 249, 250, 0.98)',
    cardBg: 'rgba(255, 255, 255, 0.8)',
    cardHoverBg: 'rgba(255, 255, 255, 0.95)',
    borderLight: 'rgba(0, 0, 0, 0.1)',
    badgeBg: 'rgba(0, 149, 255, 0.1)',
    badgeBorder: 'rgba(0, 149, 255, 0.3)',
    primaryAlpha: 'rgba(0, 0, 0, 0.05)',
    secondaryAlpha: 'rgba(107, 0, 204, 0.15)',
    shadowLarge: 'rgba(0, 0, 0, 0.1)',
    shadowMedium: 'rgba(0, 0, 0, 0.08)',
    shimmer: 'rgba(0, 0, 0, 0.05)',
    metricCardBg: 'rgba(0, 0, 0, 0.03)',
    floatingBg: 'rgba(107, 0, 204, 0.08)',
    floatingBorder: 'rgba(107, 0, 204, 0.2)',
    trustBg: 'rgba(0, 0, 0, 0.02)',
    featuresBg: '#FFFFFF',
    statsBg: 'linear-gradient(135deg, rgba(0, 149, 255, 0.03) 0%, rgba(107, 0, 204, 0.03) 100%)',
    pricingBg: '#F8F9FA',
    pricingFeaturedBg: 'rgba(0, 149, 255, 0.05)',
    testimonialsBg: 'rgba(0, 0, 0, 0.02)',
    ctaBg: 'linear-gradient(135deg, rgba(240, 240, 240, 0.5) 0%, rgba(248, 248, 248, 0.5) 100%)',
    footerBg: 'rgba(0, 0, 0, 0.04)'
  }
};

// Dark theme - mesclando com o sistema global
export const darkTheme = {
  ...baseTheme,
  ...globalDark,
  name: 'dark',
  colors: {
    ...globalDark.colors,
    ...baseTheme.colors,
    // Cores principais
    background: '#050505',
    primary: '#E0E0E0',
    secondary: '#8B00FF',
    text: {
      primary: '#FFFFFF',
      secondary: '#888888',
      light: '#D1D5DB'
    },
    textSecondary: '#888888',
    
    // Landing page específico
    gradient: {
      ...baseTheme.colors.gradient,
      landing: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
    },
    headerBg: 'rgba(5, 5, 5, 0.95)',
    headerBgSolid: 'rgba(5, 5, 5, 0.98)',
    cardBg: 'rgba(255, 255, 255, 0.02)',
    cardHoverBg: 'rgba(255, 255, 255, 0.05)',
    borderLight: 'rgba(255, 255, 255, 0.1)',
    badgeBg: 'rgba(0, 245, 255, 0.1)',
    badgeBorder: 'rgba(0, 245, 255, 0.3)',
    primaryAlpha: 'rgba(255, 255, 255, 0.05)',
    secondaryAlpha: 'rgba(139, 0, 255, 0.15)',
    shadowLarge: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.2)',
    shimmer: 'rgba(255, 255, 255, 0.1)',
    metricCardBg: 'rgba(255, 255, 255, 0.05)',
    floatingBg: 'rgba(139, 0, 255, 0.1)',
    floatingBorder: 'rgba(139, 0, 255, 0.3)',
    trustBg: 'rgba(255, 255, 255, 0.02)',
    featuresBg: 'rgba(0, 0, 0, 0.5)',
    statsBg: 'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(139, 0, 255, 0.05) 100%)',
    pricingBg: '#050505',
    pricingFeaturedBg: 'rgba(0, 245, 255, 0.05)',
    testimonialsBg: 'rgba(0, 0, 0, 0.5)',
    ctaBg: 'linear-gradient(135deg, rgba(20, 20, 20, 0.5) 0%, rgba(30, 30, 30, 0.5) 100%)',
    footerBg: 'rgba(0, 0, 0, 0.8)'
  }
};

// Export the original theme for backward compatibility
export const theme = baseTheme;