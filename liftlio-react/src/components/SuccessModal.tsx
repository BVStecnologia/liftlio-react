import React from 'react';
import styled, { keyframes } from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const checkmark = keyframes`
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
`;

const Modal = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border-radius: 24px;
  padding: 48px;
  max-width: 480px;
  width: 90%;
  animation: ${fadeIn} 0.3s ease-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: ${props => props.theme.colors.gradient.landing};
    opacity: 0.1;
    transform: rotate(45deg);
  }
`;

const IconWrapper = styled.div`
  width: 120px;
  height: 120px;
  margin: 0 auto 32px;
  position: relative;
  
  svg {
    width: 100%;
    height: 100%;
    color: ${props => props.theme.colors.success};
    filter: drop-shadow(0 4px 20px ${props => props.theme.colors.success}40);
    animation: ${fadeIn} 0.5s ease-out;
  }
`;

const Title = styled.h2`
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 32px;
`;

const InfoSection = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid ${props => props.theme.colors.borderLight};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const InfoValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
`;

const CTAButton = styled.button`
  width: 100%;
  padding: 18px 32px;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
    
    &::before {
      width: 300px;
      height: 300px;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Confetti = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
`;

interface SuccessModalProps {
  show: boolean;
  onClose: () => void;
  planName: string;
  amount: string;
  nextBilling: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  show,
  onClose,
  planName,
  amount,
  nextBilling
}) => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  
  if (!show) return null;
  
  const translations = {
    pt: {
      title: 'Parabéns! 🎉',
      subtitle: 'Sua assinatura foi criada com sucesso',
      plan: 'Plano',
      amount: 'Valor',
      nextBilling: 'Próxima cobrança',
      cta: 'Ir para o Dashboard',
      welcome: 'Bem-vindo ao Liftlio!'
    },
    en: {
      title: 'Congratulations! 🎉',
      subtitle: 'Your subscription was created successfully',
      plan: 'Plan',
      amount: 'Amount',
      nextBilling: 'Next billing',
      cta: 'Go to Dashboard',
      welcome: 'Welcome to Liftlio!'
    }
  };
  
  const t = translations[language as keyof typeof translations];
  
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <IconWrapper>
          {renderIcon(FaIcons.FaCheckCircle)}
        </IconWrapper>
        
        <Title>{t.title}</Title>
        <Subtitle>{t.subtitle}</Subtitle>
        
        <InfoSection>
          <InfoRow>
            <InfoLabel>
              {renderIcon(FaIcons.FaCreditCard)}
              {t.plan}
            </InfoLabel>
            <InfoValue>{planName}</InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>
              {renderIcon(FaIcons.FaDollarSign)}
              {t.amount}
            </InfoLabel>
            <InfoValue>{amount}</InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>
              {renderIcon(FaIcons.FaCalendarAlt)}
              {t.nextBilling}
            </InfoLabel>
            <InfoValue>{nextBilling}</InfoValue>
          </InfoRow>
        </InfoSection>
        
        <CTAButton onClick={onClose}>
          {t.cta} →
        </CTAButton>
        
        <p style={{ 
          marginTop: '24px', 
          fontSize: '14px', 
          color: theme.colors.textSecondary 
        }}>
          {t.welcome}
        </p>
      </Modal>
    </Overlay>
  );
};

export default SuccessModal;