import React from 'react';
import styled, { keyframes } from 'styled-components';

interface GlobalLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  compact?: boolean;
}

const radarSweep = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const blipPulse = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div<{ $fullScreen?: boolean; $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${props => props.$fullScreen ? `
    position: fixed;
    inset: 0;
    background: ${props.theme.colors?.background || '#0a0a0b'};
    z-index: 9999;
  ` : props.$compact ? `
    padding: 24px;
    width: 100%;
  ` : `
    min-height: 300px;
    width: 100%;
  `}
  animation: ${fadeIn} 0.3s ease-out;
`;

const RadarContainer = styled.div<{ $compact?: boolean }>`
  position: relative;
  width: ${props => props.$compact ? '120px' : '160px'};
  height: ${props => props.$compact ? '120px' : '160px'};
  border-radius: 50%;
  overflow: hidden;
  background: ${props => props.theme.name === 'dark'
    ? 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 70%, transparent 100%)'
    : 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 70%, transparent 100%)'
  };
`;

const RadarSweep = styled.div`
  position: absolute;
  inset: 0;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(139, 92, 246, 0.6) 5deg,
    rgba(139, 92, 246, 0.3) 15deg,
    transparent 30deg
  );
  animation: ${radarSweep} 2.5s linear infinite;
  filter: blur(1px);
`;

const RadarRing = styled.div<{ $size: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${props => props.$size}%;
  height: ${props => props.$size}%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 50%;
`;

const CenterDot = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  background: #8b5cf6;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
`;

const MentionBlip = styled.div<{ $top: string; $left: string; $delay: string; $size?: number }>`
  position: absolute;
  width: ${props => props.$size || 6}px;
  height: ${props => props.$size || 6}px;
  background: #a78bfa;
  border-radius: 50%;
  top: ${props => props.$top};
  left: ${props => props.$left};
  animation: ${blipPulse} 2.5s ease-in-out infinite;
  animation-delay: ${props => props.$delay};
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.6);
`;

const LoadingText = styled.div<{ $compact?: boolean }>`
  margin-top: ${props => props.$compact ? '16px' : '24px'};
  font-size: ${props => props.$compact ? '13px' : '14px'};
  font-weight: 500;
  color: ${props => props.theme.colors?.text || '#fff'};
  letter-spacing: 0.05em;
  opacity: 0.9;
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors?.text || '#fff'} 0%,
    rgba(139, 92, 246, 0.8) 50%,
    ${props => props.theme.colors?.text || '#fff'} 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 2s ease-in-out infinite;
`;

const SubText = styled.div<{ $compact?: boolean }>`
  margin-top: ${props => props.$compact ? '4px' : '8px'};
  font-size: ${props => props.$compact ? '11px' : '12px'};
  color: ${props => props.theme.colors?.textSecondary || 'rgba(255,255,255,0.5)'};
  opacity: 0.6;
`;

const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  message = "Processing",
  subMessage,
  fullScreen = true,
  compact = false
}) => {
  return (
    <Container $fullScreen={fullScreen} $compact={compact}>
      <RadarContainer $compact={compact}>
        <RadarSweep />

        {/* Radar rings - cleaner with fewer rings */}
        <RadarRing $size={40} />
        <RadarRing $size={70} />
        <RadarRing $size={100} />

        {/* Center dot */}
        <CenterDot />

        {/* Fewer, more subtle blips */}
        <MentionBlip $top="30%" $left="65%" $delay="0s" $size={5} />
        <MentionBlip $top="55%" $left="30%" $delay="0.8s" $size={4} />
        <MentionBlip $top="70%" $left="60%" $delay="1.6s" $size={5} />
      </RadarContainer>

      <LoadingText $compact={compact}>{message}</LoadingText>
      {subMessage && <SubText $compact={compact}>{subMessage}</SubText>}
    </Container>
  );
};

export default GlobalLoader;