/**
 * SISTEMA GLOBAL DE TEMAS - LIFTLIO
 * =================================
 * Este arquivo controla TODOS os estilos da aplicação
 * Qualquer componente novo automaticamente herda estes estilos
 */

import { createGlobalStyle } from 'styled-components';

export interface GlobalTheme {
  name: 'light' | 'dark';
  
  // Cores Base
  colors: {
    // Backgrounds principais
    bg: {
      primary: string;      // Fundo principal da aplicação
      secondary: string;    // Fundo de cards e containers
      tertiary: string;     // Fundo de elementos aninhados
      overlay: string;      // Fundo de modais overlay
      hover: string;        // Hover em elementos
      active: string;       // Elementos ativos/selecionados
    };
    
    // Textos
    text: {
      primary: string;      // Texto principal
      secondary: string;    // Texto secundário
      muted: string;        // Texto desabilitado
      inverse: string;      // Texto inverso (em fundos coloridos)
      link: string;         // Links
      linkHover: string;    // Links hover
    };
    
    // Bordas
    border: {
      primary: string;      // Borda principal
      secondary: string;    // Borda secundária
      focus: string;        // Borda de foco
      divider: string;      // Linhas divisórias
    };
    
    // Status
    status: {
      success: string;
      successBg: string;
      warning: string;
      warningBg: string;
      error: string;
      errorBg: string;
      info: string;
      infoBg: string;
    };
    
    // Cores especiais
    accent: {
      primary: string;      // Cor principal da marca
      secondary: string;    // Cor secundária
      tertiary: string;     // Cor terciária
    };
    
    // Sombras
    shadow: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  
  // Componentes específicos
  components: {
    // Sidebar
    sidebar: {
      bg: string;
      itemBg: string;
      itemHover: string;
      itemActive: string;
      text: string;
      textActive: string;
      border: string;
    };
    
    // Header
    header: {
      bg: string;
      border: string;
      text: string;
    };
    
    // Modal
    modal: {
      bg: string;
      overlay: string;
      border: string;
      shadow: string;
    };
    
    // Input
    input: {
      bg: string;
      border: string;
      borderFocus: string;
      text: string;
      placeholder: string;
      disabled: string;
    };
    
    // Button
    button: {
      primary: {
        bg: string;
        text: string;
        border: string;
        hover: string;
        disabled: string;
      };
      secondary: {
        bg: string;
        text: string;
        border: string;
        hover: string;
        disabled: string;
      };
      ghost: {
        bg: string;
        text: string;
        border: string;
        hover: string;
      };
    };
    
    // Table
    table: {
      headerBg: string;
      rowBg: string;
      rowHover: string;
      border: string;
    };
    
    // Card
    card: {
      bg: string;
      border: string;
      shadow: string;
    };
  };
}

// TEMA CLARO
export const lightTheme: GlobalTheme = {
  name: 'light',
  
  colors: {
    bg: {
      primary: '#F8F9FA',
      secondary: '#FFFFFF',
      tertiary: '#F5F7FA',
      overlay: 'rgba(0, 0, 0, 0.5)',
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)'
    },
    
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
      muted: '#9CA3AF',
      inverse: '#FFFFFF',
      link: '#0095FF',
      linkHover: '#0077CC'
    },
    
    border: {
      primary: 'rgba(0, 0, 0, 0.08)',
      secondary: 'rgba(0, 0, 0, 0.05)',
      focus: '#0095FF',
      divider: 'rgba(0, 0, 0, 0.06)'
    },
    
    status: {
      success: '#4CAF50',
      successBg: 'rgba(76, 175, 80, 0.12)',
      warning: '#FFAA15',
      warningBg: 'rgba(255, 170, 21, 0.12)',
      error: '#e74c3c',
      errorBg: 'rgba(231, 76, 60, 0.12)',
      info: '#00A9DB',
      infoBg: 'rgba(0, 169, 219, 0.12)'
    },
    
    accent: {
      primary: '#2d3e50',
      secondary: '#0095FF',
      tertiary: '#6B00CC'
    },
    
    shadow: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
      md: '0 2px 8px rgba(0, 0, 0, 0.08)',
      lg: '0 4px 12px rgba(0, 0, 0, 0.1)',
      xl: '0 8px 24px rgba(0, 0, 0, 0.12)'
    }
  },
  
  components: {
    sidebar: {
      bg: '#2d3e50',
      itemBg: 'transparent',
      itemHover: 'rgba(255, 255, 255, 0.08)',
      itemActive: 'rgba(255, 255, 255, 0.15)',  // Cinza claro com transparência
      text: 'rgba(255, 255, 255, 0.8)',         // Texto mais visível
      textActive: '#FFFFFF',
      border: 'rgba(255, 255, 255, 0.1)'
    },
    
    header: {
      bg: '#FFFFFF',
      border: 'rgba(0, 0, 0, 0.08)',
      text: '#1A1A1A'
    },
    
    modal: {
      bg: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
      border: 'rgba(0, 0, 0, 0.08)',
      shadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
    },
    
    input: {
      bg: '#FFFFFF',
      border: 'rgba(0, 0, 0, 0.15)',
      borderFocus: '#0095FF',
      text: '#1A1A1A',
      placeholder: '#9CA3AF',
      disabled: '#F5F7FA'
    },
    
    button: {
      primary: {
        bg: '#2d3e50',
        text: '#FFFFFF',
        border: 'transparent',
        hover: '#34495e',
        disabled: 'rgba(45, 62, 80, 0.5)'
      },
      secondary: {
        bg: 'transparent',
        text: '#2d3e50',
        border: 'rgba(0, 0, 0, 0.15)',
        hover: 'rgba(0, 0, 0, 0.05)',
        disabled: 'rgba(0, 0, 0, 0.05)'
      },
      ghost: {
        bg: 'transparent',
        text: '#666666',
        border: 'transparent',
        hover: 'rgba(0, 0, 0, 0.05)'
      }
    },
    
    table: {
      headerBg: '#F5F7FA',
      rowBg: '#FFFFFF',
      rowHover: 'rgba(0, 0, 0, 0.04)',
      border: 'rgba(0, 0, 0, 0.06)'
    },
    
    card: {
      bg: '#FFFFFF',
      border: 'rgba(0, 0, 0, 0.08)',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    }
  }
};

// TEMA ESCURO
export const darkTheme: GlobalTheme = {
  name: 'dark',
  
  colors: {
    bg: {
      primary: '#0F0F0F',      // Fundo principal mais suave
      secondary: '#1A1A1A',    // Cards e containers
      tertiary: '#252525',     // Elementos aninhados
      overlay: 'rgba(0, 0, 0, 0.8)',
      hover: 'rgba(255, 255, 255, 0.08)',
      active: 'rgba(255, 255, 255, 0.12)'
    },
    
    text: {
      primary: '#E4E4E7',      // Texto principal mais suave
      secondary: 'rgba(228, 228, 231, 0.6)',  // Texto secundário
      muted: 'rgba(228, 228, 231, 0.4)',      // Texto desabilitado
      inverse: '#0F0F0F',
      link: 'rgba(255, 255, 255, 0.8)',         // Cinza claro para links
      linkHover: '#FFFFFF'     // Branco no hover
    },
    
    border: {
      primary: 'rgba(255, 255, 255, 0.08)',
      secondary: 'rgba(255, 255, 255, 0.05)',
      focus: 'rgba(255, 255, 255, 0.3)',
      divider: 'rgba(255, 255, 255, 0.06)'
    },
    
    status: {
      success: '#66BB6A',
      successBg: 'rgba(102, 187, 106, 0.15)',
      warning: '#FFB74D',
      warningBg: 'rgba(255, 183, 77, 0.15)',
      error: '#FF5252',
      errorBg: 'rgba(255, 82, 82, 0.15)',
      info: '#29B6F6',
      infoBg: 'rgba(41, 182, 246, 0.15)'
    },
    
    accent: {
      primary: 'rgba(255, 255, 255, 0.8)',      // Cinza claro
      secondary: 'rgba(255, 255, 255, 0.6)',    // Cinza médio
      tertiary: 'rgba(255, 255, 255, 0.4)'      // Cinza suave
    },
    
    shadow: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
      md: '0 2px 8px rgba(0, 0, 0, 0.4)',
      lg: '0 4px 12px rgba(0, 0, 0, 0.5)',
      xl: '0 8px 24px rgba(0, 0, 0, 0.6)'
    }
  },
  
  components: {
    sidebar: {
      bg: '#1A1A1A',
      itemBg: 'transparent',
      itemHover: 'rgba(255, 255, 255, 0.05)',
      itemActive: 'rgba(255, 255, 255, 0.08)',  // Cinza com transparência sutil
      text: 'rgba(228, 228, 231, 0.6)',
      textActive: '#E4E4E7',
      border: 'rgba(255, 255, 255, 0.08)'
    },
    
    header: {
      bg: '#1A1A1A',
      border: 'rgba(255, 255, 255, 0.08)',
      text: '#E4E4E7'
    },
    
    modal: {
      bg: '#1A1A1A',
      overlay: 'rgba(0, 0, 0, 0.8)',
      border: 'rgba(255, 255, 255, 0.1)',
      shadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
    },
    
    input: {
      bg: '#242424',
      border: 'rgba(255, 255, 255, 0.2)',
      borderFocus: '#00F5FF',
      text: '#FFFFFF',
      placeholder: 'rgba(255, 255, 255, 0.5)',
      disabled: '#1A1A1A'
    },
    
    button: {
      primary: {
        bg: '#00F5FF',
        text: '#0A0A0A',
        border: 'transparent',
        hover: '#00C4CC',
        disabled: 'rgba(0, 245, 255, 0.3)'
      },
      secondary: {
        bg: 'transparent',
        text: '#00F5FF',
        border: 'rgba(255, 255, 255, 0.2)',
        hover: 'rgba(255, 255, 255, 0.08)',
        disabled: 'rgba(255, 255, 255, 0.05)'
      },
      ghost: {
        bg: 'transparent',
        text: 'rgba(255, 255, 255, 0.7)',
        border: 'transparent',
        hover: 'rgba(255, 255, 255, 0.08)'
      }
    },
    
    table: {
      headerBg: 'rgba(255, 255, 255, 0.03)',
      rowBg: '#1A1A1A',
      rowHover: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.08)'
    },
    
    card: {
      bg: '#1A1A1A',
      border: 'rgba(255, 255, 255, 0.1)',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
    }
  }
};

// ESTILOS GLOBAIS
export const GlobalThemeStyles = createGlobalStyle<{ theme: GlobalTheme }>`
  /* Reset e Base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    background-color: ${props => props.theme.colors.bg.primary};
    color: ${props => props.theme.colors.text.primary};
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  /* Aplicar tema em TODOS os elementos */
  
  /* Modais */
  .modal, [role="dialog"], .MuiDialog-paper {
    background-color: ${props => props.theme.components.modal.bg} !important;
    color: ${props => props.theme.colors.text.primary} !important;
    border: 1px solid ${props => props.theme.components.modal.border} !important;
  }
  
  /* Overlays */
  .modal-overlay, .MuiBackdrop-root {
    background-color: ${props => props.theme.components.modal.overlay} !important;
  }
  
  /* Inputs */
  input, textarea, select, .MuiInputBase-root {
    background-color: ${props => props.theme.components.input.bg} !important;
    color: ${props => props.theme.components.input.text} !important;
    border: 1px solid ${props => props.theme.components.input.border} !important;
    
    &:focus {
      border-color: ${props => props.theme.components.input.borderFocus} !important;
      outline: none !important;
    }
    
    &::placeholder {
      color: ${props => props.theme.components.input.placeholder} !important;
    }
    
    &:disabled {
      background-color: ${props => props.theme.components.input.disabled} !important;
      opacity: 0.6;
    }
  }
  
  /* Labels */
  label {
    color: ${props => props.theme.colors.text.secondary} !important;
  }
  
  /* Botões */
  button {
    transition: all 0.2s ease;
    
    &.primary, &.btn-primary {
      background-color: ${props => props.theme.components.button.primary.bg} !important;
      color: ${props => props.theme.components.button.primary.text} !important;
      border: 1px solid ${props => props.theme.components.button.primary.border} !important;
      
      &:hover:not(:disabled) {
        background-color: ${props => props.theme.components.button.primary.hover} !important;
      }
      
      &:disabled {
        background-color: ${props => props.theme.components.button.primary.disabled} !important;
        cursor: not-allowed;
      }
    }
    
    &.secondary, &.btn-secondary {
      background-color: ${props => props.theme.components.button.secondary.bg} !important;
      color: ${props => props.theme.components.button.secondary.text} !important;
      border: 1px solid ${props => props.theme.components.button.secondary.border} !important;
      
      &:hover:not(:disabled) {
        background-color: ${props => props.theme.components.button.secondary.hover} !important;
      }
    }
  }
  
  /* Cards - Aplicar em TODOS os tipos de cards */
  .card, .MuiCard-root, [class*="Card"], [class*="card"] {
    background-color: ${props => props.theme.components.card.bg} !important;
    border: 1px solid ${props => props.theme.components.card.border} !important;
    box-shadow: ${props => props.theme.components.card.shadow} !important;
    color: ${props => props.theme.colors.text.primary} !important;
  }
  
  /* Metric Cards específicos */
  [class*="MetricCard"], [class*="metric-card"], [class*="StatCard"], [class*="stat-card"] {
    background-color: ${props => props.theme.components.card.bg} !important;
    color: ${props => props.theme.colors.text.primary} !important;
    
    h3, h4, h5, p {
      color: ${props => props.theme.colors.text.primary} !important;
    }
    
    span {
      color: ${props => props.theme.colors.text.secondary} !important;
    }
  }
  
  /* Tabelas */
  table {
    background-color: ${props => props.theme.components.table.rowBg} !important;
    
    thead, th {
      background-color: ${props => props.theme.components.table.headerBg} !important;
      color: ${props => props.theme.colors.text.secondary} !important;
      border-color: ${props => props.theme.components.table.border} !important;
    }
    
    tbody tr {
      background-color: ${props => props.theme.components.table.rowBg} !important;
      border-color: ${props => props.theme.components.table.border} !important;
      
      &:hover {
        background-color: ${props => props.theme.components.table.rowHover} !important;
      }
    }
  }
  
  /* Links gerais - EXCETO sidebar */
  a:not(nav a):not([class*="NavItem"]):not(.sidebar a):not(aside a) {
    color: ${props => props.theme.colors.text.link};
    
    &:hover {
      color: ${props => props.theme.colors.text.linkHover};
    }
  }
  
  /* Links do sidebar - SEMPRE herdam cor do pai, NUNCA verde */
  nav a, 
  [class*="NavItem"],
  [class*="nav-item"],
  .sidebar a,
  aside a,
  a.active,
  .active a {
    color: inherit !important;
    text-decoration: none !important;
    
    &:hover {
      color: inherit !important;
    }
  }
  
  /* Remover estilo .App-link que está causando conflito */
  .App-link {
    color: inherit !important;
  }
  
  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.bg.secondary};
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border.primary};
    border-radius: 4px;
    
    &:hover {
      background: ${props => props.theme.colors.border.secondary};
    }
  }
  
  /* Tooltips */
  .tooltip, [role="tooltip"] {
    background-color: ${props => props.theme.colors.bg.tertiary} !important;
    color: ${props => props.theme.colors.text.primary} !important;
    border: 1px solid ${props => props.theme.colors.border.primary} !important;
  }
  
  /* Dropdown menus */
  .dropdown-menu, .MuiMenu-paper {
    background-color: ${props => props.theme.components.card.bg} !important;
    border: 1px solid ${props => props.theme.colors.border.primary} !important;
    box-shadow: ${props => props.theme.colors.shadow.lg} !important;
    
    .dropdown-item, .MuiMenuItem-root {
      color: ${props => props.theme.colors.text.primary} !important;
      
      &:hover {
        background-color: ${props => props.theme.colors.bg.hover} !important;
      }
    }
  }
  
  /* Charts (Recharts) - Completo */
  .recharts-wrapper {
    .recharts-surface {
      background-color: transparent !important;
    }
  }
  
  .recharts-text, .recharts-label {
    fill: ${props => props.theme.colors.text.secondary} !important;
  }
  
  .recharts-cartesian-grid line {
    stroke: ${props => props.theme.colors.border.secondary} !important;
  }
  
  .recharts-cartesian-axis-tick-value {
    fill: ${props => props.theme.colors.text.secondary} !important;
  }
  
  .recharts-tooltip-wrapper {
    .recharts-default-tooltip {
      background-color: ${props => props.theme.components.card.bg} !important;
      border: 1px solid ${props => props.theme.colors.border.primary} !important;
      color: ${props => props.theme.colors.text.primary} !important;
      
      .recharts-tooltip-label {
        color: ${props => props.theme.colors.text.primary} !important;
      }
      
      .recharts-tooltip-item {
        color: ${props => props.theme.colors.text.secondary} !important;
      }
    }
  }
  
  /* Área dos gráficos */
  .recharts-area {
    fill-opacity: 0.8;
  }
  
  .recharts-bar {
    fill-opacity: 0.9;
  }
  
  /* Containers e Sections */
  [class*="Container"], [class*="Section"], [class*="Wrapper"] {
    background-color: ${props => props.theme.colors.bg.primary};
    color: ${props => props.theme.colors.text.primary};
  }
  
  /* Forms e Settings */
  form, [class*="Form"], [class*="Settings"] {
    background-color: ${props => props.theme.colors.bg.secondary};
    color: ${props => props.theme.colors.text.primary};
    
    fieldset, [class*="FormGroup"], [class*="form-group"] {
      border-color: ${props => props.theme.colors.border.primary};
    }
  }
  
  /* Integration Cards */
  [class*="Integration"], [class*="integration"] {
    background-color: ${props => props.theme.components.card.bg} !important;
    border: 1px solid ${props => props.theme.components.card.border} !important;
    color: ${props => props.theme.colors.text.primary} !important;
    
    h1, h2, h3, h4, h5, h6 {
      color: ${props => props.theme.colors.text.primary} !important;
    }
    
    p, span {
      color: ${props => props.theme.colors.text.secondary} !important;
    }
  }
  
  /* Scanning/Loading areas */
  [class*="Scanning"], [class*="Loading"], [class*="Empty"] {
    background-color: ${props => props.theme.colors.bg.tertiary} !important;
    color: ${props => props.theme.colors.text.primary} !important;
  }
  
  /* Headers and Titles */
  h1, h2, h3, h4, h5, h6 {
    color: ${props => props.theme.colors.text.primary};
  }
  
  /* Paragraphs and spans */
  p, span, div {
    color: inherit;
  }
  
  /* Badges */
  .badge, [class*="Badge"], [class*="badge"] {
    &.success {
      background-color: ${props => props.theme.colors.status.successBg} !important;
      color: ${props => props.theme.colors.status.success} !important;
    }
    
    &.warning {
      background-color: ${props => props.theme.colors.status.warningBg} !important;
      color: ${props => props.theme.colors.status.warning} !important;
    }
    
    &.error {
      background-color: ${props => props.theme.colors.status.errorBg} !important;
      color: ${props => props.theme.colors.status.error} !important;
    }
  }
`;

// Hook para usar o tema global
export const useGlobalTheme = (themeName: string): GlobalTheme => {
  return themeName === 'dark' ? darkTheme : lightTheme;
};