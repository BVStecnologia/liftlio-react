import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useTheme } from '../../context/ThemeContext';

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

const SpinnerOverlay = styled.div<{ fullPage: boolean; $isDarkTheme: boolean }>`
  position: ${props => props.fullPage ? 'fixed' : 'absolute'};
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: ${props => props.$isDarkTheme 
    ? 'rgba(0, 0, 0, 0.85)' 
    : 'rgba(255, 255, 255, 0.85)'};
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

const SpinnerText = styled.div<{ size: string; $isDarkTheme: boolean }>`
  margin-top: 16px;
  color: ${props => props.$isDarkTheme ? '#E4E4E7' : '#2D3E50'};
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

const SpinnerDot = styled.div<{ delay: number; $isDarkTheme: boolean }>`
  width: 8px;
  height: 8px;
  background-color: ${props => props.$isDarkTheme ? '#3B82F6' : '#4F46E5'};
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
  color,
  thickness = 2,
  speed = 0.8,
  fullPage = false,
  text,
  withOverlay = false
}) => {
  const { isDarkMode } = useTheme();
  
  // Use theme-aware default color if none provided
  const defaultColor = isDarkMode ? '#3B82F6' : '#4F46E5';
  const actualColor = color || defaultColor;
  
  // Convert hex color to RGB for opacity control
  const rgbColor = hexToRgb(actualColor);
  
  const spinner = (
    <SpinnerContainer fullPage={fullPage}>
      <SpinnerElement 
        size={size} 
        color={rgbColor} 
        thickness={thickness} 
        speed={speed}
      />
      {text && <SpinnerText size={size} $isDarkTheme={isDarkMode}>{text}</SpinnerText>}
      <DotsContainer>
        <SpinnerDot delay={0} $isDarkTheme={isDarkMode} />
        <SpinnerDot delay={0.3} $isDarkTheme={isDarkMode} />
        <SpinnerDot delay={0.6} $isDarkTheme={isDarkMode} />
      </DotsContainer>
    </SpinnerContainer>
  );
  
  if (withOverlay || fullPage) {
    return (
      <SpinnerOverlay fullPage={fullPage} $isDarkTheme={isDarkMode}>
        {spinner}
      </SpinnerOverlay>
    );
  }
  
  return spinner;
};

export default Spinner;