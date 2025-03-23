import React from 'react';
import styled, { keyframes } from 'styled-components';
import { skeletonAnimation } from '../../styles/animations';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  margin?: string;
  className?: string;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

// Pulse animation - simple fade in/out
const pulseAnimation = keyframes`
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.5;
  }
`;

// Wave animation - moving gradient
const waveAnimation = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const getAnimation = (animationType: string) => {
  switch (animationType) {
    case 'pulse':
      return `animation: ${pulseAnimation} 2s ease-in-out infinite;`;
    case 'wave':
      return `
        background: linear-gradient(
          90deg,
          rgba(165, 177, 183, 0.15) 25%,
          rgba(165, 177, 183, 0.25) 37%,
          rgba(165, 177, 183, 0.15) 63%
        );
        background-size: 400% 100%;
        animation: ${waveAnimation} 1.5s ease infinite;
      `;
    default:
      return 'animation: none;';
  }
};

const getBorderRadius = (variant: string, customRadius?: string) => {
  if (customRadius) return customRadius;
  
  switch (variant) {
    case 'circular':
      return '50%';
    case 'text':
      return '4px';
    case 'rectangular':
      return '0';
    default:
      return '8px';
  }
};

const SkeletonContainer = styled.div<SkeletonProps>`
  width: ${(props) => props.width || '100%'};
  height: ${(props) => props.height || '16px'};
  border-radius: ${(props) => getBorderRadius(props.variant || 'default', props.borderRadius)};
  margin: ${(props) => props.margin || '0'};
  background-color: rgba(165, 177, 183, 0.2); /* Based on dominant color (60%) */
  display: inline-block;
  position: relative;
  overflow: hidden;
  ${(props) => getAnimation(props.animation || 'wave')}
`;

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  margin,
  className,
  variant = 'default',
  animation = 'wave',
}) => {
  return (
    <SkeletonContainer
      width={width}
      height={height}
      borderRadius={borderRadius}
      margin={margin}
      className={className}
      variant={variant}
      animation={animation}
    />
  );
};

export const SkeletonText = ({ lines = 4 }: { lines?: number }) => (
  <div style={{ width: '100%' }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i}
        height="16px" 
        margin="0 0 8px 0" 
        width={i === lines - 1 ? '70%' : `${Math.floor(80 + Math.random() * 20)}%`}
        variant="text"
      />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div style={{ 
    width: '100%', 
    padding: '20px', 
    backgroundColor: '#ffffff', 
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(165, 177, 183, 0.2)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      <Skeleton variant="circular" width="48px" height="48px" />
      <div style={{ marginLeft: '16px', flex: 1 }}>
        <Skeleton height="20px" width="40%" margin="0 0 8px 0" variant="text" />
        <Skeleton height="16px" width="25%" variant="text" />
      </div>
    </div>
    <Skeleton height="180px" margin="0 0 16px 0" />
    <Skeleton height="16px" margin="0 0 8px 0" width="100%" variant="text" />
    <Skeleton height="16px" margin="0 0 8px 0" width="92%" variant="text" />
    <Skeleton height="16px" width="80%" variant="text" />
    
    <div style={{ display: 'flex', marginTop: '24px', justifyContent: 'space-between' }}>
      <Skeleton width="100px" height="36px" />
      <Skeleton width="100px" height="36px" />
    </div>
  </div>
);

export const SkeletonMetricCard = () => (
  <div style={{ 
    width: '100%', 
    padding: '20px', 
    backgroundColor: '#ffffff', 
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(165, 177, 183, 0.2)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    {/* Card top accent line */}
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      height: '4px', 
      background: 'linear-gradient(90deg, rgba(45, 62, 80, 0.6) 0%, rgba(45, 62, 80, 0.3) 100%)'
    }} />
    
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
      <Skeleton height="20px" width="40%" variant="text" />
      <Skeleton variant="circular" width="40px" height="40px" />
    </div>
    
    <Skeleton height="38px" width="60%" margin="0 0 12px 0" variant="text" />
    <Skeleton height="16px" width="35%" variant="text" />
  </div>
);

export const SkeletonAvatar = ({ size = '48px' }: { size?: string }) => (
  <Skeleton width={size} height={size} variant="circular" />
);

export const SkeletonButton = ({ width = '120px' }: { width?: string }) => (
  <Skeleton width={width} height="38px" borderRadius="8px" />
);

export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) => (
  <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(165, 177, 183, 0.2)' }}>
    {/* Table header */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      padding: '16px',
      backgroundColor: 'rgba(165, 177, 183, 0.1)',
      borderBottom: '1px solid rgba(165, 177, 183, 0.2)'
    }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height="20px" width="80%" variant="text" />
      ))}
    </div>
    
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        padding: '16px',
        borderBottom: rowIndex < rows - 1 ? '1px solid rgba(165, 177, 183, 0.2)' : 'none'
      }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton 
            key={colIndex} 
            height="16px" 
            width={`${Math.floor(60 + Math.random() * 30)}%`} 
            variant="text" 
          />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;