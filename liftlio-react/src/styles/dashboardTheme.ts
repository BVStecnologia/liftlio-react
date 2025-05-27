/**
 * Dashboard Theme Configuration
 * ==============================
 * Centraliza TODAS as configurações de estilo do dashboard
 * Para editar qualquer aspecto visual, modifique apenas este arquivo
 */

export interface DashboardTheme {
  // Layout Principal
  layout: {
    mainBg: string;
    containerBg: string;
    contentPadding: string;
    borderRadius: {
      small: string;
      medium: string;
      large: string;
      pill: string;
    };
  };

  // Tabela
  table: {
    headerBg: string;
    headerText: string;
    headerBorder: string;
    rowBg: string;
    rowHoverBg: string;
    rowBorder: string;
    cellPadding: string;
  };

  // Cards (Comentário e Resposta)
  cards: {
    comment: {
      bg: string;
      border: string;
      borderLeft: string;
      shadow: string;
      padding: string;
    };
    response: {
      bg: string;
      border: string;
      shadow: string;
      padding: string;
      // Bordas coloridas por status
      borderLeftScheduled: string;
      borderLeftPublished: string;
      borderLeftDefault: string;
    };
  };

  // Badges de Status
  badges: {
    scheduled: {
      bg: string;
      text: string;
      border: string;
    };
    published: {
      bg: string;
      text: string;
      border: string;
    };
    brand: {
      bg: string;
      text: string;
      border: string;
    };
    quality: {
      bg: string;
      text: string;
      border: string;
    };
  };

  // Tabs
  tabs: {
    containerBg: string;
    containerBorder: string;
    containerShadow: string;
    activeBg: string;
    inactiveBg: string;
    activeText: string;
    inactiveText: string;
    hoverBg: string;
  };

  // Textos
  text: {
    primary: string;
    secondary: string;
    muted: string;
    link: string;
    linkHover: string;
  };

  // Bordas e Sombras
  borders: {
    default: string;
    light: string;
    focus: string;
  };
  
  shadows: {
    small: string;
    medium: string;
    large: string;
  };

  // Botões
  buttons: {
    primary: {
      bg: string;
      text: string;
      border: string;
      hoverBg: string;
      shadow: string;
    };
    secondary: {
      bg: string;
      text: string;
      border: string;
      hoverBg: string;
    };
  };

  // Cores especiais
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };

  // Sidebar (para manter consistência)
  sidebar: {
    bg: string;
    itemBg: string;
    itemHoverBg: string;
    itemActiveBg: string;
    text: string;
    textHover: string;
    textActive: string;
    border: string;
  };

  // Header
  header: {
    bg: string;
    border: string;
    shadow: string;
    text: string;
  };
}

// Tema Claro
export const lightTheme: DashboardTheme = {
  layout: {
    mainBg: '#F8F9FA',
    containerBg: '#FFFFFF',
    contentPadding: '32px',
    borderRadius: {
      small: '6px',
      medium: '12px',
      large: '18px',
      pill: '9999px'
    }
  },

  table: {
    headerBg: '#F5F7FA',
    headerText: '#666666',
    headerBorder: 'rgba(0, 0, 0, 0.08)',
    rowBg: '#FFFFFF',
    rowHoverBg: 'rgba(45, 62, 80, 0.04)',
    rowBorder: 'rgba(0, 0, 0, 0.05)',
    cellPadding: '20px'
  },

  cards: {
    comment: {
      bg: '#F5F7FA',
      border: 'rgba(0, 0, 0, 0.05)',
      borderLeft: '#2d3e50',
      shadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      padding: '16px'
    },
    response: {
      bg: '#F8F9FA',
      border: 'rgba(0, 0, 0, 0.06)',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      padding: '16px',
      borderLeftScheduled: '#FFAA15',
      borderLeftPublished: '#4CAF50',
      borderLeftDefault: '#2d3e50'
    }
  },

  badges: {
    scheduled: {
      bg: 'rgba(255, 170, 21, 0.12)',
      text: '#F57C00',
      border: 'rgba(255, 170, 21, 0.3)'
    },
    published: {
      bg: 'rgba(76, 175, 80, 0.12)',
      text: '#388E3C',
      border: 'rgba(76, 175, 80, 0.3)'
    },
    brand: {
      bg: 'rgba(33, 150, 243, 0.12)',
      text: '#1976D2',
      border: 'rgba(33, 150, 243, 0.3)'
    },
    quality: {
      bg: 'rgba(156, 39, 176, 0.12)',
      text: '#7B1FA2',
      border: 'rgba(156, 39, 176, 0.3)'
    }
  },

  tabs: {
    containerBg: '#F0F2F5',
    containerBorder: 'transparent',
    containerShadow: '0 2px 10px rgba(0,0,0,0.05)',
    activeBg: '#FFFFFF',
    inactiveBg: 'transparent',
    activeText: '#2d3e50',
    inactiveText: '#666666',
    hoverBg: 'rgba(255, 255, 255, 0.8)'
  },

  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    muted: '#9CA3AF',
    link: '#0095FF',
    linkHover: '#0077CC'
  },

  borders: {
    default: 'rgba(0, 0, 0, 0.08)',
    light: 'rgba(0, 0, 0, 0.05)',
    focus: '#2d3e50'
  },

  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.06)',
    medium: '0 2px 8px rgba(0, 0, 0, 0.08)',
    large: '0 4px 12px rgba(0, 0, 0, 0.1)'
  },

  buttons: {
    primary: {
      bg: '#2d3e50',
      text: '#FFFFFF',
      border: 'none',
      hoverBg: '#34495e',
      shadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    secondary: {
      bg: 'transparent',
      text: '#2d3e50',
      border: 'rgba(0, 0, 0, 0.1)',
      hoverBg: 'rgba(0, 0, 0, 0.05)'
    }
  },

  accent: {
    primary: '#2d3e50',
    secondary: '#0095FF',
    success: '#4CAF50',
    warning: '#FFAA15',
    error: '#e74c3c'
  },

  sidebar: {
    bg: '#2d3e50',
    itemBg: 'transparent',
    itemHoverBg: 'rgba(255, 255, 255, 0.08)',
    itemActiveBg: 'rgba(255, 255, 255, 0.12)',
    text: 'rgba(255, 255, 255, 0.7)',
    textHover: '#FFFFFF',
    textActive: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.1)'
  },

  header: {
    bg: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.08)',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    text: '#1A1A1A'
  }
};

// Tema Escuro
export const darkTheme: DashboardTheme = {
  layout: {
    mainBg: '#0A0A0A',
    containerBg: '#141414',
    contentPadding: '32px',
    borderRadius: {
      small: '6px',
      medium: '12px',
      large: '18px',
      pill: '9999px'
    }
  },

  table: {
    headerBg: 'rgba(255, 255, 255, 0.03)',
    headerText: 'rgba(255, 255, 255, 0.6)',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    rowBg: '#141414',
    rowHoverBg: 'rgba(255, 255, 255, 0.04)',
    rowBorder: 'rgba(255, 255, 255, 0.08)',
    cellPadding: '20px'
  },

  cards: {
    comment: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderLeft: 'rgba(255, 255, 255, 0.3)',
      shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      padding: '16px'
    },
    response: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.08)',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
      padding: '16px',
      borderLeftScheduled: 'rgba(255, 183, 77, 0.5)',
      borderLeftPublished: 'rgba(102, 187, 106, 0.5)',
      borderLeftDefault: 'rgba(255, 255, 255, 0.3)'
    }
  },

  badges: {
    scheduled: {
      bg: 'rgba(255, 183, 77, 0.15)',
      text: '#FFB74D',
      border: 'rgba(255, 183, 77, 0.4)'
    },
    published: {
      bg: 'rgba(102, 187, 106, 0.15)',
      text: '#66BB6A',
      border: 'rgba(102, 187, 106, 0.4)'
    },
    brand: {
      bg: 'rgba(66, 165, 245, 0.15)',
      text: '#42A5F5',
      border: 'rgba(66, 165, 245, 0.4)'
    },
    quality: {
      bg: 'rgba(186, 104, 200, 0.15)',
      text: '#BA68C8',
      border: 'rgba(186, 104, 200, 0.4)'
    }
  },

  tabs: {
    containerBg: 'rgba(255, 255, 255, 0.05)',
    containerBorder: 'rgba(255, 255, 255, 0.1)',
    containerShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    activeBg: 'rgba(255, 255, 255, 0.1)',
    inactiveBg: 'transparent',
    activeText: '#FFFFFF',
    inactiveText: 'rgba(255, 255, 255, 0.5)',
    hoverBg: 'rgba(255, 255, 255, 0.08)'
  },

  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    link: 'rgba(255, 255, 255, 0.8)',
    linkHover: '#FFFFFF'
  },

  borders: {
    default: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(255, 255, 255, 0.08)',
    focus: 'rgba(255, 255, 255, 0.3)'
  },

  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.3)',
    medium: '0 2px 8px rgba(0, 0, 0, 0.4)',
    large: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  buttons: {
    primary: {
      bg: 'rgba(255, 255, 255, 0.9)',
      text: '#0A0A0A',
      border: 'none',
      hoverBg: '#FFFFFF',
      shadow: '0 2px 4px rgba(255, 255, 255, 0.1)'
    },
    secondary: {
      bg: 'transparent',
      text: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(255, 255, 255, 0.2)',
      hoverBg: 'rgba(255, 255, 255, 0.05)'
    }
  },

  accent: {
    primary: 'rgba(255, 255, 255, 0.8)',
    secondary: 'rgba(255, 255, 255, 0.6)',
    success: 'rgba(255, 255, 255, 0.5)',
    warning: 'rgba(255, 183, 77, 0.5)',
    error: 'rgba(255, 82, 82, 0.8)'
  },

  sidebar: {
    bg: '#141414',
    itemBg: 'transparent',
    itemHoverBg: 'rgba(255, 255, 255, 0.05)',
    itemActiveBg: 'rgba(255, 255, 255, 0.08)',
    text: 'rgba(255, 255, 255, 0.7)',
    textHover: '#FFFFFF',
    textActive: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.1)'
  },

  header: {
    bg: '#141414',
    border: 'rgba(255, 255, 255, 0.1)',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    text: '#FFFFFF'
  }
};

// Hook para usar o tema do dashboard
export const useDashboardTheme = (themeName: string): DashboardTheme => {
  return themeName === 'dark' ? darkTheme : lightTheme;
};

// Exportar temas individuais para compatibilidade
export default {
  light: lightTheme,
  dark: darkTheme
};