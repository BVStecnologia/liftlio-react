import 'styled-components';
import { theme } from './theme';

type Theme = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {
    colors: {
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
      text: {
        primary: string;
        secondary: string;
        light: string;
      };
      textLight: string;
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
      accent: string;
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
      };
      chart: string[];
    };
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
} 