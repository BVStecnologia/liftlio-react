import React from 'react';
import styled from 'styled-components';
import { FaShieldAlt, FaCheck } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    badge: "14-Day Trial",
    title: "Try Liftlio Risk-Free",
    subtitle: "We're confident you'll love the results. That's why we offer:",
    guarantees: [
      "14-day free trial - no credit card required",
      "Cancel anytime with no questions asked",
      "Full access to all features during trial",
      "Personal onboarding to ensure success"
    ],
    cta: "Start Your Free Trial"
  },
  pt: {
    badge: "14 Dias Grátis",
    title: "Experimente o Liftlio Sem Risco",
    subtitle: "Temos certeza de que você vai adorar os resultados. Por isso oferecemos:",
    guarantees: [
      "14 dias de teste grátis - sem cartão de crédito",
      "Cancele a qualquer momento sem perguntas",
      "Acesso total a todos os recursos durante o teste",
      "Onboarding pessoal para garantir sucesso"
    ],
    cta: "Iniciar Teste Grátis"
  }
};

const Container = styled.section`
  padding: 80px 64px;
  background: linear-gradient(135deg, 
    ${props => props.theme.colors.primaryAlpha} 0%, 
    ${props => props.theme.colors.secondaryAlpha} 100%
  );
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 60px 32px;
  }
  
  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.theme.colors.success}20;
  border: 1px solid ${props => props.theme.colors.success};
  color: ${props => props.theme.colors.success};
  padding: 8px 20px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
`;

const ShieldIcon = styled.div`
  width: 120px;
  height: 120px;
  background: ${props => props.theme.colors.cardBg};
  border: 3px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32px;
  font-size: 48px;
  color: ${props => props.theme.colors.primary};
  box-shadow: 0 20px 40px ${props => props.theme.colors.shadowLarge};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: -20px;
    border: 2px dashed ${props => props.theme.colors.primary}30;
    border-radius: 50%;
    animation: rotate 20s linear infinite;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Title = styled.h2`
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 40px;
  line-height: 1.6;
`;

const GuaranteeList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 48px 0;
  display: inline-block;
  text-align: left;
`;

const GuaranteeItem = styled.li`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 16px;
  color: ${props => props.theme.colors.text.primary};
  
  svg {
    color: ${props => props.theme.colors.success};
    flex-shrink: 0;
    font-size: 20px;
  }
`;

const CTAButton = styled.button`
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  border: none;
  padding: 20px 48px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px ${props => props.theme.colors.primaryAlpha};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px ${props => props.theme.colors.primaryAlpha};
  }
`;

const FloatingElement = styled.div<{ top?: string; left?: string; right?: string; bottom?: string }>`
  position: absolute;
  ${props => props.top && `top: ${props.top};`}
  ${props => props.left && `left: ${props.left};`}
  ${props => props.right && `right: ${props.right};`}
  ${props => props.bottom && `bottom: ${props.bottom};`}
  width: 200px;
  height: 200px;
  background: ${props => props.theme.colors.primary}10;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
`;

const GuaranteeSection: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  return (
    <Container>
      <FloatingElement top="0" left="-100px" />
      <FloatingElement bottom="0" right="-100px" />
      
      <Content>
        <Badge>
          {renderIcon(FaShieldAlt)}
          {t.badge}
        </Badge>
        
        <ShieldIcon>
          {renderIcon(FaShieldAlt)}
        </ShieldIcon>
        
        <Title>{t.title}</Title>
        <Subtitle>{t.subtitle}</Subtitle>
        
        <GuaranteeList>
          {t.guarantees.map((guarantee, index) => (
            <GuaranteeItem key={index}>
              {renderIcon(FaCheck)}
              <span>{guarantee}</span>
            </GuaranteeItem>
          ))}
        </GuaranteeList>
        
        <CTAButton>{t.cta}</CTAButton>
      </Content>
    </Container>
  );
};

export default GuaranteeSection;