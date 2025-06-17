import React from 'react';
import styled from 'styled-components';
import { FaTimes, FaCheck, FaDollarSign, FaClock, FaUsers, FaInfinity } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "Compare the Results",
    subtitle: "See why organic mentions outperform paid ads in every metric that matters",
    paidAds: "Paid Ads",
    liftlio: "Liftlio",
    comparison: [
      {
        metric: "Cost per lead",
        paidAds: "$5-20",
        liftlio: "$0.10-0.50",
        icon: FaDollarSign
      },
      {
        metric: "Duration",
        paidAds: "Stops when you stop paying",
        liftlio: "Lives forever online",
        icon: FaClock
      },
      {
        metric: "Audience Engagement",
        paidAds: "Cold audience, low intent",
        liftlio: "Hot audience, high intent",
        icon: FaUsers
      },
      {
        metric: "Long-term value",
        paidAds: "Zero after campaign ends",
        liftlio: "Compounds over time",
        icon: FaInfinity
      }
    ]
  },
  pt: {
    title: "Compare os Resultados",
    subtitle: "Veja por que menções orgânicas superam anúncios pagos em todas as métricas importantes",
    paidAds: "Anúncios Pagos",
    liftlio: "Liftlio",
    comparison: [
      {
        metric: "Custo por lead",
        paidAds: "R$25-100",
        liftlio: "R$0,50-2,50",
        icon: FaDollarSign
      },
      {
        metric: "Duração",
        paidAds: "Para quando você para de pagar",
        liftlio: "Vive para sempre online",
        icon: FaClock
      },
      {
        metric: "Engajamento do Público",
        paidAds: "Público frio, baixa intenção",
        liftlio: "Público quente, alta intenção",
        icon: FaUsers
      },
      {
        metric: "Valor a longo prazo",
        paidAds: "Zero após campanha terminar",
        liftlio: "Cresce com o tempo",
        icon: FaInfinity
      }
    ]
  }
};

const Container = styled.section`
  padding: 80px 64px;
  background: ${props => props.theme.colors.featuresBg};
  
  @media (max-width: 768px) {
    padding: 60px 32px;
  }
  
  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const Content = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 48px;
`;

const Title = styled.h2`
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const ComparisonTable = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  padding: 20px 32px;
  font-weight: 700;
  font-size: 18px;
  
  @media (max-width: 640px) {
    font-size: 14px;
    padding: 16px 20px;
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr;
  padding: 24px 32px;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 640px) {
    padding: 16px 20px;
  }
`;

const MetricCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const IconWrapper = styled.div`
  width: 36px;
  height: 36px;
  background: ${props => props.theme.colors.primaryAlpha};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.primary};
  flex-shrink: 0;
  
  @media (max-width: 640px) {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
`;

const ValueCell = styled.div<{ isNegative?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.isNegative ? props.theme.colors.error : props.theme.colors.success};
  font-size: 14px;
  
  @media (max-width: 640px) {
    font-size: 12px;
  }
`;

const HeaderCell = styled.div`
  text-align: center;
`;

const CompareResults: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  return (
    <Container>
      <Content>
        <Header>
          <Title>{t.title}</Title>
          <Subtitle>{t.subtitle}</Subtitle>
        </Header>
        
        <ComparisonTable>
          <TableHeader>
            <div></div>
            <HeaderCell>{t.paidAds}</HeaderCell>
            <HeaderCell>{t.liftlio}</HeaderCell>
          </TableHeader>
          
          {t.comparison.map((item, index) => (
            <TableRow key={index}>
              <MetricCell>
                <IconWrapper>
                  {renderIcon(item.icon)}
                </IconWrapper>
                {item.metric}
              </MetricCell>
              <ValueCell isNegative>
                {renderIcon(FaTimes)}
                {item.paidAds}
              </ValueCell>
              <ValueCell>
                {renderIcon(FaCheck)}
                {item.liftlio}
              </ValueCell>
            </TableRow>
          ))}
        </ComparisonTable>
      </Content>
    </Container>
  );
};

export default CompareResults;