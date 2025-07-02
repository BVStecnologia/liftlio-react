import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FaCheck } from '../utils/icons';
import { renderIcon } from '../utils/IconHelper';
import { useNavigate } from 'react-router-dom';

const Section = styled.section`
  padding: 120px 64px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 80px 32px;
  }
`;

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  margin-top: 64px;
`;

const PricingCard = styled.div<{ featured?: boolean }>`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.featured ? props.theme.colors.primary : props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 48px 32px;
  position: relative;
  transform: ${props => props.featured ? 'scale(1.05)' : 'scale(1)'};
  
  @media (max-width: 768px) {
    transform: scale(1);
  }
`;

const PricingBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.gradient.landing};
  color: #000;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
`;

const PricingPlan = styled.h3`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
`;

const PricingPrice = styled.div`
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 24px;
  
  span {
    font-size: 18px;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const PricingFeatures = styled.ul`
  list-style: none;
  margin: 32px 0;
`;

const PricingFeature = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.secondary};
`;

const PrimaryButton = styled.button`
  background: ${props => props.theme.colors.gradient.landing};
  color: #000;
  border: none;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  width: 100%;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const translations = {
  en: {
    title: "Simple Pricing,",
    titleHighlight: "Incredible ROI",
    subtitle: "Choose the plan that fits your growth stage. Scale up anytime.",
    monthly: "month",
    cta: "Start Growing Today",
    plans: {
      starter: {
        name: "Starter",
        description: "Perfect for testing the waters",
        features: [
          "Up to 100 mentions/month",
          "3 keywords monitored",
          "Basic sentiment analysis",
          "Email support"
        ]
      },
      professional: {
        name: "Professional",
        badge: "Most Popular",
        description: "For serious brands ready to scale",
        features: [
          "Up to 500 mentions/month",
          "10 keywords monitored",
          "Advanced AI analysis",
          "Priority support",
          "Custom reports"
        ]
      },
      enterprise: {
        name: "Enterprise",
        description: "For brands dominating their market",
        features: [
          "Unlimited mentions",
          "Unlimited keywords",
          "White-label options",
          "Dedicated account manager",
          "API access"
        ]
      }
    }
  },
  pt: {
    title: "Preços Simples,",
    titleHighlight: "ROI Incrível",
    subtitle: "Escolha o plano que se encaixa no seu estágio de crescimento. Escale a qualquer momento.",
    monthly: "mês",
    cta: "Começar a Crescer Hoje",
    plans: {
      starter: {
        name: "Iniciante",
        description: "Perfeito para testar",
        features: [
          "Até 100 menções/mês",
          "3 palavras-chave monitoradas",
          "Análise de sentimento básica",
          "Suporte por email"
        ]
      },
      professional: {
        name: "Profissional",
        badge: "Mais Popular",
        description: "Para marcas prontas para escalar",
        features: [
          "Até 500 menções/mês",
          "10 palavras-chave monitoradas",
          "Análise avançada de IA",
          "Suporte prioritário",
          "Relatórios personalizados"
        ]
      },
      enterprise: {
        name: "Empresarial",
        description: "Para marcas dominando seu mercado",
        features: [
          "Menções ilimitadas",
          "Palavras-chave ilimitadas",
          "Opções white-label",
          "Gerente de conta dedicado",
          "Acesso à API"
        ]
      }
    }
  }
};

const PricingSection: React.FC = () => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language];
  
  const handleGetStarted = (plan?: string) => {
    navigate('/register', { state: { plan } });
  };
  
  return (
    <Section id="pricing">
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '24px' }}>
          {t.title} <span style={{ 
            background: theme.colors.gradient.landing,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>{t.titleHighlight}</span>
        </h2>
        <p style={{ fontSize: '20px', color: theme.colors.text.secondary, maxWidth: '700px', margin: '0 auto' }}>
          {t.subtitle}
        </p>
      </div>
      
      <PricingGrid>
        <PricingCard>
          <PricingPlan>{t.plans.starter.name}</PricingPlan>
          <PricingPrice>
            $49<span>/{t.monthly}</span>
          </PricingPrice>
          <p style={{ color: theme.colors.text.secondary, marginBottom: '32px' }}>
            {t.plans.starter.description}
          </p>
          <PricingFeatures>
            {t.plans.starter.features.map((feature, index) => (
              <PricingFeature key={index}>
                {renderIcon(FaCheck)} {feature}
              </PricingFeature>
            ))}
          </PricingFeatures>
          <PrimaryButton onClick={() => handleGetStarted('starter')}>
            {t.cta}
          </PrimaryButton>
        </PricingCard>
        
        <PricingCard featured>
          <PricingBadge>{t.plans.professional.badge}</PricingBadge>
          <PricingPlan>{t.plans.professional.name}</PricingPlan>
          <PricingPrice>
            $99<span>/{t.monthly}</span>
          </PricingPrice>
          <p style={{ color: theme.colors.text.secondary, marginBottom: '32px' }}>
            {t.plans.professional.description}
          </p>
          <PricingFeatures>
            {t.plans.professional.features.map((feature, index) => (
              <PricingFeature key={index}>
                {renderIcon(FaCheck)} {feature}
              </PricingFeature>
            ))}
          </PricingFeatures>
          <PrimaryButton onClick={() => handleGetStarted('professional')}>
            {t.cta}
          </PrimaryButton>
        </PricingCard>
        
        <PricingCard>
          <PricingPlan>{t.plans.enterprise.name}</PricingPlan>
          <PricingPrice>
            $199<span>/{t.monthly}</span>
          </PricingPrice>
          <p style={{ color: theme.colors.text.secondary, marginBottom: '32px' }}>
            {t.plans.enterprise.description}
          </p>
          <PricingFeatures>
            {t.plans.enterprise.features.map((feature, index) => (
              <PricingFeature key={index}>
                {renderIcon(FaCheck)} {feature}
              </PricingFeature>
            ))}
          </PricingFeatures>
          <PrimaryButton onClick={() => handleGetStarted('enterprise')}>
            {t.cta}
          </PrimaryButton>
        </PricingCard>
      </PricingGrid>
    </Section>
  );
};

export default PricingSection;