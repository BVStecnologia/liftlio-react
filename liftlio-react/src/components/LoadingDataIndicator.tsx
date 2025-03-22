import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const ProgressContainer = styled.div`
  width: 100%;
  background: rgba(240, 240, 250, 0.4);
  border-radius: 8px;
  padding: 4px;
  margin: 15px 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
`;

const ProgressBar = styled.div`
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, 
    #2D1D42 0%, 
    #4E0EB3 30%, 
    #833AF4 60%, 
    #4E0EB3 80%, 
    #2D1D42 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  transition: width 0.5s ease;
`;

const ProgressText = styled.div`
  text-align: center;
  margin-top: 10px;
  font-size: 14px;
  color: ${props => props.theme.colors.darkGrey};
`;

const LoadingDataIndicator: React.FC = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        // Aumentar gradualmente até 95%, depois fica esperando
        if (prev < 95) return Math.min(prev + Math.random() * 10, 95);
        return prev;
      });
    }, 3000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <ProgressContainer>
      <ProgressBar style={{ width: `${progress}%` }} />
      <ProgressText>
        {progress < 30 ? 'Starting data collection...' :
         progress < 60 ? 'Processing mentions...' :
         progress < 90 ? 'Analyzing sentiment...' :
         'Finalizing. This may take a few minutes...'}
      </ProgressText>
    </ProgressContainer>
  );
};

export default LoadingDataIndicator;