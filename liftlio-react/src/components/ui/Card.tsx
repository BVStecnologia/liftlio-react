import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { cardHoverEffect } from '../../styles/animations';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  interactive?: boolean;
  elevation?: 'flat' | 'low' | 'medium' | 'high';
  onClick?: () => void;
  padding?: string;
  className?: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
}

const getElevation = (elevation: string) => {
  switch (elevation) {
    case 'flat':
      return 'none';
    case 'low':
      return '0 3px 6px rgba(0, 0, 0, 0.04)';
    case 'medium':
      return '0 6px 12px rgba(0, 0, 0, 0.08)';
    case 'high':
      return '0 10px 20px rgba(0, 0, 0, 0.12)';
    default:
      return '0 3px 6px rgba(0, 0, 0, 0.04)';
  }
};

const CardContainer = styled.div<{ 
  interactive?: boolean; 
  elevation: string;
  customPadding?: string;
}>`
  background-color: ${props => props.theme.colors.secondary}; /* White (30%) */
  border: 1px solid rgba(181, 194, 203, 0.2); /* Sutble border based on new dominant dark color */
  border-radius: 12px;
  padding: ${props => props.customPadding || '20px'};
  box-shadow: ${props => getElevation(props.elevation)};
  transition: all 0.3s ease;
  cursor: ${props => (props.interactive ? 'pointer' : 'default')};
  position: relative;
  overflow: hidden;
  
  &:hover {
    ${props => props.interactive && `
      transform: translateY(-3px);
      box-shadow: ${getElevation('medium')};
    `}
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  justify-content: space-between;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(45, 62, 80, 0.1); /* Subtle background based on accent color (10%) */
  color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
  font-size: 18px;
  margin-right: 14px;
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const CardTitle = styled.h3`
  margin: 0;
  padding: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
`;

const CardSubtitle = styled.p`
  margin: 4px 0 0 0;
  padding: 0;
  font-size: 13px;
  color: ${props => props.theme.colors.darkGrey};
  opacity: 0.8;
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
`;

// Add top gradient with better visibility to match reference design
const TopGradient = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, 
    ${props => props.theme.colors.primary}95, 
    ${props => props.theme.colors.primary}50
  );
  opacity: 0.85;
`;

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  interactive = false,
  elevation = 'low',
  onClick,
  padding,
  className,
  icon,
  headerActions
}) => {
  return (
    <CardContainer 
      interactive={interactive} 
      elevation={elevation}
      onClick={interactive ? onClick : undefined}
      customPadding={padding}
      className={className}
    >
      <TopGradient />
      {(title || subtitle || icon || headerActions) && (
        <CardHeader>
          <TitleSection>
            {icon && <IconContainer>{icon}</IconContainer>}
            <TitleGroup>
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
            </TitleGroup>
          </TitleSection>
          {headerActions && <ActionsContainer>{headerActions}</ActionsContainer>}
        </CardHeader>
      )}
      {children}
    </CardContainer>
  );
};

export default Card;