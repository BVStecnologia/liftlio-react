import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail } from 'lucide-react';

const ContactCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  max-width: 700px;
  margin: 0 auto;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent,
      rgba(124, 58, 237, 0.3),
      transparent
    );
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(124, 58, 237, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(124, 58, 237, 0.15);
  }

  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const ContactItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;

  svg {
    width: 24px;
    height: 24px;
    color: white;
  }
`;

const ContactLabel = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
`;

const ContactValue = styled.div`
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;

  a {
    color: inherit;
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: #a855f7;
    }
  }
`;

const CompactContactInfo: React.FC = () => {
  return (
    <ContactCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <ContactGrid>
        <ContactItem>
          <IconWrapper>
            <MapPin />
          </IconWrapper>
          <ContactLabel>Headquarters</ContactLabel>
          <ContactValue>
            1309 Coffeen Ave STE 1200<br />
            Sheridan, WY 82801
          </ContactValue>
        </ContactItem>

        <ContactItem>
          <IconWrapper>
            <Phone />
          </IconWrapper>
          <ContactLabel>Phone</ContactLabel>
          <ContactValue>
            <a href="tel:+16298883360">(629) 888-3360</a>
          </ContactValue>
        </ContactItem>

        <ContactItem>
          <IconWrapper>
            <Mail />
          </IconWrapper>
          <ContactLabel>Email</ContactLabel>
          <ContactValue>
            support [at] liftlio.com
          </ContactValue>
        </ContactItem>
      </ContactGrid>
    </ContactCard>
  );
};

export default CompactContactInfo;