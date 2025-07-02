import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FaChartLine } from '../utils/icons';
import { renderIcon } from '../utils/IconHelper';

const Section = styled.section`
  padding: 120px 64px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 80px 32px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 64px;
`;

const Title = styled.h2`
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Gradient = styled.span`
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Description = styled.p`
  font-size: 20px;
  color: ${props => props.theme.colors.text.secondary};
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const GraphContainer = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 48px;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`;

const translations = {
  en: {
    title: "The Organic Traffic",
    titleHighlight: "Snowball Effect",
    subtitle: "See how each comment multiplies in value over time, creating unique compound growth"
  },
  pt: {
    title: "O Efeito",
    titleHighlight: "Bola de Neve",
    subtitle: "Veja como cada comentário multiplica em valor ao longo do tempo, criando crescimento composto único"
  }
};

const ExponentialSection: React.FC = () => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <Section>
      <Header>
        <Title>
          {t.title} <Gradient>{t.titleHighlight}</Gradient>
        </Title>
        <Description>{t.subtitle}</Description>
      </Header>
      
      <GraphContainer>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          {renderIcon(FaChartLine)}
          <p style={{ marginTop: '20px', color: theme.colors.text.secondary }}>
            {language === 'en' ? 'Exponential growth visualization' : 'Visualização de crescimento exponencial'}
          </p>
        </div>
      </GraphContainer>
    </Section>
  );
};

export default ExponentialSection;