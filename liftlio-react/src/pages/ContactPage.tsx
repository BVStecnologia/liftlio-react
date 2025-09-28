import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Copy,
  Check,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

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

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

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

const Subtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
`;

const ContactCard = styled(motion.div)`
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
  position: relative;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(139, 92, 246, 0.15);
  }
`;

const IconWrapper = styled.div`
  width: 50px;
  height: 50px;
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

const CardContent = styled.div`
  font-size: 1rem;
  line-height: 1.6;
  color: ${props => props.theme.mode === 'dark' ? '#cbd5e1' : '#64748b'};
`;

const AddressLine = styled.p`
  margin: 5px 0;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.1)'
      : 'rgba(100, 116, 139, 0.1)'};
  }

  &.copied {
    color: #10b981;
  }
`;

const LinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.9;
  }
`;

const TemporaryNotice = styled(motion.div)`
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(251, 146, 60, 0.1)'
    : 'rgba(251, 146, 60, 0.05)'};
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(251, 146, 60, 0.3)'
    : 'rgba(251, 146, 60, 0.2)'};
  border-radius: 12px;
  padding: 15px 20px;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: ${props => props.theme.mode === 'dark' ? '#fb923c' : '#ea580c'};
`;

const EmailProtected = styled.span`
  font-family: 'Courier New', monospace;
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.1)'
    : 'rgba(100, 116, 139, 0.05)'};
  padding: 2px 6px;
  border-radius: 4px;
`;

const ContactPage: React.FC = () => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = (text: string, item: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const address = '1309 Coffeen Ave STE 1200\nSheridan, WY 82801';
  const phone = '(629) 888-3360';
  const emailProtected = 'info [ at ] liftlio.com';
  const emailReal = 'info@liftlio.com';
  const googleBusinessUrl = 'https://www.google.com/maps/place/Liftlio/@44.7841692,-106.9435319,699m/data=!3m2!1e3!4b1!4m6!3m5!1s0x88646f57c8b83071:0xdd21c27794a6fd';

  return (
    <PageContainer>
      <ContentWrapper>
        <Header>
          <Title
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Entre em Contato
          </Title>
          <Subtitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Estamos aqui para ajudar você a transformar seus dados em insights
          </Subtitle>
        </Header>

        <ContactGrid>
          <ContactCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <CopyButton
              onClick={() => handleCopy(address.replace('\n', ', '), 'address')}
              className={copiedItem === 'address' ? 'copied' : ''}
            >
              {copiedItem === 'address' ? <Check size={18} /> : <Copy size={18} />}
            </CopyButton>
            <IconWrapper>
              <MapPin size={24} />
            </IconWrapper>
            <CardTitle>Endereço</CardTitle>
            <CardContent>
              <AddressLine>1309 Coffeen Ave STE 1200</AddressLine>
              <AddressLine>Sheridan, WY 82801</AddressLine>
              <AddressLine>Estados Unidos</AddressLine>
            </CardContent>
          </ContactCard>

          <ContactCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <CopyButton
              onClick={() => handleCopy(phone, 'phone')}
              className={copiedItem === 'phone' ? 'copied' : ''}
            >
              {copiedItem === 'phone' ? <Check size={18} /> : <Copy size={18} />}
            </CopyButton>
            <IconWrapper>
              <Phone size={24} />
            </IconWrapper>
            <CardTitle>Telefone</CardTitle>
            <CardContent>
              <p>{phone}</p>
              <TemporaryNotice
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle size={16} />
                <span>Temporário para verificação</span>
              </TemporaryNotice>
            </CardContent>
          </ContactCard>

          <ContactCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <CopyButton
              onClick={() => handleCopy(emailReal, 'email')}
              className={copiedItem === 'email' ? 'copied' : ''}
            >
              {copiedItem === 'email' ? <Check size={18} /> : <Copy size={18} />}
            </CopyButton>
            <IconWrapper>
              <Mail size={24} />
            </IconWrapper>
            <CardTitle>Email</CardTitle>
            <CardContent>
              <EmailProtected>{emailProtected}</EmailProtected>
              <p style={{ fontSize: '0.85rem', marginTop: '10px', opacity: 0.7 }}>
                Clique no botão acima para copiar o email real
              </p>
            </CardContent>
          </ContactCard>

          <ContactCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <IconWrapper>
              <Globe size={24} />
            </IconWrapper>
            <CardTitle>Google Business</CardTitle>
            <CardContent>
              <p>Encontre-nos no Google Maps</p>
              <LinkButton
                href={googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no Google Maps
                <ExternalLink size={16} />
              </LinkButton>
            </CardContent>
          </ContactCard>
        </ContactGrid>
      </ContentWrapper>
    </PageContainer>
  );
};

export default ContactPage;