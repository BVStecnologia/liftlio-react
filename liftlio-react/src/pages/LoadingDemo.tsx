import React from 'react';
import styled from 'styled-components';
import LoadingExample from '../components/LoadingExample';
import { COLORS } from '../styles/colors';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  margin-bottom: 24px;
  color: ${COLORS.ACCENT};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LoadingDemo: React.FC = () => {
  return (
    <PageContainer>
      <PageTitle>Demonstração do Componente de Loading Global</PageTitle>
      <p style={{ marginBottom: '32px', color: COLORS.TEXT.SECONDARY }}>
        Esta página demonstra o uso do componente de loading global que foi criado para ser utilizado em todas as páginas do aplicativo.
      </p>
      
      <LoadingExample />
    </PageContainer>
  );
};

export default LoadingDemo;