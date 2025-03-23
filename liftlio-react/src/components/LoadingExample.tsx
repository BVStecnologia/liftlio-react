import React from 'react';
import styled from 'styled-components';
import { useLoading } from '../context/LoadingContext';
import { COLORS } from '../styles/colors';
import Card from './Card';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

const ExampleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'error' }>`
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: ${COLORS.SHADOW.LIGHT};
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: ${COLORS.ACCENT};
          color: white;
          &:hover {
            background-color: ${COLORS.ACCENT_LIGHT};
          }
        `;
      case 'secondary':
        return `
          background-color: ${COLORS.DOMINANT_LIGHT};
          color: ${COLORS.ACCENT};
          &:hover {
            background-color: ${COLORS.DOMINANT_LIGHTER};
          }
        `;
      case 'error':
        return `
          background-color: ${COLORS.ERROR};
          color: white;
          &:hover {
            background-color: ${COLORS.ERROR}dd;
          }
        `;
      default:
        return `
          background-color: ${COLORS.ACCENT};
          color: white;
          &:hover {
            background-color: ${COLORS.ACCENT_LIGHT};
          }
        `;
    }
  }}
`;

const Title = styled.h2`
  font-size: 24px;
  margin-bottom: 16px;
  color: ${COLORS.ACCENT};
`;

const Description = styled.p`
  margin-bottom: 24px;
  line-height: 1.6;
  color: ${COLORS.TEXT.SECONDARY};
`;

const LoadingExample: React.FC = () => {
  const { startLoading, stopLoading } = useLoading();
  
  const simulateLoading = (duration: number, message?: string) => {
    startLoading(message);
    
    setTimeout(() => {
      stopLoading();
    }, duration);
  };
  
  return (
    <ExampleContainer>
      <Card title="Demonstração do Componente de Loading" icon="FaSpinner">
        <Description>
          Este componente demonstra o uso do sistema de loading global. Clique em qualquer um dos botões abaixo para ver uma demonstração do indicador de carregamento com diferentes tempos e mensagens.
        </Description>
        
        <ButtonRow>
          <Button 
            variant="primary"
            onClick={() => simulateLoading(2000, "Carregando dados...")}
          >
            <IconComponent icon={FaIcons.FaClock} />
            Carregamento Rápido (2s)
          </Button>
          
          <Button 
            variant="secondary"
            onClick={() => simulateLoading(5000, "Processando informações...")}
          >
            <IconComponent icon={FaIcons.FaHourglass} />
            Carregamento Médio (5s)
          </Button>
          
          <Button 
            variant="error"
            onClick={() => simulateLoading(8000, "Executando operação complexa...")}
          >
            <IconComponent icon={FaIcons.FaExclamationTriangle} />
            Carregamento Longo (8s)
          </Button>
        </ButtonRow>
      </Card>
    </ExampleContainer>
  );
};

export default LoadingExample;