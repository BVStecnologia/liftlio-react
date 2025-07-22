import React from 'react';
import styled, { keyframes } from 'styled-components';

interface GlobalLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

const radarSweep = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const blipAppear = keyframes`
  0%, 100% { 
    opacity: 0; 
    transform: scale(0); 
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

const Container = styled.div<{ fullScreen?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${props => props.fullScreen ? `
    position: fixed;
    inset: 0;
    background: ${props.theme.colors.background};
    z-index: 9999;
  ` : `
    min-height: 400px;
    width: 100%;
  `}
  animation: ${fadeIn} 0.3s ease-out;
`;

const RadarContainer = styled.div`
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(
    circle, 
    transparent 0%, 
    ${props => `${props.theme.colors.primary}15`} 50%,
    ${props => `${props.theme.colors.primary}05`} 100%
  );
  border: 1px solid ${props => `${props.theme.colors.primary}20`};
`;

const RadarSweep = styled.div`
  position: absolute;
  inset: 0;
  background: conic-gradient(
    from 0deg, 
    transparent 0deg,
    ${props => props.theme.colors.primary} 10deg,
    transparent 30deg
  );
  animation: ${radarSweep} 3s linear infinite;
  opacity: 0.8;
`;

const RadarRing = styled.div<{ inset: string }>`
  position: absolute;
  inset: ${props => props.inset};
  border: 1px solid ${props => `${props.theme.colors.primary}15`};
  border-radius: 50%;
`;

const MentionBlip = styled.div<{ top: string; left: string; delay: string }>`
  position: absolute;
  width: 8px;
  height: 8px;
  background: ${props => props.theme.colors.primaryLight};
  border-radius: 50%;
  top: ${props => props.top};
  left: ${props => props.left};
  animation: ${blipAppear} 3s ease-in-out infinite;
  animation-delay: ${props => props.delay};
  box-shadow: 
    0 0 20px ${props => props.theme.colors.primaryLight},
    0 0 40px ${props => `${props.theme.colors.primaryLight}50`};
`;

const LoadingText = styled.div`
  margin-top: 32px;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.9;
`;

const SubText = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  opacity: 0.7;
`;

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ 
  message = "Initializing", 
  subMessage = "Loading Liftlio",
  fullScreen = true 
}) => {
  return (
    <Container fullScreen={fullScreen}>
      <RadarContainer>
        <RadarSweep />
        
        {/* Radar rings */}
        <RadarRing inset="20%" />
        <RadarRing inset="40%" />
        <RadarRing inset="60%" />
        
        {/* Mention blips - positions calculated for better distribution */}
        <MentionBlip top="25%" left="70%" delay="0s" />
        <MentionBlip top="60%" left="35%" delay="0.8s" />
        <MentionBlip top="45%" left="55%" delay="1.6s" />
        <MentionBlip top="30%" left="30%" delay="2.4s" />
        <MentionBlip top="70%" left="65%" delay="3.2s" />
      </RadarContainer>
      
      <LoadingText>{message}</LoadingText>
      <SubText>{subMessage}</SubText>
    </Container>
  );
};

export default GlobalLoader;