import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRocket, FaLightbulb, FaUsers, FaChartLine } from 'react-icons/fa';
import { BiPulse } from 'react-icons/bi';
import { useLanguage } from '../context/LanguageContext';
import { IconComponent } from '../utils/IconHelper';
import InstitutionalWrapper from './InstitutionalWrapper';

const AboutContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
`;

const Header = styled.header`
  padding: 20px 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  
  @media (max-width: 768px) {
    padding: 20px 32px;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.primary};
  font-size: 16px;
  cursor: pointer;
  transition: color 0.3s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 900;
  color: ${props => props.theme.colors.primary};
`;

const Content = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 80px 32px;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Section = styled.section`
  margin-bottom: 48px;
`;

const SectionTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
`;

const Paragraph = styled.p`
  font-size: 18px;
  line-height: 1.8;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 16px;
`;

const ValueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-top: 32px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ValueCard = styled.div`
  padding: 24px;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
`;

const ValueIcon = styled.div`
  font-size: 32px;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 16px;
`;

const ValueTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text.primary};
`;

const ValueDescription = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${props => props.theme.colors.textSecondary};
`;

const About: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const content = {
    en: {
      back: "Back",
      title: "About Liftlio",
      mission: {
        title: "Our Mission",
        description: "We believe in democratizing digital marketing. While traditional advertising platforms charge exorbitant prices for fleeting visibility, we've pioneered a revolutionary approach that creates lasting value through intelligent organic engagement."
      },
      story: {
        title: "Our Story",
        description: "Born from the frustration of burning through advertising budgets with diminishing returns, Liftlio emerged as the answer to a simple question: What if every marketing dollar spent created permanent value instead of temporary visibility?",
        description2: "Our founding team, composed of seasoned digital marketers and AI engineers, recognized that genuine engagement creates exponentially more value than paid impressions. By combining cutting-edge AI with deep understanding of social dynamics, we've created a platform that doesn't just find customers – it builds lasting relationships."
      },
      values: {
        title: "Our Values",
        items: [
          {
            icon: FaLightbulb,
            title: "Innovation First",
            description: "We constantly push boundaries to deliver solutions that didn't exist yesterday."
          },
          {
            icon: FaUsers,
            title: "Authentic Engagement",
            description: "Real connections beat artificial metrics every time."
          },
          {
            icon: FaChartLine,
            title: "Measurable Impact",
            description: "Every action we take is designed to deliver tangible, lasting results."
          },
          {
            icon: FaRocket,
            title: "Client Success",
            description: "Your growth is our growth. We succeed when you succeed."
          }
        ]
      },
      team: {
        title: "The Technology",
        description: "Powered by advanced AI and real-time monitoring systems, Liftlio operates 24/7 to ensure no opportunity is missed. Our proprietary algorithms understand context, sentiment, and timing to create engagement that feels natural because it is natural – just intelligently amplified."
      }
    },
    pt: {
      back: "Voltar",
      title: "Sobre o Liftlio",
      mission: {
        title: "Nossa Missão",
        description: "Acreditamos em democratizar o marketing digital. Enquanto plataformas tradicionais de publicidade cobram preços exorbitantes por visibilidade temporária, nós pioneiramos uma abordagem revolucionária que cria valor duradouro através de engajamento orgânico inteligente."
      },
      story: {
        title: "Nossa História",
        description: "Nascido da frustração de queimar orçamentos de publicidade com retornos decrescentes, o Liftlio surgiu como resposta a uma pergunta simples: E se cada real gasto em marketing criasse valor permanente em vez de visibilidade temporária?",
        description2: "Nossa equipe fundadora, composta por veteranos do marketing digital e engenheiros de IA, reconheceu que engajamento genuíno cria exponencialmente mais valor que impressões pagas. Combinando IA de ponta com profundo entendimento de dinâmicas sociais, criamos uma plataforma que não apenas encontra clientes – ela constrói relacionamentos duradouros."
      },
      values: {
        title: "Nossos Valores",
        items: [
          {
            icon: FaLightbulb,
            title: "Inovação em Primeiro Lugar",
            description: "Constantemente ultrapassamos limites para entregar soluções que não existiam ontem."
          },
          {
            icon: FaUsers,
            title: "Engajamento Autêntico",
            description: "Conexões reais superam métricas artificiais sempre."
          },
          {
            icon: FaChartLine,
            title: "Impacto Mensurável",
            description: "Cada ação que tomamos é projetada para entregar resultados tangíveis e duradouros."
          },
          {
            icon: FaRocket,
            title: "Sucesso do Cliente",
            description: "Seu crescimento é nosso crescimento. Nós prosperamos quando você prospera."
          }
        ]
      },
      team: {
        title: "A Tecnologia",
        description: "Alimentado por IA avançada e sistemas de monitoramento em tempo real, o Liftlio opera 24/7 para garantir que nenhuma oportunidade seja perdida. Nossos algoritmos proprietários entendem contexto, sentimento e timing para criar engajamento que parece natural porque é natural – apenas inteligentemente amplificado."
      }
    }
  };
  
  const t = content[language];
  
  return (
    <InstitutionalWrapper>
      <AboutContainer>
      <Header>
        <BackButton onClick={() => navigate('/')}>
          <IconComponent icon={FaArrowLeft} />
          {t.back}
        </BackButton>
        <Logo>
          <IconComponent icon={BiPulse} />
          LIFTLIO
        </Logo>
      </Header>
      
      <Content>
        <Title>{t.title}</Title>
        
        <Section>
          <SectionTitle>{t.mission.title}</SectionTitle>
          <Paragraph>{t.mission.description}</Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>{t.story.title}</SectionTitle>
          <Paragraph>{t.story.description}</Paragraph>
          <Paragraph>{t.story.description2}</Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>{t.values.title}</SectionTitle>
          <ValueGrid>
            {t.values.items.map((value: any, index: number) => (
              <ValueCard key={index}>
                <ValueIcon>
                  <IconComponent icon={value.icon} />
                </ValueIcon>
                <ValueTitle>{value.title}</ValueTitle>
                <ValueDescription>{value.description}</ValueDescription>
              </ValueCard>
            ))}
          </ValueGrid>
        </Section>
        
        <Section>
          <SectionTitle>{t.team.title}</SectionTitle>
          <Paragraph>{t.team.description}</Paragraph>
        </Section>
      </Content>
    </AboutContainer>
    </InstitutionalWrapper>
  );
};

export default About;