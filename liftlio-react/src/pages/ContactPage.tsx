import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import ContactForm from '../components/ContactForm';
import CompactContactInfo from '../components/CompactContactInfo';

const PageContainer = styled.div`
  min-height: 100vh;
  background: #0A0A0B;
  color: white;
  overflow-x: hidden;
`;

const Navigation = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 20px 40px;
  background: rgba(10, 10, 11, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 480px) {
    padding: 15px 20px;
  }

  @media (max-width: 320px) {
    padding: 12px 15px;
  }
`;

const Logo = styled.a`
  font-size: 24px;
  font-weight: 800;
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  @media (max-width: 480px) {
    font-size: 20px;
  }

  @media (max-width: 320px) {
    font-size: 18px;

    span {
      font-size: 10px;
      padding: 3px 6px;
    }
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 32px;
  align-items: center;

  a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 16px;
    transition: color 0.3s ease;

    &:hover {
      color: white;
    }
  }

  @media (max-width: 768px) {
    gap: 20px;

    a {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    gap: 12px;

    a:not(:last-child) {
      display: none;
    }
  }
`;

const SignInButton = styled.a`
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  padding: 10px 24px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(124, 58, 237, 0.3);
  }

  @media (max-width: 480px) {
    padding: 8px 16px;
    font-size: 14px;
  }

  @media (max-width: 320px) {
    padding: 6px 12px;
    font-size: 12px;
    gap: 4px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const ContactSection = styled.section`
  padding: 140px 40px 100px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;

  @media (max-width: 768px) {
    padding: 120px 20px 60px;
  }

  @media (max-width: 480px) {
    padding: 100px 15px 40px;
  }

  @media (max-width: 320px) {
    padding: 80px 10px 30px;
  }
`;

const ContactBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.3);
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 14px;
  color: #a855f7;
  margin: 0 auto 32px;
  font-weight: 600;
`;

const ContactTitle = styled(motion.h1)`
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;

  span {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 768px) {
    font-size: 40px;
  }

  @media (max-width: 480px) {
    font-size: 32px;
  }

  @media (max-width: 320px) {
    font-size: 26px;
    margin-bottom: 16px;
  }
`;

const ContactSubtitle = styled(motion.p)`
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
  max-width: 600px;
  margin: 0 auto 80px;
  line-height: 1.6;
  text-align: center;

  @media (max-width: 480px) {
    font-size: 16px;
    margin: 0 auto 40px;
  }

  @media (max-width: 320px) {
    font-size: 14px;
    margin: 0 auto 30px;
    padding: 0 10px;
  }
`;


const MapCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  height: 100%;
  min-height: 420px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

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
    z-index: 1;
  }

  iframe {
    width: 100%;
    height: 100%;
    min-height: 420px;
    border-radius: 20px;
  }

  &:hover {
    border-color: rgba(124, 58, 237, 0.2);
    box-shadow: 0 8px 32px rgba(124, 58, 237, 0.15);
  }
`;


const NoticeSection = styled(motion.div)`
  background: rgba(124, 58, 237, 0.03);
  border: 1px solid rgba(124, 58, 237, 0.15);
  border-radius: 16px;
  padding: 20px 28px;
  text-align: center;
  max-width: 700px;
  margin: 50px auto 0;
  backdrop-filter: blur(10px);
`;

const NoticeText = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;

  strong {
    color: rgba(255, 255, 255, 0.8);
  }
`;

const FooterSection = styled.footer`
  padding: 80px 40px 40px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const FooterText = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const ContactPage: React.FC = () => {
  return (
    <PageContainer>
      <Navigation>
        <Logo href="/">
          LIFTLIO
          <span>BETA</span>
        </Logo>
        <NavLinks>
          <a href="/about">About</a>
          <a href="/analytics">Analytics</a>
          <a href="/trends">Trends</a>
          <SignInButton href="/login">
            Sign In
            <ArrowUpRight size={16} />
          </SignInButton>
        </NavLinks>
      </Navigation>

      <ContactSection>
        <ContactBadge>
          <Sparkles size={16} />
          Contact Us
        </ContactBadge>

        <ContactTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Let's Build Your <span>Organic Growth</span>
        </ContactTitle>

        <ContactSubtitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
        >
          Ready to transform your business with AI-powered organic growth?
          We're here to help you get started.
        </ContactSubtitle>

        {/* Compact Contact Info Component */}
        <CompactContactInfo />

        {/* Google Maps */}
        <MapCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ marginTop: '32px', maxWidth: '700px', margin: '32px auto 0' }}
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2821.6044231084!2d-106.94335192340897!3d44.78416917107084!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88646f57c8b83071%3A0xdd21c27794a6fd4d!2sLiftlio!5e0!3m2!1sen!2sus!4v1735513200000"
            width="100%"
            height="420"
            style={{ border: 0, borderRadius: '20px' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Liftlio Location"
          />
        </MapCard>

        <NoticeSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <NoticeText>
            <strong>Note:</strong> For immediate assistance, please use the contact information above.
            We're committed to responding to all inquiries within 24 business hours.
            To prevent spam, we've formatted the email address with [at] instead of @.
          </NoticeText>
        </NoticeSection>

        {/* Contact Form */}
        <ContactForm />
      </ContactSection>

      <FooterSection>
        <FooterText>
          © 2025 Liftlio · Building the Future of Organic Growth
        </FooterText>
      </FooterSection>
    </PageContainer>
  );
};

export default ContactPage;