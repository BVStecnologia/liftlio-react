import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';

// Reset de estilos coloridos para páginas institucionais
const InstitutionalReset = createGlobalStyle`
  /* Reset completo para páginas institucionais */
  html, body {
    background: ${props => props.theme.colors.background} !important;
    background-color: ${props => props.theme.colors.background} !important;
    background-image: none !important;
  }
  
  /* Remove TODOS os gradientes e fundos coloridos */
  *, *::before, *::after {
    background-image: none !important;
  }
  
  /* Reset específico para elementos que podem ter gradientes */
  main, section, div, article, aside, header, footer {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    
    /* Permite backgrounds específicos definidos pelos componentes */
    &[class*="Container"] {
      background: ${props => props.theme.colors.background} !important;
      background-color: ${props => props.theme.colors.background} !important;
    }
    
    &[class*="Section"],
    &[class*="Content"] {
      background: transparent !important;
      background-color: transparent !important;
    }
    
    &[class*="Card"],
    &[class*="Feature"] {
      background: ${props => props.theme.colors.cardBg || props.theme.colors.bg.secondary} !important;
      background-color: ${props => props.theme.colors.cardBg || props.theme.colors.bg.secondary} !important;
    }
  }
  
  /* Headers específicos */
  header {
    background: ${props => props.theme.colors.background} !important;
    background-color: ${props => props.theme.colors.background} !important;
    border-bottom: 1px solid ${props => props.theme.colors.borderLight || props.theme.colors.border.primary} !important;
  }
  
  /* Remove cores neon/verde de textos */
  h1, h2, h3, h4, h5, h6, p, span, div, a {
    color: inherit !important;
    
    /* Exceto para elementos com classes específicas de cor */
    &[class*="primary"] {
      color: ${props => props.theme.colors.text.primary} !important;
    }
    
    &[class*="secondary"] {
      color: ${props => props.theme.colors.text.secondary} !important;
    }
  }
  
  /* Remove qualquer estilo inline com gradiente */
  [style*="background: linear-gradient"],
  [style*="background-image: linear-gradient"],
  [style*="background: #00ff00"],
  [style*="background-color: #00ff00"],
  [style*="background: #00FF00"],
  [style*="background-color: #00FF00"] {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
  }
`;

const InstitutionalContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  
  /* Garante que o container principal não tenha gradientes */
  & > * {
    background: transparent;
  }
`;

interface InstitutionalWrapperProps {
  children: React.ReactNode;
}

const InstitutionalWrapper: React.FC<InstitutionalWrapperProps> = ({ children }) => {
  return (
    <>
      <InstitutionalReset />
      <InstitutionalContainer>
        {children}
      </InstitutionalContainer>
    </>
  );
};

export default InstitutionalWrapper;