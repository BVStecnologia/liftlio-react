import React, { ReactNode, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { IconType } from 'react-icons';
import { renderIcon } from '../utils/IconHelper';

interface CardProps {
  children: ReactNode;
  title?: string;
  fullWidth?: boolean;
  padding?: string;
  elevation?: 'low' | 'medium' | 'high';
  collapsible?: boolean;
  icon?: keyof typeof FaIcons;
  headerAction?: ReactNode;
  className?: string;
}

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(45, 29, 66, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(45, 29, 66, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(45, 29, 66, 0);
  }
`;

const elevationStyles = {
  low: css`
    box-shadow: ${props => props.theme.shadows.sm};
  `,
  medium: css`
    box-shadow: ${props => props.theme.shadows.md};
  `,
  high: css`
    box-shadow: ${props => props.theme.shadows.lg};
    border: 1px solid rgba(45, 29, 66, 0.1);
  `
};

const CardContainer = styled.div<{ 
  fullWidth?: boolean; 
  padding?: string; 
  elevation?: 'low' | 'medium' | 'high';
  hoverEffect?: boolean;
}>`
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  padding: ${props => props.padding || '24px'};
  margin-bottom: 24px;
  transition: all ${props => props.theme.transitions.default};
  position: relative;
  overflow: hidden;
  
  ${props => elevationStyles[props.elevation || 'low']}
  
  ${props => props.hoverEffect && css`
    &:hover {
      transform: translateY(-4px);
      box-shadow: ${props => props.theme.shadows.hover};
    }
    
    &:active {
      transform: translateY(-2px);
    }
  `}
  
  /* Removing the animated border to match the reference image */
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
`;

const CardTitleWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const CardIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${props => props.theme.radius.circle};
  background: ${props => props.theme.colors.gradient.primary};
  color: white;
  margin-right: 12px;
  font-size: 1rem;
`;

const CardTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const CardContent = styled.div<{ collapsed: boolean }>`
  max-height: ${props => props.collapsed ? '0' : '2000px'};
  opacity: ${props => props.collapsed ? '0' : '1'};
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
  overflow: ${props => props.collapsed ? 'hidden' : 'visible'};
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.sm};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.lightGrey};
    color: ${props => props.theme.colors.primary};
  }
  
  svg {
    transition: transform 0.3s ease;
  }
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Card: React.FC<CardProps> = ({ 
  children, 
  title, 
  fullWidth, 
  padding, 
  elevation = 'low',
  collapsible = false,
  icon,
  headerAction,
  className
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoverEffect] = useState(elevation === 'high');
  
  const toggleCollapse = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };
  
  return (
    <CardContainer 
      fullWidth={fullWidth} 
      padding={padding} 
      elevation={elevation}
      hoverEffect={hoverEffect}
      className={className}
    >
      {(title || collapsible || headerAction) && (
        <CardHeader>
          <CardTitleWrapper>
            {icon && (
              <CardIcon>
                {/* Renderizando o ícone de forma segura usando o helper */}
                {icon && FaIcons[icon] ? renderIcon(FaIcons[icon] as IconType) : null}
              </CardIcon>
            )}
            {title && <CardTitle>{title}</CardTitle>}
          </CardTitleWrapper>
          <CardActions>
            {headerAction}
            {collapsible && (
              <CollapseButton onClick={toggleCollapse}>
                {/* Usando os componentes de ícone seguros com tipagem correta */}
                {collapsed ? 
                  renderIcon(FaIcons.FaChevronDown) : 
                  renderIcon(FaIcons.FaChevronUp)
                }
              </CollapseButton>
            )}
          </CardActions>
        </CardHeader>
      )}
      <CardContent collapsed={collapsed}>
        {children}
      </CardContent>
    </CardContainer>
  );
};

export default Card;