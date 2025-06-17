import React, { useState } from 'react';
import styled from 'styled-components';
import { FaArrowRight } from 'react-icons/fa';
import { renderIcon } from '../utils/IconHelper';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: "See Liftlio in action with your product",
    subtitle: "Free trial. No signup. See a real comment now.",
    placeholder: "Enter your website URL...",
    button: "Show Me My Comment",
    loading: "Generating comment...",
    comingSoon: "Coming Soon",
    comingSoonDesc: "We're building the API to show you real examples. For now, imagine a helpful comment about your product appearing in relevant discussions."
  },
  pt: {
    title: "Veja o Liftlio em ação com seu produto",
    subtitle: "Teste grátis. Sem cadastro. Veja um comentário real agora.",
    placeholder: "Digite a URL do seu site...",
    button: "Mostre-me meu comentário",
    loading: "Gerando comentário...",
    comingSoon: "Em Breve",
    comingSoonDesc: "Estamos construindo a API para mostrar exemplos reais. Por enquanto, imagine um comentário útil sobre seu produto aparecendo em discussões relevantes."
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
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 24px;
  letter-spacing: -1px;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
  margin-bottom: 48px;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  
  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 16px 24px;
  font-size: 16px;
  border: 2px solid ${props => props.theme.colors.borderLight};
  border-radius: 8px;
  background: ${props => props.theme.colors.cardBg};
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const Button = styled.button`
  padding: 16px 32px;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.primaryAlpha};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;

const ComingSoonCard = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 2px dashed ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 48px;
  text-align: center;
`;

const ComingSoonTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 16px;
`;

const ComingSoonDesc = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const InteractiveProof: React.FC = () => {
  const { language } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const t = translations[language as keyof typeof translations];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setLoading(true);
      // Simulate loading
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  };

  return (
    <Container>
      <Content>
        <Title>{t.title}</Title>
        <Subtitle>{t.subtitle}</Subtitle>
        
        <form onSubmit={handleSubmit}>
          <InputContainer>
            <Input
              type="url"
              placeholder={t.placeholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? t.loading : (
                <>
                  {t.button}
                  {renderIcon(FaArrowRight)}
                </>
              )}
            </Button>
          </InputContainer>
        </form>
        
        <ComingSoonCard>
          <ComingSoonTitle>{t.comingSoon}</ComingSoonTitle>
          <ComingSoonDesc>{t.comingSoonDesc}</ComingSoonDesc>
        </ComingSoonCard>
      </Content>
    </Container>
  );
};

export default InteractiveProof;