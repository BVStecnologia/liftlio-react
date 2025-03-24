/**
 * Global Color System - LIFTLIO
 * -------------------------------------------------
 * This file implements the 60:30:10 color rule for Liftlio's UI color scheme.
 * 
 * The 60:30:10 rule is a design principle for creating a balanced color palette:
 * - 60%: Dominant color (Cinza médio #a5b1b7) - Used for backgrounds, borders, non-focal UI elements
 * - 30%: Secondary color (Branco #ffffff) - Used for card backgrounds, content areas 
 * - 10%: Accent color (Azul naval escuro #2d3e50) - Used for interactive elements, headings, emphasis
 * 
 * This approach creates visual hierarchy and ensures a cohesive design throughout the application.
 * 
 * Usage:
 * - Import COLORS directly for basic color values: import COLORS from './styles/colors';
 * - Import COLOR_USAGE for semantic usage guidance: import { COLOR_USAGE } from './styles/colors';
 */

// Primary palette (base colors)
export const COLORS = {
  // Base 60:30:10 palette
  DOMINANT: '#e6edf2',    // Cinza mais claro - 60% of UI (suavizado)
  SECONDARY: '#ffffff',   // Branco - 30% of UI
  ACCENT: '#2d3e50',      // Azul naval escuro - 10% of UI

  // Variations of the dominant color (Cinza claro)
  DOMINANT_LIGHT: '#edf3f7',  // Lighter variant for subtle differentiation
  DOMINANT_LIGHTER: '#f5f9fc', // Very light variant for hover states on light backgrounds
  DOMINANT_DARK: '#b5c2cb',   // Darker variant for text on light backgrounds
  
  // Variations of the accent color (Azul naval escuro)
  ACCENT_LIGHT: '#34495e',    // Lighter variant for hover states
  ACCENT_LIGHTER: '#4e6785',  // Very light variant for subtle accents
  ACCENT_DARK: '#243444',     // Darker variant for active states
  
  // Text colors for different backgrounds
  TEXT: {
    ON_LIGHT: '#2d3e50',      // Text on light backgrounds (white, light gray)
    ON_DARK: '#ffffff',       // Text on dark backgrounds (accent, dark gray)
    SECONDARY: '#8a969c',     // Secondary text, subtitles, captions
    DISABLED: '#c9d1d6',      // Disabled text elements
  },
  
  // Semantic colors - used sparingly for specific meanings
  SUCCESS: '#4CAF50',         // Green - positive actions, success messages
  WARNING: '#FFAA15',         // Orange - warnings, notices requiring attention
  ERROR: '#e74c3c',           // Red - errors, destructive actions
  INFO: '#00A9DB',            // Blue - informational messages
  
  // Semantic light variations - for backgrounds or subtle indicators
  SUCCESS_LIGHT: '#E7F7EF',   // Light green background
  WARNING_LIGHT: '#FFF5E5',   // Light orange background
  ERROR_LIGHT: '#FFEBEB',     // Light red background
  INFO_LIGHT: '#E5F6FB',      // Light blue background
  
  // Border colors for different states
  BORDER: {
    DEFAULT: 'rgba(165, 177, 183, 0.2)', // Default border based on dominant color
    HOVER: 'rgba(165, 177, 183, 0.4)',   // Border on hover states
    FOCUS: '#2d3e50',                   // Border for focused elements (accent color)
    ERROR: '#e74c3c',                   // Border for error states
  },
  
  // Shadow colors for different elevations
  SHADOW: {
    LIGHT: '0 3px 6px rgba(0, 0, 0, 0.06)',
    MEDIUM: '0 6px 12px rgba(0, 0, 0, 0.1)',
    STRONG: '0 10px 20px rgba(0, 0, 0, 0.15)',
  },
  
  // Gradients - for buttons, highlights, and visual interest
  GRADIENT: {
    PRIMARY: 'linear-gradient(135deg, #243444 0%, #2d3e50 100%)',  // Accent gradient
    SECONDARY: 'linear-gradient(135deg, #8a969c 0%, #a5b1b7 100%)', // Dominant gradient
    SUCCESS: 'linear-gradient(135deg, #4CAF50 0%, #81c784 100%)',
    WARNING: 'linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)',
    ERROR: 'linear-gradient(135deg, #e74c3c 0%, #e57373 100%)',
    INFO: 'linear-gradient(135deg, #00A9DB 0%, #85DEFF 100%)',
    GLASS: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 100%)',
    DARK: 'linear-gradient(135deg, rgba(45, 62, 80, 0.95) 0%, rgba(45, 62, 80, 0.7) 100%)',
    HEADER: 'linear-gradient(90deg, #2d3e50 0%, #34495e 100%)', // For sidebar headers
    CARD_TOP: 'linear-gradient(90deg, #2d3e5095 0%, #2d3e5050 100%)' // Enhanced card top accent
  },
  
  // Specific component colors
  COMPONENTS: {
    CARD: {
      BACKGROUND: '#ffffff',              // Card background (secondary color - 30%)
      BORDER: 'rgba(181, 194, 203, 0.2)', // Subtle border based on new dominant dark color
      SHADOW: '0 3px 6px rgba(0, 0, 0, 0.04)', // Lighter shadow for less contrast
      HOVER_SHADOW: '0 6px 12px rgba(0, 0, 0, 0.08)', // Lighter hover shadow
    },
    SIDEBAR: {
      BACKGROUND: '#2d3e50',              // Sidebar background (accent color - 10%)
      ITEM_HOVER: 'rgba(255, 255, 255, 0.08)', // Sidebar item hover
      ITEM_ACTIVE: 'rgba(255, 255, 255, 0.12)', // Sidebar active item
      TEXT: 'rgba(255, 255, 255, 0.7)',    // Sidebar text
      TEXT_ACTIVE: '#ffffff',              // Sidebar active text
      BORDER: 'rgba(255, 255, 255, 0.1)',  // Sidebar dividers
    },
    HEADER: {
      BACKGROUND: '#ffffff',               // Header background (secondary color - 30%)
      BORDER: 'rgba(165, 177, 183, 0.2)',  // Header border (based on dominant color - 60%)
    },
    TABLE: {
      HEADER: '#e6eaed',                   // Table header background (dominant lighter - 60%)
      ROW_HOVER: 'rgba(165, 177, 183, 0.1)', // Table row hover
      BORDER: 'rgba(165, 177, 183, 0.2)',   // Table borders
    }
  }
};

/**
 * COLOR_USAGE provides semantic guidance for applying the 60:30:10 rule consistently
 * across the application. This helps maintain design cohesion and makes it easier
 * to understand the purpose of each color in the UI.
 */
export const COLOR_USAGE = {
  // 60% - Dominant (Cinza médio)
  DOMINANT: {
    BACKGROUNDS: COLORS.DOMINANT,      // Main application background
    DIVIDERS: COLORS.DOMINANT_LIGHT,   // Section dividers, borders, separators
    INACTIVE: COLORS.DOMINANT_DARK,    // Inactive states, disabled elements
    TEXT_SECONDARY: COLORS.DOMINANT_DARK, // Secondary text, labels, captions
  },
  
  // 30% - Secondary (Branco)
  SECONDARY: {
    CARD_BG: COLORS.SECONDARY,         // Card backgrounds, containers
    CONTENT_AREAS: COLORS.SECONDARY,   // Content areas, main sections
    FORM_FIELDS: COLORS.SECONDARY,     // Form input backgrounds, text areas
  },
  
  // 10% - Accent (Azul naval escuro)
  ACCENT: {
    HEADINGS: COLORS.ACCENT,           // Important headings, titles
    BUTTONS: COLORS.ACCENT,            // Primary buttons, key actions
    LINKS: COLORS.ACCENT,              // Hyperlinks, navigation elements
    ICONS: COLORS.ACCENT,              // Icon highlights, key visual elements
    HOVER: COLORS.ACCENT_LIGHT,        // Hover states for interactive elements
  }
};

// Helper function to apply opacity to hex colors
export const withOpacity = (color: string, opacity: number): string => {
  // Make sure opacity is between 0 and 1
  const validOpacity = Math.max(0, Math.min(1, opacity));
  
  // Convert opacity to hex
  const opacityHex = Math.round(validOpacity * 255).toString(16).padStart(2, '0');
  
  // Return color with opacity
  return `${color}${opacityHex}`;
};

export default COLORS;