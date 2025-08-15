import React from 'react';
import styled, { keyframes } from 'styled-components';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
  position: relative;
  overflow: hidden;
`;

const GlobeContainer = styled.div`
  position: relative;
  width: 400px;
  height: 400px;
`;

const GlobeImage = styled.div`
  width: 100%;
  height: 100%;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93c-3.94-.49-7-3.858-7-7.93 0-.552.059-1.09.169-1.607l4.831 4.831v1c0 1.104.896 2 2 2v1.776zm6.294-2.636A1.998 1.998 0 0016 16h-1v-3c0-.552-.448-1-1-1H8v-2h2c.552 0 1-.448 1-1V7h2c1.104 0 2-.896 2-2v-.411A7.996 7.996 0 0120 12c0 2.137-.84 4.078-2.206 5.294z"/></svg>') center no-repeat;
  background-size: 80%;
  animation: ${rotate} 30s linear infinite;
  opacity: 0.2;
`;

const OrbitRing = styled.div<{ delay?: number; size?: number }>`
  position: absolute;
  border: 2px solid rgba(139, 92, 246, 0.2);
  border-radius: 50%;
  width: ${props => props.size || 100}%;
  height: ${props => props.size || 100}%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${rotate} ${props => 20 + (props.delay || 0) * 5}s linear infinite reverse;
`;

const DataPoint = styled.div<{ top: string; left: string; delay?: number }>`
  position: absolute;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #ff00ff, #00ffff);
  border-radius: 50%;
  top: ${props => props.top};
  left: ${props => props.left};
  animation: ${pulse} ${props => 2 + (props.delay || 0)}s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.6);
  
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: 50%;
    animation: ${pulse} 2s ease-in-out infinite;
    animation-delay: ${props => props.delay || 0}s;
  }
`;

const InfoText = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: #8b5cf6;
  font-size: 14px;
  font-weight: 600;
`;

export default function GlobeFallback() {
  return (
    <Container>
      <GlobeContainer>
        <GlobeImage />
        <OrbitRing delay={0} size={120} />
        <OrbitRing delay={1} size={140} />
        <OrbitRing delay={2} size={160} />
        
        <DataPoint top="20%" left="30%" delay={0} />
        <DataPoint top="40%" left="70%" delay={0.5} />
        <DataPoint top="60%" left="25%" delay={1} />
        <DataPoint top="30%" left="80%" delay={1.5} />
        <DataPoint top="70%" left="60%" delay={2} />
        <DataPoint top="50%" left="40%" delay={2.5} />
      </GlobeContainer>
      
      <InfoText>
        Live Global Traffic Visualization
      </InfoText>
    </Container>
  );
}