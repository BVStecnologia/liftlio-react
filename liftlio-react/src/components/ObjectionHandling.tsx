import React from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaUserCheck, FaShieldAlt, FaHeart } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "Quality, not quantity. Authenticity, not automation.",
    subtitle: "We get the concern. The internet is full of promotional garbage that helps nobody.",
    cards: [
      {
        icon: FaHeart,
        title: "Genuinely Helpful",
        description: "Liftlio is different because every comment genuinely helps the person asking the question. We only mention your product when it actually solves their specific problem."
      },
      {
        icon: FaUserCheck,
        title: "You Have Control",
        description: "You have control over every mention. See the conversation, see our response, reject anything that doesn't meet your standards."
      },
      {
        icon: FaCheckCircle,
        title: "Context Matters",
        description: "Each response includes helpful context and alternatives—not just a product pitch. If it doesn't help the community, it doesn't help your brand."
      },
      {
        icon: FaShieldAlt,
        title: "Zero Risk",
        description: "We amplify real conversations, not interrupt them. Our AI behaves exactly like a helpful user, maintaining your brand's reputation."
      }
    ]
  },
  pt: {
    title: "Qualidade, não quantidade. Autenticidade, não automação.",
    subtitle: "Entendemos a preocupação. A internet está cheia de lixo promocional que não ajuda ninguém.",
    cards: [
      {
        icon: FaHeart,
        title: "Genuinamente Útil",
        description: "O Liftlio é diferente porque cada comentário ajuda genuinamente a pessoa que faz a pergunta. Mencionamos seu produto apenas quando ele realmente resolve o problema específico."
      },
      {
        icon: FaUserCheck,
        title: "Você Tem Controle",
        description: "Você tem controle total sobre cada menção. Veja a conversa, veja nossa resposta, rejeite qualquer coisa que não atenda aos seus padrões."
      },
      {
        icon: FaCheckCircle,
        title: "Contexto Importa",
        description: "Cada resposta inclui contexto e alternativas úteis — não apenas uma apresentação do produto. Se não ajuda a comunidade, não ajuda sua marca."
      },
      {
        icon: FaShieldAlt,
        title: "Zero Risco",
        description: "Amplificamos conversas reais, não as interrompemos. Nossa IA se comporta exatamente como um usuário útil, mantendo a reputação da sua marca."
      }
    ]
  }
};

const Container = styled.section`
  padding: 100px 64px;
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

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const Title = styled.h2`
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 16px;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
  max-width: 700px;
  margin: 0 auto;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
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
    box-shadow: 0 20px 40px ${props => props.theme.colors.shadowMedium};
    
    &::before {
      transform: scaleX(1);
    }
  }
`;

const IconWrapper = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.theme.colors.primaryAlpha};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  font-size: 28px;
  color: ${props => props.theme.colors.primary};
`;

const CardTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
`;

const CardDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const ObjectionHandling: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  return (
    <Container>
      <Content>
        <Header>
          <Title>{t.title}</Title>
          <Subtitle>{t.subtitle}</Subtitle>
        </Header>
        
        <CardsGrid>
          {t.cards.map((card, index) => (
            <Card key={index}>
              <IconWrapper>
                {renderIcon(card.icon)}
              </IconWrapper>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </Card>
          ))}
        </CardsGrid>
      </Content>
    </Container>
  );
};

export default ObjectionHandling;