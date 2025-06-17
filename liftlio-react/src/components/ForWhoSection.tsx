import React from 'react';
import styled from 'styled-components';
import { FaRocket, FaGraduationCap, FaUserTie, FaChalkboardTeacher } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "For anyone selling online who wants to be found without chasing traffic.",
    subtitle: "This works especially well for:",
    personas: [
      {
        icon: FaRocket,
        title: "SaaS Founders",
        description: "Tired of paid acquisition costs that only go up. Get mentioned in developer discussions and startup communities where your buyers actually hang out."
      },
      {
        icon: FaGraduationCap,
        title: "Course Creators",
        description: "who need visibility beyond social media algorithms. Show up in conversations where people are asking for exactly what you teach."
      },
      {
        icon: FaUserTie,
        title: "Consultants",
        description: "looking to build authority at scale. Get recommended in industry discussions without manually monitoring every forum and community."
      },
      {
        icon: FaChalkboardTeacher,
        title: "Coaches",
        description: "seeking organic leads from people already looking for transformation. Get mentioned when potential clients ask for help in relevant conversations."
      }
    ]
  },
  pt: {
    title: "Para qualquer pessoa que vende on-line e quer ser encontrado sem precisar perseguir tráfego.",
    subtitle: "Isso funciona especialmente bem para:",
    personas: [
      {
        icon: FaRocket,
        title: "Fundadores de SaaS",
        description: "Cansado de custos de aquisição pagos que só aumentam. Seja mencionado nas discussões de desenvolvedores e comunidades de startups onde seus compradores realmente se encontram."
      },
      {
        icon: FaGraduationCap,
        title: "Criadores de Curso",
        description: "que precisam de visibilidade além dos algoritmos das redes sociais. Apareça em conversas onde as pessoas pedem exatamente o que você ensina."
      },
      {
        icon: FaUserTie,
        title: "Consultores",
        description: "buscando construir autoridade em larga escala. Seja recomendado em discussões do setor sem precisar monitorar manualmente todos os fóruns e comunidades."
      },
      {
        icon: FaChalkboardTeacher,
        title: "Treinadores",
        description: "que buscam leads orgânicos de pessoas que já buscam transformação. Seja mencionado quando clientes em potencial solicitarem ajuda em conversas relevantes."
      }
    ]
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
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 64px;
`;

const Title = styled.h2`
  font-size: 42px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 20px;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

const PersonasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PersonaCard = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 40px;
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
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px ${props => props.theme.name === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
    
    &::before {
      transform: scaleX(1);
    }
  }
`;

const PersonaHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
`;

const IconWrapper = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.theme.colors.primaryAlpha};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: ${props => props.theme.colors.primary};
`;

const PersonaTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
`;

const PersonaDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.8;
  
  @media (max-width: 768px) {
    font-size: 15px;
  }
`;

const ForWhoSection: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  return (
    <Container>
      <Content>
        <Header>
          <Title>{t.title}</Title>
          <Subtitle>{t.subtitle}</Subtitle>
        </Header>
        
        <PersonasGrid>
          {t.personas.map((persona, index) => (
            <PersonaCard key={index}>
              <PersonaHeader>
                <IconWrapper>
                  {renderIcon(persona.icon)}
                </IconWrapper>
                <PersonaTitle>{persona.title}</PersonaTitle>
              </PersonaHeader>
              <PersonaDescription>{persona.description}</PersonaDescription>
            </PersonaCard>
          ))}
        </PersonasGrid>
      </Content>
    </Container>
  );
};

export default ForWhoSection;