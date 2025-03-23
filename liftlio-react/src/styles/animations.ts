import { keyframes } from 'styled-components';

// Animation keyframes
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

export const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

export const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
`;

// Signal animation keyframe
export const signalPulse = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.8;
  }
  70% {
    opacity: 0;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
`;

// LED flow animation keyframe
export const ledFlow = keyframes`
  0%, 15% {
    opacity: 0;
    transform: translateX(-10px);
  }
  20%, 30% {
    opacity: 1;
    transform: translateX(0);
  }
  35%, 100% {
    opacity: 0;
    transform: translateX(10px);
  }
`;

// Modern digital pulse animation
export const digitalPulse = keyframes`
  0% {
    background-position: -20px 0;
    opacity: 0.05;
  }
  50% {
    opacity: 0.15;
  }
  100% {
    background-position: 20px 0;
    opacity: 0.05;
  }
`;

// Ultra subtle card highlight animation
export const subtleHighlight = keyframes`
  0% {
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
  100% {
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
  }
`;

// Minimal tech interface scan
export const interfaceScan = keyframes`
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  50% {
    opacity: 0.08;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
`;

// Gentle indicator pulse
export const indicatorPulse = keyframes`
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
`;

// Border top highlight effect
export const borderGlow = keyframes`
  0%, 100% {
    box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
  }
`;

// Funnel arrow animation
export const funnelArrow = keyframes`
  0% { transform: translateX(0) translateY(0); opacity: 0.4; }
  50% { transform: translateX(6px) translateY(0); opacity: 0.9; }
  100% { transform: translateX(0) translateY(0); opacity: 0.4; }
`;

// Button animations
export const rippleEffect = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
`;

export const buttonHoverEffect = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
  100% {
    transform: translateY(0);
  }
`;

// Card animations
export const cardHoverEffect = keyframes`
  0% {
    transform: translateY(0);
    box-shadow: ${props => props.theme?.shadows?.sm || '0 2px 5px rgba(0,0,0,0.1)'};
  }
  100% {
    transform: translateY(-3px);
    box-shadow: ${props => props.theme?.shadows?.md || '0 4px 12px rgba(0,0,0,0.15)'};
  }
`;

// Sidebar animation
export const sidebarHoverEffect = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Skeleton loading animation
export const skeletonAnimation = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;