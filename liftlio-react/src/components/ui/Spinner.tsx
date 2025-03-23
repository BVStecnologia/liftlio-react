import React from 'react';
import styled, { keyframes } from 'styled-components';
import { COLORS } from '../../styles/colors';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  thickness?: number;
  speed?: number;
  fullPage?: boolean;
  text?: string;
  withOverlay?: boolean;
}

const spinAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const breatheAnimation = keyframes`
  0%, 100% { opacity: 0.9; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.93); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(45, 62, 80, 0.5); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(45, 62, 80, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(45, 62, 80, 0); }
`;

const SpinnerOverlay = styled.div<{ fullPage: boolean }>`
  position: ${props => props.fullPage ? 'fixed' : 'absolute'};
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(4px);
  padding: 20px;
`;

const SpinnerContainer = styled.div<{ fullPage: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: ${props => props.fullPage ? 'auto' : '100%'};
`;

const SpinnerElement = styled.div<{ 
  size: string; 
  color: string; 
  thickness: number;
  speed: number;
}>`
  width: ${props => {
    switch (props.size) {
      case 'sm': return '20px';
      case 'md': return '32px';
      case 'lg': return '48px';
      case 'xl': return '64px';
      default: return '32px';
    }
  }};
  
  height: ${props => {
    switch (props.size) {
      case 'sm': return '20px';
      case 'md': return '32px';
      case 'lg': return '48px';
      case 'xl': return '64px';
      default: return '32px';
    }
  }};
  
  border: ${props => `${props.thickness}px solid rgba(${props.color}, 0.2)`};
  border-top: ${props => `${props.thickness}px solid rgba(${props.color}, 1)`};
  border-radius: 50%;
  animation: ${spinAnimation} ${props => props.speed}s linear infinite;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
`;

const SpinnerText = styled.div<{ size: string }>`
  margin-top: 16px;
  color: ${COLORS.TEXT.ON_LIGHT};
  font-weight: 500;
  font-size: ${props => {
    switch (props.size) {
      case 'sm': return '12px';
      case 'md': return '14px';
      case 'lg': return '16px';
      case 'xl': return '18px';
      default: return '14px';
    }
  }};
  text-align: center;
  animation: ${breatheAnimation} 2s ease-in-out infinite;
`;

const SpinnerDot = styled.div<{ delay: number }>`
  width: 8px;
  height: 8px;
  background-color: ${COLORS.ACCENT};
  border-radius: 50%;
  margin: 2px;
  animation: ${pulseAnimation} 1.5s ease-in-out infinite;
  animation-delay: ${props => props.delay}s;
`;

const DotsContainer = styled.div`
  display: flex;
  margin-top: 10px;
`;

// Extract RGB values from a hex color code
const hexToRgb = (hex: string) => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return CSS RGB string
  return `${r}, ${g}, ${b}`;
};

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = COLORS.ACCENT,
  thickness = 2,
  speed = 0.8,
  fullPage = false,
  text,
  withOverlay = false
}) => {
  // Convert hex color to RGB for opacity control
  const rgbColor = hexToRgb(color);
  
  const spinner = (
    <SpinnerContainer fullPage={fullPage}>
      <SpinnerElement 
        size={size} 
        color={rgbColor} 
        thickness={thickness} 
        speed={speed}
      />
      {text && <SpinnerText size={size}>{text}</SpinnerText>}
      <DotsContainer>
        <SpinnerDot delay={0} />
        <SpinnerDot delay={0.3} />
        <SpinnerDot delay={0.6} />
      </DotsContainer>
    </SpinnerContainer>
  );
  
  if (withOverlay || fullPage) {
    return (
      <SpinnerOverlay fullPage={fullPage}>
        {spinner}
      </SpinnerOverlay>
    );
  }
  
  return spinner;
};

export default Spinner;