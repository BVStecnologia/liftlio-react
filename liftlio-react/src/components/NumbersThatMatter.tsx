import React from 'react';
import styled from 'styled-components';
import { FaUsers, FaComments, FaChartLine, FaTrophy } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "Numbers That Matter",
    stats: [
      {
        value: "2,500+",
        label: "Organic mentions per day",
        icon: FaComments
      },
      {
        value: "24/7",
        label: "Automated continuous monitoring",
        icon: FaTrophy
      },
      {
        value: "95%",
        label: "Customer satisfaction rate",
        icon: FaChartLine
      },
      {
        value: "50K+",
        label: "Qualified leads generated",
        icon: FaUsers
      }
    ]
  },
  pt: {
    title: "Números que Importam",
    stats: [
      {
        value: "2.500+",
        label: "Menções orgânicas por dia",
        icon: FaComments
      },
      {
        value: "24/7",
        label: "Monitoramento contínuo automatizado",
        icon: FaTrophy
      },
      {
        value: "95%",
        label: "Taxa de satisfação dos clientes",
        icon: FaChartLine
      },
      {
        value: "50K+",
        label: "Leads qualificados gerados",
        icon: FaUsers
      }
    ]
  }
};

const Container = styled.section`
  padding: 80px 64px;
  background: ${props => props.theme.colors.background};
  
  @media (max-width: 768px) {
    padding: 60px 32px;
  }
  
  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: 36px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 48px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  
  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: ${props => props.theme.colors.gradient.landing};
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
    
    &::before {
      transform: translateX(0);
    }
  }
`;

const IconWrapper = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.theme.colors.primaryAlpha};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 24px;
  color: ${props => props.theme.colors.primary};
`;

const StatValue = styled.div`
  font-size: 36px;
  font-weight: 800;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const NumbersThatMatter: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  return (
    <Container>
      <Content>
        <Title>{t.title}</Title>
        <StatsGrid>
          {t.stats.map((stat, index) => (
            <StatCard key={index}>
              <IconWrapper>
                {renderIcon(stat.icon)}
              </IconWrapper>
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsGrid>
      </Content>
    </Container>
  );
};

export default NumbersThatMatter;