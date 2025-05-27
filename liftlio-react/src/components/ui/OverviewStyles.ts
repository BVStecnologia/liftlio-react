import styled from 'styled-components';

// Estilos específicos para os cards da Overview
export const StyledMetricCard = styled.div`
  background: ${props => props.theme.components.card.bg};
  border: 1px solid ${props => props.theme.components.card.border};
  border-radius: ${props => props.theme.radius.lg};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.components.card.shadow};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.colors.shadow.md};
  }
  
  /* Ícone do card */
  .metric-icon {
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radius.md};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    
    svg {
      font-size: 24px;
      color: white;
    }
  }
  
  /* Valor da métrica */
  .metric-value {
    font-size: 2rem;
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text.primary};
    margin-bottom: 0.5rem;
  }
  
  /* Label da métrica */
  .metric-label {
    font-size: 0.875rem;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

// Container para os gráficos
export const ChartContainer = styled.div`
  background: ${props => props.theme.components.card.bg};
  border: 1px solid ${props => props.theme.components.card.border};
  border-radius: ${props => props.theme.radius.lg};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.components.card.shadow};
  
  h3 {
    color: ${props => props.theme.colors.text.primary};
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: ${props => props.theme.fontWeights.semiBold};
  }
`;

// Container principal
export const DashboardContainer = styled.div`
  background: ${props => props.theme.colors.bg.primary};
  min-height: 100vh;
  color: ${props => props.theme.colors.text.primary};
`;

// Grid de métricas
export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

// Seção de gráficos
export const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
`;