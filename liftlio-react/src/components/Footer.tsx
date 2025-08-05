import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BiPulse } from '../utils/icons';
import { renderIcon } from '../utils/IconHelper';

const floatingAnimation = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
  100% {
    transform: translateY(0);
  }
`;

const energyLineAnimation = keyframes`
  0% {
    opacity: 0.3;
    transform: scaleX(0.95);
  }
  50% {
    opacity: 0.8;
    transform: scaleX(1);
  }
  100% {
    opacity: 0.3;
    transform: scaleX(0.95);
  }
`;

const FooterContainer = styled.footer`
  background: ${props => props.theme.name === 'dark' ? '#0a0a0a' : '#111'};
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#fff'};
  padding: 80px 64px 40px;
  border-top: 1px solid ${props => props.theme.colors.borderLight};
  
  @media (max-width: 768px) {
    padding: 60px 32px 30px;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const FooterColumn = styled.div``;

const FooterTitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#fff'};
`;

const FooterDescription = styled.p`
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.6)'};
  line-height: 1.6;
`;

const FooterLinks = styled.ul`
  list-style: none;
`;

const FooterLink = styled.li`
  margin-bottom: 12px;
  
  a {
    color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.6)'};
    text-decoration: none;
    transition: color 0.2s;
    
    &:hover {
      color: ${props => props.theme.colors.primary};
    }
  }
`;

const FooterBottom = styled.div`
  max-width: 1200px;
  margin: 60px auto 0;
  padding-top: 32px;
  border-top: 1px solid ${props => props.theme.colors.borderLight};
  text-align: center;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.4)'};
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.name === 'light' ? '#ffffff' : props.theme.colors.primary};
`;

const BetaBadge = styled.span`
  font-size: 0.4em;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  padding: 0.1em 0.4em;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(99, 102, 241, 0.15)' 
    : 'rgba(99, 102, 241, 0.08)'};
  color: ${props => props.theme.name === 'dark' ? '#a78bfa' : '#6366f1'};
  border-radius: 6px;
  letter-spacing: 0.5px;
  position: relative;
  text-transform: uppercase;
  vertical-align: text-top;
  margin-left: 0.3em;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(167, 139, 250, 0.2)' 
    : 'rgba(99, 102, 241, 0.15)'};
  transition: all 0.3s ease;
  line-height: 1;
  display: inline-block;
  
  &:hover {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(99, 102, 241, 0.25)' 
      : 'rgba(99, 102, 241, 0.12)'};
    border-color: ${props => props.theme.name === 'dark' 
      ? 'rgba(167, 139, 250, 0.3)' 
      : 'rgba(99, 102, 241, 0.2)'};
  }
  
  @media (max-width: 768px) {
    font-size: 0.4em;
    padding: 0.1em 0.4em;
  }
`;

const translations = {
  en: {
    description: "AI-powered platform to scale word-of-mouth recommendations without paying for ads.",
    product: "Product",
    company: "Company",
    legal: "Legal",
    links: {
      features: "Features",
      pricing: "Pricing",
      integrations: "Integrations",
      api: "API Documentation",
      about: "About",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      security: "Security"
    },
    copyright: "© 2025 Liftlio. All rights reserved."
  },
  pt: {
    description: "Plataforma com IA para escalar recomendações boca a boca sem pagar por anúncios.",
    product: "Produto",
    company: "Empresa",
    legal: "Legal",
    links: {
      features: "Recursos",
      pricing: "Preços",
      integrations: "Integrações",
      api: "Documentação API",
      about: "Sobre",
      privacy: "Política de Privacidade",
      terms: "Termos de Serviço",
      security: "Segurança"
    },
    copyright: "© 2025 Liftlio. Todos os direitos reservados."
  }
};

const Footer: React.FC = () => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterColumn>
          <FooterTitle>
            <Logo>
              {renderIcon(BiPulse)}
              LIFTLIO
              <BetaBadge>Beta</BetaBadge>
            </Logo>
          </FooterTitle>
          <FooterDescription>
            {t.description}
          </FooterDescription>
        </FooterColumn>
        
        <FooterColumn>
          <FooterTitle>{t.product}</FooterTitle>
          <FooterLinks>
            <FooterLink><a href="#features">{t.links.features}</a></FooterLink>
            <FooterLink><a href="#pricing">{t.links.pricing}</a></FooterLink>
            <FooterLink><a href="#">{t.links.integrations}</a></FooterLink>
            <FooterLink><a href="#">{t.links.api}</a></FooterLink>
          </FooterLinks>
        </FooterColumn>
        
        <FooterColumn>
          <FooterTitle>{t.company}</FooterTitle>
          <FooterLinks>
            <FooterLink><a href="/about">{t.links.about}</a></FooterLink>
          </FooterLinks>
        </FooterColumn>
        
        <FooterColumn>
          <FooterTitle>{t.legal}</FooterTitle>
          <FooterLinks>
            <FooterLink><a href="/privacy">{t.links.privacy}</a></FooterLink>
            <FooterLink><a href="/terms">{t.links.terms}</a></FooterLink>
            <FooterLink><a href="/security">{t.links.security}</a></FooterLink>
          </FooterLinks>
        </FooterColumn>
      </FooterContent>
      
      <FooterBottom>
        {t.copyright}
      </FooterBottom>
    </FooterContainer>
  );
};

export default Footer;