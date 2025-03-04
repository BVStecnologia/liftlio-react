import React from 'react';
import styled, { keyframes } from 'styled-components';
import * as FaIcons from 'react-icons/fa';

interface SentimentIndicatorProps {
  percentage: number;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  showIcon?: boolean;
}

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    transform: scale(1);
  }
`;

const strokeAnimation = keyframes`
  0% {
    stroke-dashoffset: 283;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const sizeDimensions = {
  small: { width: '50px', height: '50px', fontSize: '0.8rem', iconSize: '0.7rem' },
  medium: { width: '70px', height: '70px', fontSize: '1rem', iconSize: '1rem' },
  large: { width: '90px', height: '90px', fontSize: '1.2rem', iconSize: '1.2rem' }
};

const SentimentContainer = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: ${props => sizeDimensions[props.size].width};
  height: ${props => sizeDimensions[props.size].height};
`;

const ProgressCircle = styled.svg<{ percentage: number; animated: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  
  circle {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    stroke-dasharray: 283;
    stroke-dashoffset: ${props => 283 - (283 * props.percentage) / 100};
    transition: stroke-dashoffset 1s ease;
    animation: ${props => props.animated ? strokeAnimation : 'none'} 1.5s ease-out forwards;
  }
`;

const SentimentCircle = styled.div<{ percentage: number; size: 'small' | 'medium' | 'large'; animated: boolean }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: white;
  color: ${({ percentage, theme }) => {
    if (percentage >= 80) return theme.colors.sentiment.positive;
    if (percentage >= 50) return theme.colors.success;
    if (percentage >= 40) return theme.colors.sentiment.neutral;
    return theme.colors.sentiment.negative;
  }};
  font-weight: bold;
  box-shadow: ${props => props.theme.shadows.md};
  position: relative;
  animation: ${props => props.animated ? pulse : 'none'} 2s infinite;
  font-size: ${props => sizeDimensions[props.size].fontSize};
  
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    right: -5px;
    bottom: -5px;
    left: -5px;
    border-radius: 50%;
    z-index: -1;
    background: white;
    opacity: 0.5;
  }
`;

const SentimentText = styled.span`
  font-weight: ${props => props.theme.fontWeights.bold};
`;

const IconWrapper = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  margin-top: 4px;
  font-size: ${props => sizeDimensions[props.size].iconSize};
`;

const getSentimentIcon = (percentage: number) => {
  if (percentage >= 80) return FaIcons.FaSmileBeam;
  if (percentage >= 50) return FaIcons.FaSmile;
  if (percentage >= 40) return FaIcons.FaMeh;
  return FaIcons.FaFrown;
};

const getSentimentColor = (percentage: number, theme: any) => {
  if (percentage >= 80) return '#00C781'; // Green
  if (percentage >= 70) return '#34CDBB'; // Teal
  if (percentage >= 60) return '#68AEFF'; // Blue
  if (percentage >= 50) return '#FFAA15'; // Yellow
  return '#FF4040'; // Red
};

const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({ 
  percentage, 
  size = 'medium',
  animated = true,
  showIcon = true
}) => {
  const sentimentColor = (theme: any) => getSentimentColor(percentage, theme);
  const SentimentIcon = getSentimentIcon(percentage);
  
  return (
    <SentimentContainer size={size}>
      <ProgressCircle 
        viewBox="0 0 100 100"
        percentage={percentage}
        animated={animated}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={sentimentColor}
        />
      </ProgressCircle>
      
      <SentimentCircle percentage={percentage} size={size} animated={animated}>
        <SentimentText>{percentage}%</SentimentText>
        {showIcon && (
          <IconWrapper size={size}>
            {React.createElement(SentimentIcon)}
          </IconWrapper>
        )}
      </SentimentCircle>
    </SentimentContainer>
  );
};

export default SentimentIndicator;