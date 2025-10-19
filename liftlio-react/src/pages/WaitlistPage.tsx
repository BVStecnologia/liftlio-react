import React, { useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../lib/supabaseClient';
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
  padding: 48px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.6;
`;

const BetaBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const Input = styled.input`
  padding: 14px 16px;
  font-size: 16px;
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 12px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  transition: all 0.3s;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
    opacity: 0.6;
  }
`;

const Select = styled.select`
  padding: 14px 16px;
  font-size: 16px;
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 12px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.3s;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`;

const Button = styled.button<{ disabled?: boolean }>`
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 700;
  color: #000;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  border: none;
  border-radius: 50px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: all 0.3s;

  &:hover {
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 8px 24px rgba(139, 92, 246, 0.4)'};
  }
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #ef4444;
  font-size: 14px;
  text-align: center;
`;

const WaitlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website: '',
    source: 'Other'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('add_to_waitlist', {
        p_name: formData.name,
        p_email: formData.email,
        p_website_url: formData.website || null,
        p_discovery_source: formData.source
      });

      if (rpcError) throw rpcError;

      if (!data.success) {
        setError(data.error);
        return;
      }

      // Success - redirect to pending page
      navigate('/waitlist-pending');

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Header>
          <Title>Join the Waitlist</Title>
          <Subtitle>
            Be among the first to turn conversations into customers with AI-powered word-of-mouth marketing.
          </Subtitle>
          <BetaBadge>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Limited Beta Access
          </BetaBadge>
        </Header>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>Full Name *</Label>
            <Input
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
            />
          </InputGroup>

          <InputGroup>
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label>Website / Product URL</Label>
            <Input
              type="url"
              placeholder="https://yourproduct.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </InputGroup>

          <InputGroup>
            <Label>How did you find us? *</Label>
            <Select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              required
            >
              <option value="Twitter/X">Twitter / X</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Referral">Referral</option>
              <option value="YouTube">YouTube</option>
              <option value="Google">Google</option>
              <option value="Other">Other</option>
            </Select>
          </InputGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join the Waitlist'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default WaitlistPage;
