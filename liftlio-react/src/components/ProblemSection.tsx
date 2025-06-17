import React from 'react';
import styled from 'styled-components';
import { FaExclamationTriangle } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "Ads stop working when you stop paying. Organic reach is buried.",
    subtitle: "87% of consumers trust peer recommendations more than any form of advertising.",
    content: "Your customers trust recommendations from strangers on Reddit more than your Facebook ads. Your social posts disappear in hours while competitors get mentioned in discussions that live forever.",
    pain: "Meanwhile, you're stuck on the content treadmill writing, posting, hoping something sticks, while your paid ads drain budget for decreasing returns."
  },
  pt: {
    title: "Os anúncios param de funcionar quando você para de pagar. O alcance orgânico fica comprometido.",
    subtitle: "87% dos consumidores confiam mais em recomendações do que em qualquer forma de publicidade.",
    content: "Seus clientes confiam mais em recomendações de estranhos no Reddit do que em seus anúncios no Facebook. Suas postagens nas redes sociais desaparecem em horas, enquanto concorrentes são mencionados em discussões que duram para sempre.",
    pain: "Enquanto isso, você fica preso na rotina de conteúdo escrevendo, postando, esperando que algo dê certo, enquanto seus anúncios pagos drenam o orçamento e geram retornos decrescentes."
  }
};

const Container = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.background};
  position: relative;
  
  @media (max-width: 768px) {
    padding: 60px 32px;
  }
  
  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
`;

const Stat = styled.div`
  font-size: 72px;
  font-weight: 900;
  color: ${props => props.theme.colors.success};
  margin-bottom: 16px;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 48px;
  }
`;

const StatLabel = styled.p`
  font-size: 20px;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 600;
  margin-bottom: 48px;
`;

const Title = styled.h2`
  font-size: 42px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 32px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Description = styled.div`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.8;
  
  p {
    margin-bottom: 20px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const WarningBox = styled.div`
  background: ${props => props.theme.colors.error}10;
  border: 2px solid ${props => props.theme.colors.error}30;
  border-radius: 16px;
  padding: 32px;
  margin-top: 48px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 40px;
    background: ${props => props.theme.colors.cardBg};
    border: 2px solid ${props => props.theme.colors.error};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const WarningIcon = styled.div`
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  background: ${props => props.theme.colors.cardBg};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.error};
  font-size: 20px;
`;

const ProblemSection: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  return (
    <Container>
      <Content>
        <Stat>87%</Stat>
        <StatLabel>{t.subtitle}</StatLabel>
        
        <Title>{t.title}</Title>
        
        <Description>
          <p>{t.content}</p>
        </Description>
        
        <WarningBox>
          <WarningIcon>
            {renderIcon(FaExclamationTriangle)}
          </WarningIcon>
          <Description>
            <p>{t.pain}</p>
          </Description>
        </WarningBox>
      </Content>
    </Container>
  );
};

export default ProblemSection;