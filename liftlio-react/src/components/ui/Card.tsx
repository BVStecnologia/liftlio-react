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
}

const getElevation = (elevation: string) => {
  switch (elevation) {
    case 'flat':
      return 'none';
    case 'low':
      return (props: any) => props.theme.shadows.sm;
    case 'medium':
      return (props: any) => props.theme.shadows.md;
    case 'high':
      return (props: any) => props.theme.shadows.lg;
    default:
      return (props: any) => props.theme.shadows.sm;
  }
};

const CardContainer = styled.div<{ 
  interactive?: boolean; 
  elevation: string;
  customPadding?: string;
}>`
  background-color: ${props => props.theme.colors.secondary}; /* White (30%) */
  border: 1px solid ${props => props.theme.colors.tertiary}; /* Cinza médio (60%) */
  border-radius: ${props => props.theme.radius.md};
  padding: ${props => props.customPadding || props.theme.spacing.lg};
  box-shadow: ${props => getElevation(props.elevation)};
  transition: all 0.3s ease;
  cursor: ${props => (props.interactive ? 'pointer' : 'default')};
  
  ${props => props.interactive && cardHoverEffect}
`;

const CardHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.md};
`;

const CardTitle = styled.h3`
  margin: 0;
  padding: 0;
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary}; /* Azul naval escuro (10%) */
`;

const CardSubtitle = styled.p`
  margin: ${props => props.theme.spacing.xs} 0 0 0;
  padding: 0;
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
`;

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  interactive = false,
  elevation = 'low',
  onClick,
  padding,
  className
}) => {
  return (
    <CardContainer 
      interactive={interactive} 
      elevation={elevation}
      onClick={interactive ? onClick : undefined}
      customPadding={padding}
      className={className}
    >
      {(title || subtitle) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
        </CardHeader>
      )}
      {children}
    </CardContainer>
  );
};

export default Card;