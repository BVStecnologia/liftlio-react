import React from 'react';
import styled from 'styled-components';
import { FaLightbulb, FaComments, FaRocket } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "What if AI could place your name in conversations your customers already trust?",
    paragraph1: "Right now, your ideal customers are asking questions in Reddit threads, Twitter discussions, and comment sections. They're describing problems your product solves and asking for recommendations.",
    paragraph2: "Liftlio finds these high-engagement conversations and posts natural, helpful responses that mention your brand—positioning your product like a personal referral from someone who genuinely wants to help.",
    paragraph3: "The result? Organic visibility that compounds over time, instead of disappearing when you stop spending."
  },
  pt: {
    title: "E se a IA pudesse inserir seu nome em conversas nas quais seus clientes já confiam?",
    paragraph1: "Neste momento, seus clientes ideais estão fazendo perguntas em tópicos do Reddit, discussões no Twitter e seções de comentários. Eles descrevem problemas que seu produto resolve e pedem recomendações.",
    paragraph2: "A Liftlio considera essas conversas de alto engajamento e publica respostas naturais e úteis que mencionam sua marca, posicionando seu produto como uma indicação pessoal de alguém que realmente quer ajudar.",
    paragraph3: "O resultado? Visibilidade orgânica que se acumula ao longo do tempo, em vez de desaparecer quando você para de gastar."
  }
};

const Container = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.featuresBg};
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
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 80px;
  height: 80px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32px;
  font-size: 40px;
  color: white;
  box-shadow: 0 10px 30px ${props => props.theme.colors.primaryAlpha};
`;

const Title = styled.h2`
  font-size: 42px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 48px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 32px;
    margin-bottom: 32px;
  }
`;

const Description = styled.div`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.8;
  
  p {
    margin-bottom: 24px;
    
    &:last-child {
      margin-bottom: 0;
      font-weight: 600;
      color: ${props => props.theme.colors.text.primary};
    }
  }
`;

const FeatureCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 64px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 24px;
    margin-top: 48px;
  }
`;

const FeatureCard = styled.div`
  text-align: center;
`;

const FeatureIcon = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.theme.colors.cardBg};
  border: 2px solid ${props => props.theme.colors.borderLight};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 28px;
  color: ${props => props.theme.colors.primary};
  transition: all 0.3s ease;
  
  ${FeatureCard}:hover & {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px ${props => props.theme.colors.primaryAlpha};
  }
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const BreakthroughSection: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  const features = [
    {
      icon: FaComments,
      title: language === 'pt' ? 'Conversas Reais' : 'Real Conversations',
      description: language === 'pt' ? 'Em fóruns e comunidades ativas' : 'In active forums and communities'
    },
    {
      icon: FaLightbulb,
      title: language === 'pt' ? 'Menções Naturais' : 'Natural Mentions',
      description: language === 'pt' ? 'Como recomendações pessoais' : 'Like personal recommendations'
    },
    {
      icon: FaRocket,
      title: language === 'pt' ? 'Crescimento Orgânico' : 'Organic Growth',
      description: language === 'pt' ? 'Visibilidade que aumenta com o tempo' : 'Visibility that grows over time'
    }
  ];

  return (
    <Container>
      <Content>
        <IconWrapper>
          {renderIcon(FaLightbulb)}
        </IconWrapper>
        
        <Title>{t.title}</Title>
        
        <Description>
          <p>{t.paragraph1}</p>
          <p>{t.paragraph2}</p>
          <p>{t.paragraph3}</p>
        </Description>
        
        <FeatureCards>
          {features.map((feature, index) => (
            <FeatureCard key={index}>
              <FeatureIcon>
                {renderIcon(feature.icon)}
              </FeatureIcon>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureCard>
          ))}
        </FeatureCards>
      </Content>
    </Container>
  );
};

export default BreakthroughSection;