import React, { ReactNode, useState, useRef } from 'react';
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
  style?: React.CSSProperties;
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
  background-color: ${props => props.theme.components.card.bg};
  border-radius: ${props => props.theme.radius.lg};
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  padding: ${props => props.padding || '24px'};
  margin-bottom: 24px;
  transition: all ${props => props.theme.transitions.springy};
  position: relative;
  overflow: hidden;
  transform-style: preserve-3d;
  perspective: 1000px;
  transform: perspective(1000px) rotateX(0) rotateY(0) translateZ(0);
  will-change: transform, box-shadow;
  
  /* Adiciona um gradiente sutíl na parte superior */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(to right, 
      ${props => props.theme.colors.primaryLight}90, 
      ${props => props.theme.colors.primary}60
    );
    opacity: 0.7;
    transform: translateZ(1px);
    transition: all 0.4s ease;
  }
  
  /* Efeito de destaque interno */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit; 
    padding: 1px;
    background: linear-gradient(
      135deg, 
      rgba(255, 255, 255, 0.3) 0%, 
      rgba(255, 255, 255, 0) 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.4;
    transform: translateZ(1px);
    pointer-events: none;
    transition: opacity 0.4s ease;
  }
  
  ${props => elevationStyles[props.elevation || 'low']}
  
  ${props => props.hoverEffect && css`
    cursor: pointer;
    
    &:hover {
      transform: perspective(1000px) translateY(-4px) translateZ(10px);
      box-shadow: ${props => props.theme.shadows.hover};
      
      &::before {
        opacity: 1;
        height: 5px;
      }
      
      &::after {
        opacity: 0.8;
      }
    }
    
    /* Efeito de tilt (inclinação) no hover */
    &.tilt-effect {
      transition: transform 0.1s ease-out;
      
      &.tilt-left {
        transform: perspective(1000px) rotateY(-2deg) rotateX(1deg) translateY(-4px);
      }
      
      &.tilt-right {
        transform: perspective(1000px) rotateY(2deg) rotateX(1deg) translateY(-4px);
      }
      
      &.tilt-top {
        transform: perspective(1000px) rotateX(-2deg) translateY(-4px);
      }
      
      &.tilt-bottom {
        transform: perspective(1000px) rotateX(2deg) translateY(-4px);
      }
      
      &.tilt-top-left {
        transform: perspective(1000px) rotateX(-1deg) rotateY(-1deg) translateY(-4px);
      }
      
      &.tilt-top-right {
        transform: perspective(1000px) rotateX(-1deg) rotateY(1deg) translateY(-4px);
      }
      
      &.tilt-bottom-left {
        transform: perspective(1000px) rotateX(1deg) rotateY(-1deg) translateY(-4px);
      }
      
      &.tilt-bottom-right {
        transform: perspective(1000px) rotateX(1deg) rotateY(1deg) translateY(-4px);
      }
    }
    
    &:active {
      transform: perspective(1000px) translateY(-2px) translateZ(5px) scale(0.99);
      transition: all 0.2s ease;
    }
  `}
  
  @media (max-width: 768px) {
    padding: ${props => props.padding ? 
      `calc(${props.padding} * 0.85)` : 
      '20px'
    };
    border-radius: ${props => props.theme.radius.md};
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  @media (max-width: 480px) {
    padding: ${props => props.padding ? 
      `calc(${props.padding} * 0.7)` : 
      '16px'
    };
    border-radius: 16px;
    margin-bottom: 16px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  
  @media (max-width: 768px) {
    margin-bottom: 16px;
    padding-bottom: 10px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 12px;
    padding-bottom: 8px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
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
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: ${props => props.theme.fontSizes.md};
  }
  
  @media (max-width: 480px) {
    font-size: ${props => props.theme.fontSizes.sm};
  }
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
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.sm};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
    color: ${props => props.theme.colors.accent.primary};
  }
  
  svg {
    transition: transform 0.3s ease;
  }
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: flex-end;
  }
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
  className,
  style
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoverEffect] = useState(elevation === 'high');
  const [tiltClass, setTiltClass] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Implementação do efeito de tilt baseado na posição do mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverEffect || !cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calcula a posição relativa do mouse dentro do card (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Determina a região onde o mouse está
    let newTiltClass = 'tilt-effect ';
    
    if (y < 0.3) {
      // Região superior
      newTiltClass += x < 0.3 ? 'tilt-top-left' : x > 0.7 ? 'tilt-top-right' : 'tilt-top';
    } else if (y > 0.7) {
      // Região inferior
      newTiltClass += x < 0.3 ? 'tilt-bottom-left' : x > 0.7 ? 'tilt-bottom-right' : 'tilt-bottom';
    } else {
      // Região central horizontal
      newTiltClass += x < 0.3 ? 'tilt-left' : x > 0.7 ? 'tilt-right' : '';
    }
    
    setTiltClass(newTiltClass);
  };
  
  const handleMouseLeave = () => {
    setTiltClass('');
  };
  
  const toggleCollapse = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };
  
  return (
    <CardContainer 
      ref={cardRef}
      fullWidth={fullWidth} 
      padding={padding} 
      elevation={elevation}
      hoverEffect={hoverEffect}
      className={`${className || ''} ${tiltClass}`}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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