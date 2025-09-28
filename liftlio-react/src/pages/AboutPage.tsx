import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Building2, Target, Award, Users } from 'lucide-react';
import stevePhoto from '../assets/images/steve-photo.jpeg';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.mode === 'dark'
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
    : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'};
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 20px;
`;

const HeroSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  margin-bottom: 80px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const PhotoContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
`;

const StyledPhoto = styled.img`
  width: 100%;
  height: auto;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
`;

const PhotoOverlay = styled.div`
  position: absolute;
  inset: -20px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 20px;
  z-index: -1;
  opacity: 0.2;
`;

const HeroContent = styled.div``;

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled(motion.h2)`
  font-size: 1.5rem;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  margin-bottom: 30px;
  font-weight: 400;
`;

const Description = styled(motion.p)`
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${props => props.theme.mode === 'dark' ? '#cbd5e1' : '#475569'};
  margin-bottom: 20px;
`;

const InfoSection = styled.section`
  margin-bottom: 80px;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 50px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
`;

const InfoCard = styled(motion.div)`
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(30, 41, 59, 0.5)'
    : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 30px;
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.1)'
    : 'rgba(203, 213, 225, 0.3)'};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(139, 92, 246, 0.15);
  }
`;

const IconWrapper = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: white;
`;

const CardTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.mode === 'dark' ? '#f1f5f9' : '#1e293b'};
  margin-bottom: 15px;
`;

const CardDescription = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: ${props => props.theme.mode === 'dark' ? '#cbd5e1' : '#64748b'};
`;

const AboutPage: React.FC = () => {
  return (
    <PageContainer>
      <ContentWrapper>
        <HeroSection>
          <PhotoContainer
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <PhotoOverlay />
            <StyledPhoto src={stevePhoto} alt="Steve - CEO da Liftlio" />
          </PhotoContainer>

          <HeroContent>
            <Title
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Sobre a Liftlio
            </Title>
            <Subtitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Transformando dados em insights poderosos
            </Subtitle>
            <Description
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              A Liftlio é uma plataforma inovadora de análise de vídeos e sentimentos,
              utilizando inteligência artificial para transformar comentários e interações
              em insights valiosos para o seu negócio.
            </Description>
            <Description
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Fundada com a missão de democratizar o acesso a análises avançadas de
              conteúdo digital, ajudamos empresas a entender melhor seu público e
              otimizar suas estratégias de comunicação.
            </Description>
          </HeroContent>
        </HeroSection>

        <InfoSection>
          <SectionTitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Por que escolher a Liftlio?
          </SectionTitle>

          <InfoGrid>
            <InfoCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <IconWrapper>
                <Target size={30} />
              </IconWrapper>
              <CardTitle>Missão</CardTitle>
              <CardDescription>
                Empoderar criadores e empresas com insights profundos sobre
                seu conteúdo e audiência, utilizando tecnologia de ponta em IA.
              </CardDescription>
            </InfoCard>

            <InfoCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <IconWrapper>
                <Building2 size={30} />
              </IconWrapper>
              <CardTitle>Visão</CardTitle>
              <CardDescription>
                Ser a principal plataforma de análise de sentimentos e engajamento
                para conteúdo digital, revolucionando como empresas entendem seu público.
              </CardDescription>
            </InfoCard>

            <InfoCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <IconWrapper>
                <Award size={30} />
              </IconWrapper>
              <CardTitle>Valores</CardTitle>
              <CardDescription>
                Inovação constante, transparência nas análises, privacidade dos dados
                e compromisso com resultados mensuráveis para nossos clientes.
              </CardDescription>
            </InfoCard>

            <InfoCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <IconWrapper>
                <Users size={30} />
              </IconWrapper>
              <CardTitle>Experiência</CardTitle>
              <CardDescription>
                Nossa equipe combina expertise em inteligência artificial, análise
                de dados e marketing digital para entregar soluções completas.
              </CardDescription>
            </InfoCard>
          </InfoGrid>
        </InfoSection>
      </ContentWrapper>
    </PageContainer>
  );
};

export default AboutPage;