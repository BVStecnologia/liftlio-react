import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const WarningBanner = styled.div`
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  padding: 12px 20px;
  margin: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Message = styled.div`
  flex: 1;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  background: #856404;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  
  &:hover {
    background: #6c5303;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #856404;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0 5px;
`;

export const ExtensionWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if warning was already shown this session
    const warningShown = sessionStorage.getItem('extensionWarningShown');
    if (warningShown) {
      return;
    }

    // Listen for extension errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message?.toLowerCase() || '';
      if (errorMessage.includes('chrome-extension://') || 
          errorMessage.includes('moz-extension://')) {
        setShowWarning(true);
        sessionStorage.setItem('extensionWarningShown', 'true');
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => setShowWarning(false), 300);
  };

  const handleOpenIncognito = () => {
    alert('Para abrir no modo incógnito:\n\n' +
          'Chrome: Ctrl+Shift+N (Windows/Linux) ou Cmd+Shift+N (Mac)\n' +
          'Firefox: Ctrl+Shift+P (Windows/Linux) ou Cmd+Shift+P (Mac)\n' +
          'Edge: Ctrl+Shift+N (Windows/Linux) ou Cmd+Shift+N (Mac)');
  };

  if (!showWarning || dismissed) {
    return null;
  }

  return (
    <WarningBanner>
      <Message>
        <strong>Aviso:</strong> Uma extensão do navegador está interferindo com a aplicação. 
        Para melhor experiência, considere desabilitar extensões ou usar o modo incógnito.
      </Message>
      <Actions>
        <Button onClick={handleOpenIncognito}>
          Modo Incógnito
        </Button>
        <Button onClick={() => window.open('chrome://extensions/', '_blank')}>
          Gerenciar Extensões
        </Button>
        <CloseButton onClick={handleDismiss} aria-label="Fechar">
          ×
        </CloseButton>
      </Actions>
    </WarningBanner>
  );
};