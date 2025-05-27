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
  color?: string;
}

const Card = styled.div<{ isClickable: boolean; color?: string }>`
  background-color: ${props => props.color || props.theme.components.card.bg}; /* Theme-aware card background */
  border: 1px solid ${props => props.theme.colors.border.primary}; /* Theme-aware border */
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s ease;
  cursor: ${props => (props.isClickable ? 'pointer' : 'default')};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
  
  /* Enhanced glass-like effect with theme-aware colors */
  backdrop-filter: blur(4px);
  background: ${props => props.color ? 
    `linear-gradient(135deg, ${props.color}40 0%, ${props.color}90 100%)` :
    props.theme.components.card.bg
  };
  
  /* Add inner highlight for better contrast */
  &:after {
    content: '';
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    height: 1px;
    background: rgba(255, 255, 255, 0.3);
    z-index: 1;
  }
  
  &:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    transform: translateY(-4px);
  }
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent,
      ${props => props.color ? `${props.color}30` : 'rgba(255, 255, 255, 0.1)'},
      transparent
    );
    background-size: 200% 200%;
    animation: shine 3s infinite;
  }
  
  @keyframes shine {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  ${props => props.isClickable && cardHoverEffect}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const IconContainer = styled.div<{ iconColor?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))' 
    : props.theme.colors.accent.primary};
  color: ${props => props.iconColor || (props.theme.name === 'dark' ? props.iconColor : 'white')};
  font-size: 24px;
  position: relative;
  box-shadow: ${props => props.theme.name === 'dark'
    ? '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
    : '0 4px 12px rgba(0, 0, 0, 0.15)'};
  border: ${props => props.theme.name === 'dark' ? 'none' : 'none'};
  
  /* Enhanced icon styles for better visibility */
  svg {
    filter: ${props => props.theme.name === 'dark' 
      ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' 
      : 'none'};
  }
  
  /* Futuristic glowing effect */
  &:after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: ${props => props.theme.name === 'dark' 
      ? `radial-gradient(circle, ${props.iconColor || props.theme.colors.accent.primary}40 0%, transparent 60%)`
      : 'rgba(255, 255, 255, 0.1)'};
    z-index: -1;
    filter: blur(12px);
    animation: pulse 3s infinite;
  }
  
  /* Additional glow layer for dark theme */
  ${props => props.theme.name === 'dark' && `
    &:before {
      content: '';
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: radial-gradient(circle, ${props.iconColor || props.theme.colors.accent.primary}20 0%, transparent 70%);
      z-index: -2;
      filter: blur(20px);
    }
  `}
  
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.5;
    }
  }
`;

const TitleContainer = styled.div`
  flex: 1;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  text-shadow: none;
  letter-spacing: 0.3px;
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  letter-spacing: 0.2px;
  font-weight: 500;
`;

const ValueContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

const Value = styled.div`
  font-size: 38px;
  font-weight: 800;
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.2;
  letter-spacing: -0.5px;
  margin: 5px 0;
  position: relative;
  
  
  /* Animated soft counting effect when card loads */
  animation: countup 1.5s ease-out forwards;
  @keyframes countup {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ChangeContainer = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
  color: ${props => {
    switch (props.trend) {
      case 'up':
        return 'rgba(52, 255, 89, 1)'; // Bright green
      case 'down':
        return 'rgba(255, 45, 85, 1)'; // Bright red 
      default:
        return 'rgba(255, 255, 255, 0.9)';
    }
  }};
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(20, 20, 20, 0.3);
  backdrop-filter: blur(5px);
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  animation: fadeIn 1s ease-in-out forwards;
  animation-delay: 0.5s;
  opacity: 0;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &:hover {
    background: rgba(20, 20, 20, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
`;

const ChangeIcon = styled.span`
  margin-right: 6px;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  
  /* Add stronger glow effect */
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
`;

const ChangeValue = styled.span`
  font-weight: 700;
  letter-spacing: 0.3px;
`;

const ChangeLabel = styled.span`
  margin-left: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 500;
`;

// Enhanced top gradient with modern tech effect
const TopGradient = styled.div<{ color?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, 
    ${props => props.color || props.theme.colors.primary}CC, 
    ${props => props.color || props.theme.colors.primary}55,
    ${props => props.color || props.theme.colors.primary}CC
  );
  opacity: 0.9;
  z-index: 2;
  
  /* Animated scanner effect */
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: scannerEffect 3s ease-in-out infinite;
  }
  
  @keyframes scannerEffect {
    0% {
      left: -100%;
    }
    100% {
      left: 200%;
    }
  }
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
  className,
  color
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
    <Card isClickable={!!onClick} onClick={onClick} className={className} color={color}>
      <CardHeader>
        <TitleContainer>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </TitleContainer>
        {icon && <IconContainer iconColor={color}>{icon}</IconContainer>}
      </CardHeader>
      <ValueContainer>
        <Value data-value={value}>{value}</Value>
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