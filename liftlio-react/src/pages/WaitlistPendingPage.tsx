import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: ${props => props.theme.colors.background};
`;

const Card = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 24px;
  padding: 64px 48px;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 48px 32px;
  }
`;

const Icon = styled.div`
  font-size: 72px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const Message = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.8;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const Button = styled.button`
  padding: 16px 40px;
  font-size: 16px;
  font-weight: 700;
  color: #000;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
  }
`;

const WaitlistPendingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Card>
        <Icon>✨</Icon>
        <Title>Thank You!</Title>
        <Message>
          You're on the waitlist. We'll be in touch soon via email.
          <br />
          Check your inbox (and spam folder) for confirmation.
        </Message>
        <Button onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Card>
    </Container>
  );
};

export default WaitlistPendingPage;
