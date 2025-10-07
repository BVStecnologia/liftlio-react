import React, { useEffect, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const LoadingOverlay = styled.div<{ $show: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.theme.colors.background}E6;
  display: ${props => props.$show ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 8px;
  backdrop-filter: blur(4px);
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid ${props => props.theme.colors.borderLight};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .text {
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const FormContainer = styled.div<{ $darkMode?: boolean; $language?: string; $buttonText?: string }>`
  position: relative;

  .sq-payment-form {
    width: 100%;
  }
  
  /* Estilização dos campos de entrada do Square */
  #sq-card-number, #sq-expiration-date, #sq-cvv, #sq-postal-code {
    border: 1px solid ${props => props.theme.colors.borderLight};
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 16px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text.primary} !important;
    transition: all 0.3s ease;
    
    &:focus {
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 3px ${props => props.theme.colors.primaryAlpha};
      outline: none;
    }
    
    &::placeholder {
      color: ${props => props.theme.colors.textSecondary};
    }
  }
  
  /* Força cor do texto dentro dos iframes do Square */
  .sq-input {
    color: ${props => props.theme.colors.text.primary} !important;
  }
  
  /* Fix para inputs do Square no modo escuro */
  iframe {
    color-scheme: ${props => props.$darkMode ? 'dark' : 'light'};
  }

  /* Estilos adicionais para o Square no tema escuro */
  ${props => props.$darkMode && `
    /* Força texto branco nos inputs quando tema escuro */
    input[type="text"],
    input[type="tel"],
    input[type="number"] {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    
    /* Fix específico para Square SDK inputs */
    [id*="sq-"] {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
  `}
  
  /* Container dos campos */
  .sq-input-container {
    margin-bottom: 24px;
    position: relative;
  }
  
  /* Labels */
  .sq-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: ${props => props.theme.colors.text.secondary};
  }
  
  /* Mensagens de erro */
  .sq-error-message {
    color: ${props => props.theme.colors.error};
    font-size: 14px;
    margin-top: 4px;
  }
  
  /* Estiliza o botão do Square para parecer com nosso design */
  #rswp-card-button,
  #sq-creditcard {
    width: 100%;
    padding: 16px 32px;
    background: ${props => props.theme.colors.gradient.landing};
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 24px;
    position: relative;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    /* Esconde o texto original "Pay" */
    font-size: 0 !important;

    /* Adiciona nosso texto customizado */
    &::before {
      content: "🔒 ${props => props.$buttonText || (props.$language === 'pt' ? 'Assinar Agora' : 'Subscribe Now')}";
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* Estado de loading */
    &[disabled]::before {
      content: "⏳ ${props => props.$language === 'pt' ? 'Processando...' : 'Processing...'}";
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }
  }
  
  /* Ícones do Square */
  .sq-input-container svg {
    color: ${props => props.theme.colors.textSecondary};
  }
  
  /* Estado de carregamento */
  .sq-loading {
    border-color: ${props => props.theme.colors.primary} !important;
  }
`;

interface SquarePaymentFormProps {
  onCardTokenized: (token: string) => void;
  applicationId?: string;
  locationId?: string;
  showSubmitButton?: boolean;
  isLoading?: boolean;
  processingText?: string;
  buttonText?: string; // Texto customizado para o botão (ex: "Add Card" ou "Subscribe Now")
}

const SquarePaymentFormComponent: React.FC<SquarePaymentFormProps> = ({
  onCardTokenized,
  applicationId,
  locationId,
  showSubmitButton = false,
  isLoading = false,
  processingText,
  buttonText,
}) => {
  const { language } = useLanguage();
  const { theme, isDarkMode } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Determina se estamos em desenvolvimento ou produção
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Usa o Application ID e Location ID corretos baseado no ambiente
  const defaultAppId = isDevelopment 
    ? process.env.REACT_APP_SQUARE_SANDBOX_APP_ID 
    : process.env.REACT_APP_SQUARE_PRODUCTION_APP_ID;
  
  const defaultLocationId = isDevelopment
    ? process.env.REACT_APP_SQUARE_SANDBOX_LOCATION_ID
    : process.env.REACT_APP_SQUARE_PRODUCTION_LOCATION_ID;
  
  const finalAppId = applicationId || defaultAppId || 'sandbox-sq0idb-PByA7HkE2t7VPpDLosWMxQ';
  const finalLocationId = locationId || defaultLocationId || 'L0DJCG1YFKXDZ';
  const handleCardTokenization = async (token: any) => {
    if (token.token) {
      setIsProcessing(true);
      onCardTokenized(token.token);
    }
  };
  
  // Atualiza o estado de processamento baseado na prop
  useEffect(() => {
    setIsProcessing(isLoading);
  }, [isLoading]);
  
  // Efeito para injetar estilos nos iframes do Square quando o tema muda
  useEffect(() => {
    const injectStyles = () => {
      const iframes = document.querySelectorAll('iframe[name*="card-number"], iframe[name*="expiration-date"], iframe[name*="cvv"], iframe[name*="postal-code"]');
      
      iframes.forEach((iframe: any) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const existingStyle = iframeDoc.getElementById('custom-square-styles');
            if (existingStyle) {
              existingStyle.remove();
            }
            
            const style = iframeDoc.createElement('style');
            style.id = 'custom-square-styles';
            style.textContent = `
              input {
                color: ${isDarkMode ? '#ffffff' : '#1a1a1a'} !important;
                -webkit-text-fill-color: ${isDarkMode ? '#ffffff' : '#1a1a1a'} !important;
              }
            `;
            iframeDoc.head.appendChild(style);
          }
        } catch (e) {
          // Ignora erros de cross-origin
        }
      });
    };
    
    // Aguarda os iframes carregarem
    const timer = setTimeout(injectStyles, 1000);
    
    // Re-injeta quando o tema muda
    const observer = new MutationObserver(() => {
      injectStyles();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isDarkMode]);

  // Remove o useEffect que estava tentando esconder o botão
  // Vamos aceitar que o botão existe e trabalhar com ele

  return (
    <FormContainer theme={theme} $darkMode={isDarkMode} $language={language} $buttonText={buttonText}>
      <LoadingOverlay $show={isProcessing} theme={theme}>
        <LoadingSpinner theme={theme}>
          <div className="spinner" />
          <div className="text">
            {processingText || (language === 'pt' ? 'Processando pagamento...' : 'Processing payment...')}
          </div>
        </LoadingSpinner>
      </LoadingOverlay>
      
      <PaymentForm
        applicationId={finalAppId}
        locationId={finalLocationId}
        cardTokenizeResponseReceived={handleCardTokenization}
        createPaymentRequest={() => ({
          countryCode: language === 'pt' ? 'BR' : 'US',
          currencyCode: language === 'pt' ? 'BRL' : 'USD',
          total: {
            amount: '0',
            label: language === 'pt' ? 'Total' : 'Total',
          },
        })}
      >
        <CreditCard />
      </PaymentForm>
    </FormContainer>
  );
};

export default SquarePaymentFormComponent;