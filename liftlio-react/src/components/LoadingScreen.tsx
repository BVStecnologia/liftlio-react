import React from 'react';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${props => props.theme.colors.bg.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const LoadingContent = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.text.primary};
`;

const LoadingSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 3px solid ${props => props.theme.colors.border.primary};
  border-top-color: ${props => props.theme.colors.accent.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.text.secondary};
`;

const LoadingScreen: React.FC = () => {
  return (
    <LoadingContainer>
      <LoadingContent>
        <LoadingSpinner />
        <LoadingText>Loading...</LoadingText>
      </LoadingContent>
    </LoadingContainer>
  );
};

export default LoadingScreen;