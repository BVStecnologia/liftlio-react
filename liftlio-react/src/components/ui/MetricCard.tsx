import React from 'react';
import styled from 'styled-components';
import { cardHoverEffect } from '../../styles/animations';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  className?: string;
}

const Card = styled.div<{ isClickable: boolean }>`
  background-color: ${props => props.theme.colors.secondary}; /* White (30%) */
  border: 1px solid ${props => props.theme.colors.tertiary}; /* Cinza médio (60%) */
  border-radius: ${props => props.theme.radius.md};
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s ease;
  cursor: ${props => (props.isClickable ? 'pointer' : 'default')};
  
  ${props => props.isClickable && cardHoverEffect}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${props => props.theme.radius.md};
  background-color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
  color: ${props => props.theme.colors.secondary}; /* White (30%) */
  font-size: ${props => props.theme.fontSizes.xl};
  margin-right: ${props => props.theme.spacing.sm};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.darkGrey};
`;

const ValueContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: ${props => props.theme.spacing.xs};
`;

const Value = styled.div`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
`;

const ChangeContainer = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  margin-top: ${props => props.theme.spacing.xs};
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => {
    switch (props.trend) {
      case 'up':
        return props.theme.colors.success;
      case 'down':
        return props.theme.colors.error;
      default:
        return props.theme.colors.darkGrey;
    }
  }};
`;

const ChangeIcon = styled.span`
  margin-right: ${props => props.theme.spacing.xs};
`;

const ChangeValue = styled.span`
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const ChangeLabel = styled.span`
  margin-left: ${props => props.theme.spacing.xs};
  color: ${props => props.theme.colors.darkGrey};
`;

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  trend = 'neutral',
  onClick,
  className
}) => {
  // Determinar o ícone de tendência com base na propriedade trend
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };
  
  // Formatar a mudança percentual
  const formatChange = (changeValue: number) => {
    return `${changeValue > 0 ? '+' : ''}${changeValue}%`;
  };
  
  return (
    <Card isClickable={!!onClick} onClick={onClick} className={className}>
      <CardHeader>
        {icon && <IconContainer>{icon}</IconContainer>}
        <Title>{title}</Title>
      </CardHeader>
      <ValueContainer>
        <Value>{value}</Value>
        {change !== undefined && (
          <ChangeContainer trend={trend}>
            <ChangeIcon>{getTrendIcon()}</ChangeIcon>
            <ChangeValue>{formatChange(change)}</ChangeValue>
            {changeLabel && <ChangeLabel>{changeLabel}</ChangeLabel>}
          </ChangeContainer>
        )}
      </ValueContainer>
    </Card>
  );
};

export default MetricCard;