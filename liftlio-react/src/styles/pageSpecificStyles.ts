/**
 * Estilos específicos para páginas
 * Para garantir que TODOS os componentes respeitem o tema
 */

import { createGlobalStyle } from 'styled-components';
import { GlobalTheme } from './GlobalThemeSystem';

export const PageSpecificStyles = createGlobalStyle<{ theme: GlobalTheme }>`
  /* OVERVIEW PAGE */
  /* Cards de métricas */
  div[class*="MetricCard"],
  div[class*="StatsCard"],
  div[class*="KPICard"],
  div[class*="DashboardCard"] {
    background: ${props => props.theme.components.card.bg} !important;
    color: ${props => props.theme.colors.text.primary} !important;
    border: 1px solid ${props => props.theme.components.card.border} !important;
    
    /* Títulos dentro dos cards */
    h1, h2, h3, h4, h5, h6 {
      color: ${props => props.theme.colors.text.primary} !important;
    }
    
    /* Valores e números */
    .value, .number, [class*="Value"], [class*="Number"] {
      color: ${props => props.theme.colors.text.primary} !important;
    }
    
    /* Labels e descrições */
    .label, .description, [class*="Label"], [class*="Description"] {
      color: ${props => props.theme.colors.text.secondary} !important;
    }
    
    /* Ícones */
    svg {
      color: ${props => props.theme.colors.accent.primary} !important;
    }
  }
  
  /* Gráficos e suas containers */
  div[class*="ChartContainer"],
  div[class*="GraphContainer"],
  div[class*="PerformanceChart"] {
    background: ${props => props.theme.components.card.bg} !important;
    border: 1px solid ${props => props.theme.components.card.border} !important;
    
    /* Título do gráfico */
    .chart-title, [class*="ChartTitle"] {
      color: ${props => props.theme.colors.text.primary} !important;
    }
  }
  
  /* MONITORING PAGE */
  /* Área de scanning */
  div[class*="ScanningArea"],
  div[class*="MonitoringSection"],
  div[class*="ChannelList"] {
    background: ${props => props.theme.colors.bg.secondary} !important;
    color: ${props => props.theme.colors.text.primary} !important;
    
    /* Items da lista */
    .channel-item, [class*="ChannelItem"] {
      background: ${props => props.theme.components.card.bg} !important;
      border: 1px solid ${props => props.theme.components.card.border} !important;
      
      &:hover {
        background: ${props => props.theme.colors.bg.hover} !important;
      }
    }
  }
  
  /* Empty states */
  div[class*="EmptyState"],
  div[class*="NoData"],
  div[class*="Placeholder"] {
    background: ${props => props.theme.colors.bg.tertiary} !important;
    color: ${props => props.theme.colors.text.secondary} !important;
    border: 2px dashed ${props => props.theme.colors.border.secondary} !important;
  }
  
  /* SETTINGS PAGE */
  /* Formulários de configuração */
  div[class*="SettingsForm"],
  div[class*="ConfigForm"],
  form[class*="Settings"] {
    background: ${props => props.theme.components.card.bg} !important;
    padding: 24px !important;
    border-radius: 12px !important;
    
    /* Grupos de campos */
    .form-group, [class*="FormGroup"] {
      margin-bottom: 20px;
      
      label {
        color: ${props => props.theme.colors.text.secondary} !important;
        margin-bottom: 8px !important;
        display: block !important;
      }
    }
    
    /* Seções do formulário */
    .form-section, [class*="FormSection"] {
      background: ${props => props.theme.colors.bg.tertiary} !important;
      padding: 16px !important;
      border-radius: 8px !important;
      margin-bottom: 16px !important;
    }
  }
  
  /* INTEGRATIONS PAGE */
  /* Cards de integração */
  div[class*="IntegrationCard"],
  div[class*="ServiceCard"],
  div[class*="AppCard"] {
    background: ${props => props.theme.components.card.bg} !important;
    border: 1px solid ${props => props.theme.components.card.border} !important;
    transition: all 0.3s ease !important;
    
    &:hover {
      border-color: ${props => props.theme.colors.accent.primary} !important;
      box-shadow: ${props => props.theme.colors.shadow.md} !important;
    }
    
    /* Status badges */
    .status, [class*="Status"] {
      &.active, &.connected {
        background: ${props => props.theme.colors.status.successBg} !important;
        color: ${props => props.theme.colors.status.success} !important;
      }
      
      &.inactive, &.disconnected {
        background: ${props => props.theme.colors.bg.tertiary} !important;
        color: ${props => props.theme.colors.text.muted} !important;
      }
    }
    
    /* Botões de ação */
    button {
      background: ${props => props.theme.components.button.primary.bg} !important;
      color: ${props => props.theme.components.button.primary.text} !important;
      
      &:hover {
        background: ${props => props.theme.components.button.primary.hover} !important;
      }
    }
  }
  
  /* TABELAS EM TODAS AS PÁGINAS */
  table, [class*="Table"] {
    background: ${props => props.theme.components.table.rowBg} !important;
    
    thead, [class*="TableHead"] {
      background: ${props => props.theme.components.table.headerBg} !important;
      
      th {
        color: ${props => props.theme.colors.text.secondary} !important;
        border-bottom: 2px solid ${props => props.theme.components.table.border} !important;
      }
    }
    
    tbody, [class*="TableBody"] {
      tr {
        background: ${props => props.theme.components.table.rowBg} !important;
        border-bottom: 1px solid ${props => props.theme.components.table.border} !important;
        
        &:hover {
          background: ${props => props.theme.components.table.rowHover} !important;
        }
        
        td {
          color: ${props => props.theme.colors.text.primary} !important;
        }
      }
    }
  }
  
  /* LOADING STATES */
  div[class*="Loading"],
  div[class*="Spinner"],
  div[class*="Skeleton"] {
    background: ${props => props.theme.colors.bg.tertiary} !important;
    
    /* Animação de skeleton */
    &::after {
      background: linear-gradient(
        90deg,
        transparent,
        ${props => props.theme.colors.bg.hover},
        transparent
      ) !important;
    }
  }
  
  /* GLOBAL FIXES */
  /* Remover fundos brancos hardcoded */
  div[style*="background: white"],
  div[style*="background-color: white"],
  div[style*="background:#fff"],
  div[style*="background-color:#fff"],
  div[style*="background: #fff"],
  div[style*="background-color: #fff"],
  div[style*="background:white"],
  div[style*="background-color:white"] {
    background-color: ${props => props.theme.components.card.bg} !important;
  }
  
  /* Forçar cores em elementos inline */
  [style*="color: black"],
  [style*="color:#000"],
  [style*="color: #000"] {
    color: ${props => props.theme.colors.text.primary} !important;
  }
  
  /* Dividers e separadores */
  hr, [class*="Divider"], [class*="divider"] {
    border-color: ${props => props.theme.colors.border.primary} !important;
    background-color: ${props => props.theme.colors.border.primary} !important;
  }
`;