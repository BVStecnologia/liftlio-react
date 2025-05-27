import { GlobalTheme } from './GlobalThemeSystem';

// Extensões para o tema para suportar propriedades legadas
export interface ExtendedTheme extends GlobalTheme {
  // Propriedades do tema antigo que ainda são usadas
  colors: GlobalTheme['colors'] & {
    primary: string;
    secondary: string;
    tertiary: string;
    primaryLight: string;
    primaryDark: string;
    tertiaryLight: string;
    tertiaryDark: string;
    background: string;
    white: string;
    lightGrey: string;
    grey: string;
    darkGrey: string;
    textLight: string;
    textSecondary: string;
    success: string;
    successLight: string;
    success_light: string;
    warning: string;
    warningLight: string;
    warning_light: string;
    error: string;
    errorLight: string;
    error_light: string;
    info: string;
    infoLight: string;
    info_light: string;
    ACCENT_LIGHT: string;
    dominant_light: string;
    dominant_lighter: string;
    lightBg: string;
    sentiment: {
      positive: string;
      neutral: string;
      negative: string;
    };
    gradient: {
      primary: string;
      secondary: string;
      accent: string;
      success: string;
      warning: string;
      error: string;
      info: string;
      glass: string;
      dark: string;
      hoverOverlay: string;
      landing: string;
    };
    chart: string[];
    
    // Landing page specific colors
    headerBg: string;
    headerBgSolid: string;
    cardBg: string;
    cardHoverBg: string;
    borderLight: string;
    badgeBg: string;
    badgeBorder: string;
    primaryAlpha: string;
    secondaryAlpha: string;
    shadowLarge: string;
    shadowMedium: string;
    shimmer: string;
    metricCardBg: string;
    floatingBg: string;
    floatingBorder: string;
    trustBg: string;
    featuresBg: string;
    statsBg: string;
    pricingBg: string;
    pricingFeaturedBg: string;
    testimonialsBg: string;
    ctaBg: string;
    footerBg: string;
  };
  
  // Propriedades estruturais do tema antigo
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    intense: string;
    hover: string;
    glow: string;
    glass: string;
    inner: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    pill: string;
    circle: string;
  };
  transitions: {
    default: string;
    fast: string;
    slow: string;
    springy: string;
    bounce: string;
    elastic: string;
  };
  fontSizes: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeights: {
    light: number;
    normal: number;
    regular: number;
    medium: number;
    semiBold: number;
    semibold: number;
    bold: number;
    extraBold: number;
  };
  zIndices: {
    base: number;
    elevated: number;
    dropdown: number;
    sticky: number;
    overlay: number;
    modal: number;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
}

// Função para estender o tema base com propriedades legadas
export function extendTheme(baseTheme: GlobalTheme): ExtendedTheme {
  const isLight = baseTheme.name === 'light';
  
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      // Cores principais
      primary: isLight ? '#2d3e50' : '#3B82F6',
      secondary: isLight ? '#0095FF' : '#8B5CF6',
      tertiary: isLight ? '#6B00CC' : '#10B981',
      primaryLight: isLight ? '#34495e' : '#60A5FA',
      primaryDark: isLight ? '#2c3e50' : '#2563EB',
      tertiaryLight: isLight ? '#8B33FF' : '#34D399',
      tertiaryDark: isLight ? '#5500AA' : '#059669',
      
      // Backgrounds
      background: baseTheme.colors.bg.primary,
      white: isLight ? '#FFFFFF' : '#0A0A0A',
      lightGrey: isLight ? '#F5F7FA' : '#1A1A1A',
      grey: isLight ? '#9CA3AF' : '#666666',
      darkGrey: isLight ? '#666666' : '#999999',
      lightBg: baseTheme.colors.bg.secondary,
      
      // Textos
      textLight: baseTheme.colors.text.secondary,
      textSecondary: baseTheme.colors.text.secondary,
      
      // Status (mantém compatibilidade)
      success: baseTheme.colors.status.success,
      successLight: baseTheme.colors.status.successBg,
      success_light: baseTheme.colors.status.successBg,
      warning: baseTheme.colors.status.warning,
      warningLight: baseTheme.colors.status.warningBg,
      warning_light: baseTheme.colors.status.warningBg,
      error: baseTheme.colors.status.error,
      errorLight: baseTheme.colors.status.errorBg,
      error_light: baseTheme.colors.status.errorBg,
      info: baseTheme.colors.status.info,
      infoLight: baseTheme.colors.status.infoBg,
      info_light: baseTheme.colors.status.infoBg,
      
      // Accent colors (mantém compatibilidade sem conflitar com accent object)
      ACCENT_LIGHT: isLight ? 'rgba(45, 62, 80, 0.1)' : 'rgba(0, 245, 255, 0.1)',
      dominant_light: isLight ? 'rgba(45, 62, 80, 0.08)' : 'rgba(0, 245, 255, 0.08)',
      dominant_lighter: isLight ? 'rgba(45, 62, 80, 0.04)' : 'rgba(0, 245, 255, 0.04)',
      
      // Sentiment
      sentiment: {
        positive: '#4CAF50',
        neutral: isLight ? '#FFAA15' : '#FFD700',
        negative: '#e74c3c'
      },
      
      // Gradients
      gradient: {
        primary: isLight 
          ? 'linear-gradient(135deg, #2d3e50 0%, #34495e 100%)'
          : 'linear-gradient(135deg, #00F5FF 0%, #FF00FF 100%)',
        secondary: isLight
          ? 'linear-gradient(135deg, #0095FF 0%, #00F5FF 100%)'
          : 'linear-gradient(135deg, #FF00FF 0%, #00FF00 100%)',
        accent: isLight
          ? 'linear-gradient(135deg, #6B00CC 0%, #8B33FF 100%)'
          : 'linear-gradient(135deg, #00F5FF 0%, #00C4CC 100%)',
        success: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
        warning: 'linear-gradient(135deg, #FFAA15 0%, #FFBB33 100%)',
        error: 'linear-gradient(135deg, #e74c3c 0%, #e57373 100%)',
        info: 'linear-gradient(135deg, #00A9DB 0%, #33BBEE 100%)',
        glass: isLight
          ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        dark: 'linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)',
        hoverOverlay: isLight
          ? 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)',
        landing: isLight
          ? 'linear-gradient(135deg, #2d3e50 0%, #0095FF 100%)'
          : 'linear-gradient(135deg, #00F5FF 0%, #FF00FF 100%)'
      },
      
      // Chart colors
      chart: [
        '#0095FF',
        '#00F5FF',
        '#FF00FF',
        '#00FF00',
        '#FFAA15',
        '#e74c3c',
        '#6B00CC',
        '#00A9DB'
      ],
      
      // Landing page specific
      headerBg: isLight
        ? 'rgba(255, 255, 255, 0.8)'
        : 'rgba(10, 10, 10, 0.8)',
      headerBgSolid: baseTheme.colors.bg.secondary,
      cardBg: baseTheme.components.card.bg,
      cardHoverBg: baseTheme.colors.bg.hover,
      borderLight: baseTheme.colors.border.secondary,
      badgeBg: isLight
        ? 'rgba(0, 149, 255, 0.1)'
        : 'rgba(0, 245, 255, 0.1)',
      badgeBorder: isLight
        ? 'rgba(0, 149, 255, 0.2)'
        : 'rgba(0, 245, 255, 0.2)',
      primaryAlpha: isLight
        ? 'rgba(45, 62, 80, 0.1)'
        : 'rgba(0, 245, 255, 0.1)',
      secondaryAlpha: isLight
        ? 'rgba(0, 149, 255, 0.1)'
        : 'rgba(255, 0, 255, 0.1)',
      shadowLarge: baseTheme.colors.shadow.xl,
      shadowMedium: baseTheme.colors.shadow.md,
      shimmer: isLight
        ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)'
        : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      metricCardBg: baseTheme.colors.bg.tertiary,
      floatingBg: baseTheme.colors.bg.secondary,
      floatingBorder: baseTheme.colors.border.primary,
      trustBg: baseTheme.colors.bg.tertiary,
      featuresBg: baseTheme.colors.bg.primary,
      statsBg: baseTheme.colors.bg.tertiary,
      pricingBg: baseTheme.colors.bg.primary,
      pricingFeaturedBg: isLight
        ? 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
        : 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
      testimonialsBg: baseTheme.colors.bg.tertiary,
      ctaBg: isLight
        ? 'linear-gradient(135deg, #2d3e50 0%, #34495e 100%)'
        : 'linear-gradient(135deg, #00F5FF 0%, #00C4CC 100%)',
      footerBg: isLight ? '#2d3e50' : '#0A0A0A'
    },
    
    // Estrutura do tema
    shadows: {
      sm: baseTheme.colors.shadow.sm,
      md: baseTheme.colors.shadow.md,
      lg: baseTheme.colors.shadow.lg,
      xl: baseTheme.colors.shadow.xl,
      intense: isLight
        ? '0 10px 40px rgba(0, 0, 0, 0.2)'
        : '0 10px 40px rgba(0, 0, 0, 0.5)',
      hover: isLight
        ? '0 4px 12px rgba(0, 0, 0, 0.08)'
        : '0 4px 12px rgba(255, 255, 255, 0.08)',
      glow: isLight
        ? '0 0 20px rgba(0, 149, 255, 0.3)'
        : '0 0 20px rgba(0, 245, 255, 0.3)',
      glass: isLight
        ? 'inset 0 2px 4px rgba(255, 255, 255, 0.1)'
        : 'inset 0 2px 4px rgba(255, 255, 255, 0.05)',
      inner: isLight
        ? 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
        : 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
    },
    
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      pill: '9999px',
      circle: '50%'
    },
    
    transitions: {
      default: 'all 0.2s ease',
      fast: 'all 0.1s ease',
      slow: 'all 0.3s ease',
      springy: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      bounce: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      elastic: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
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
      regular: 400,
      medium: 500,
      semiBold: 600,
      semibold: 600,
      bold: 700,
      extraBold: 800
    },
    
    zIndices: {
      base: 0,
      elevated: 1,
      dropdown: 1000,
      sticky: 1100,
      overlay: 1200,
      modal: 1300
    },
    
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem'
    }
  };
}