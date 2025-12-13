import React from 'react';
import styled, { keyframes } from 'styled-components';
import GlobalLoader from '../GlobalLoader';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  thickness?: number;
  speed?: number;
  fullPage?: boolean;
  text?: string;
  withOverlay?: boolean;
}

// Mini spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1); }
`;

// Size mappings
const sizeMap = {
  sm: 16,
  md: 24,
  lg: 36,
  xl: 48
};

const MiniSpinnerContainer = styled.div<{ $size: number }>`
  position: relative;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const SpinnerRing = styled.div<{ $size: number; $color?: string }>`
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border: 2px solid ${props => props.$color || props.theme.colors?.primary || '#8b5cf6'}20;
  border-top-color: ${props => props.$color || props.theme.colors?.primary || '#8b5cf6'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SpinnerDot = styled.div<{ $size: number; $color?: string }>`
  position: absolute;
  width: ${props => Math.max(4, props.$size * 0.25)}px;
  height: ${props => Math.max(4, props.$size * 0.25)}px;
  background: ${props => props.$color || props.theme.colors?.primary || '#8b5cf6'};
  border-radius: 50%;
  animation: ${pulse} 1s ease-in-out infinite;
`;

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  fullPage = false,
  text,
  withOverlay = false
}) => {
  // For fullPage or withOverlay, use the full GlobalLoader
  if (fullPage || withOverlay) {
    const message = text || "Processing";
    const subMessage = size === 'sm' ? "" : "Please wait";
    return (
      <GlobalLoader
        message={message}
        subMessage={subMessage}
        fullScreen={true}
      />
    );
  }

  // For inline/small spinners, use simple animated spinner
  const pixelSize = sizeMap[size] || sizeMap.md;

  return (
    <MiniSpinnerContainer $size={pixelSize}>
      <SpinnerRing $size={pixelSize} $color={color} />
      <SpinnerDot $size={pixelSize} $color={color} />
    </MiniSpinnerContainer>
  );
};

export default Spinner;