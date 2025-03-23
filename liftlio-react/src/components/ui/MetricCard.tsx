import React from 'react';
import styled from 'styled-components';
import { cardHoverEffect } from '../../styles/animations';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  className?: string;
}

const Card = styled.div<{ isClickable: boolean }>`
  background-color: ${props => props.theme.colors.secondary}; /* White (30%) */
  border: 1px solid rgba(165, 177, 183, 0.2); /* Subtle border based on Cinza médio (60%) */
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s ease;
  cursor: ${props => (props.isClickable ? 'pointer' : 'default')};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
  
  ${props => props.isClickable && cardHoverEffect}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(45, 62, 80, 0.1); /* Subtle background based on accent color (10%) */
  color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
  font-size: 22px;
`;

const TitleContainer = styled.div`
  flex: 1;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.theme.colors.darkGrey};
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 13px;
  color: ${props => props.theme.colors.darkGrey};
  opacity: 0.7;
`;

const ValueContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

const Value = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
  line-height: 1.2;
`;

const ChangeContainer = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 14px;
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
  margin-right: 4px;
  font-weight: bold;
`;

const ChangeValue = styled.span`
  font-weight: 600;
`;

const ChangeLabel = styled.span`
  margin-left: 6px;
  color: ${props => props.theme.colors.darkGrey};
  font-size: 13px;
`;

// Add subtle gradient line at the top to match the reference design
const TopGradient = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, 
    ${props => props.theme.colors.primary}88, 
    ${props => props.theme.colors.primary}44
  );
  opacity: 0.7;
`;

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  change,
  changeLabel,
  trend = 'neutral',
  onClick,
  className
}) => {
  // Determine trend icon based on the trend property
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
  
  // Format the percentage change
  const formatChange = (changeValue: number) => {
    return `${changeValue > 0 ? '+' : ''}${changeValue}%`;
  };
  
  return (
    <Card isClickable={!!onClick} onClick={onClick} className={className}>
      <TopGradient />
      <CardHeader>
        <TitleContainer>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </TitleContainer>
        {icon && <IconContainer>{icon}</IconContainer>}
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