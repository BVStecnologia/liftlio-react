import { css } from 'styled-components';

// Animações de página/componente
export const pageTransition = css`
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.4s ease, transform 0.4s ease;
  
  &.active {
    opacity: 1;
    transform: translateY(0);
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
`;

// Animações para loaders e skeletons
export const skeletonAnimation = css`
  background: linear-gradient(
    90deg, 
    ${props => props.theme.colors.secondary} 25%, 
    ${props => props.theme.colors.tertiaryLight} 50%, 
    ${props => props.theme.colors.secondary} 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  
  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${props => props.theme.colors.tertiaryLight};
  }
`;

// Animação para spinner/loader
export const spinnerAnimation = css`
  border: 3px solid ${props => props.theme.colors.tertiary};
  border-top: 3px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spinner 1s linear infinite;
  
  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// Efeito ripple para botões
export const rippleEffect = css`
  position: relative;
  overflow: hidden;
  
  &:after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%);
    transform: scale(0);
    opacity: 0;
    transition: transform 0.3s, opacity 0.3s;
  }
  
  &:active:after {
    transform: scale(3);
    opacity: 0;
    transition: 0s;
  }
`;

// Efeito hover para itens de sidebar
export const sidebarHoverEffect = css`
  &:hover {
    background-color: ${props => props.theme.colors.gradient.hoverOverlay};
    transition: background-color 0.3s ease;
  }
`;

// Efeito hover para botões principais
export const buttonHoverEffect = css`
  &:hover {
    background-color: ${props => props.theme.colors.primaryLight};
    transform: translateY(-1px);
    transition: all 0.3s ease;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// Efeito hover para cards
export const cardHoverEffect = css`
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease;
  }
`;

// Animação de linha de gráfico
export const chartLineAnimation = css`
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 1.5s ease forwards;
  
  @keyframes drawLine {
    to {
      stroke-dashoffset: 0;
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
  }
`;