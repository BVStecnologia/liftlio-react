import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  MessageCircle,
  Target,
  Zap,
  Github,
  Linkedin,
  Globe,
  Activity
} from 'lucide-react';

// Import photos
const stevePhoto = require('../assets/images/steve-photo.jpeg');
const valdairPhoto = require('../assets/images/valdair-photo.jpeg');

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

const HeroSection = styled.section`
  padding: 180px 40px 100px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;

  @media (max-width: 768px) {
    padding: 140px 20px 60px;
  }

  @media (max-width: 480px) {
    padding: 120px 15px 40px;
  }

  @media (max-width: 320px) {
    padding: 100px 10px 30px;
  }
`;

const FutureBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.3);
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 14px;
  color: #a855f7;
  margin-bottom: 32px;
  font-weight: 600;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  span {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 768px) {
    font-size: 48px;
  }

  @media (max-width: 480px) {
    font-size: 36px;
  }

  @media (max-width: 320px) {
    font-size: 28px;
    margin-bottom: 16px;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
  max-width: 700px;
  margin: 0 auto 48px;
  line-height: 1.6;

  @media (max-width: 480px) {
    font-size: 16px;
    margin: 0 auto 32px;
  }

  @media (max-width: 320px) {
    font-size: 14px;
    margin: 0 auto 24px;
    padding: 0 10px;
  }
`;

const PowerStatement = styled(motion.div)`
  max-width: 900px;
  margin: 60px auto;
  padding: 40px;
  background: linear-gradient(135deg,
    rgba(124, 58, 237, 0.08) 0%,
    rgba(168, 85, 247, 0.04) 100%
  );
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 24px;
  backdrop-filter: blur(40px);
  text-align: center;

  h3 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    font-size: 18px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.8);
  }

  @media (max-width: 480px) {
    padding: 30px 20px;
    margin: 40px auto;

    h3 {
      font-size: 24px;
    }

    p {
      font-size: 16px;
    }
  }

  @media (max-width: 320px) {
    padding: 20px 15px;
    margin: 30px 10px;

    h3 {
      font-size: 20px;
      margin-bottom: 15px;
    }

    p {
      font-size: 14px;
      line-height: 1.6;
    }
  }
`;

const HeroCTAButton = styled.button`
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(124, 58, 237, 0.3);
  }

  @media (max-width: 480px) {
    padding: 12px 24px;
    font-size: 16px;
  }

  @media (max-width: 320px) {
    padding: 10px 20px;
    font-size: 14px;
    gap: 6px;
  }
`;

const StatsSection = styled.section`
  padding: 60px 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 480px) {
    padding: 40px 20px;
  }

  @media (max-width: 320px) {
    padding: 30px 15px;
  }
`;

const StatsGrid = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled(motion.div)`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const FeaturesSection = styled.section`
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }

  @media (max-width: 480px) {
    padding: 40px 15px;
  }

  @media (max-width: 320px) {
    padding: 30px 10px;
  }
`;

const SectionTitle = styled(motion.h2)`
  font-size: 48px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 60px;
  background: linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 36px;
    margin-bottom: 40px;
  }

  @media (max-width: 480px) {
    font-size: 28px;
    margin-bottom: 30px;
  }

  @media (max-width: 320px) {
    font-size: 24px;
    margin-bottom: 20px;
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 40px;
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
    background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.3), transparent);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(124, 58, 237, 0.2);
  }

  @media (max-width: 480px) {
    padding: 25px;
  }

  @media (max-width: 320px) {
    padding: 20px 15px;
    border-radius: 15px;
  }
`;

const FeatureIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const FeatureTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
`;

const FeatureDescription = styled.p`
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
`;

const FoundersSection = styled.section`
  padding: 100px 40px;
  max-width: 1000px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }

  @media (max-width: 480px) {
    padding: 40px 15px;
  }

  @media (max-width: 320px) {
    padding: 30px 10px;
  }
`;

const FoundersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 60px;
  margin-top: 60px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FounderCard = styled(motion.div)`
  text-align: center;
`;

const FounderImage = styled.img`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  margin: 0 auto 24px;
  border: 3px solid rgba(124, 58, 237, 0.3);
  object-fit: cover;
`;

const FounderName = styled.h3`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const FounderRole = styled.div`
  font-size: 16px;
  color: #a855f7;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 20px;
  font-weight: 600;
`;

const FounderBio = styled.p`
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin-bottom: 24px;
`;

const SocialLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const SocialLink = styled.a`
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.7);

  &:hover {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border-color: transparent;
    color: white;
    transform: translateY(-2px);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const FooterSection = styled.footer`
  padding: 80px 40px 40px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 480px) {
    padding: 40px 20px 20px;
  }

  @media (max-width: 320px) {
    padding: 30px 15px 15px;
  }
`;

const FooterText = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const AboutPage: React.FC = () => {
  return (
    <PageContainer>
      <Navigation>
        <Logo href="/">
          LIFTLIO
          <span>BETA</span>
        </Logo>
        <NavLinks>
          <a href="/contact">Contact</a>
          <a href="/liftlio-analytics">Analytics</a>
          <a href="/trends">Trends</a>
          <SignInButton href="/login">
            Sign In
            <ArrowUpRight size={16} />
          </SignInButton>
        </NavLinks>
      </Navigation>

      <HeroSection>
        <FutureBadge>
          <Sparkles size={16} />
          About Liftlio
        </FutureBadge>

        <HeroTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          We're Building the Future of<br />
          <span>Organic Growth</span>
        </HeroTitle>

        <HeroSubtitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
        >
          Founded in 2025, Liftlio was born from a simple observation:
          businesses spend billions on ads that disappear, while organic content
          creates permanent value. We're here to change that equation.
        </HeroSubtitle>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <HeroCTAButton onClick={() => window.location.href = '/'}>
            Start Growing Organically
            <ArrowUpRight size={18} />
          </HeroCTAButton>
        </motion.div>

        <PowerStatement
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <h3>Our Mission</h3>
          <p>
            To democratize organic growth through AI automation.
            We believe every business deserves to build lasting digital presence
            without burning through advertising budgets. By automating content analysis
            and optimization, we free entrepreneurs to focus on innovation and strategy.
          </p>
        </PowerStatement>
      </HeroSection>

      <StatsSection>
        <StatsGrid>
          <StatCard
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <StatNumber>∞</StatNumber>
            <StatLabel>Compound Growth</StatLabel>
          </StatCard>
          <StatCard
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <StatNumber>24/7</StatNumber>
            <StatLabel>Always Active</StatLabel>
          </StatCard>
          <StatCard
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <StatNumber>87%</StatNumber>
            <StatLabel>Trust Over Ads</StatLabel>
          </StatCard>
          <StatCard
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <StatNumber>10x</StatNumber>
            <StatLabel>ROI Multiplier</StatLabel>
          </StatCard>
        </StatsGrid>
      </StatsSection>

      <FeaturesSection>
        <SectionTitle
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          Our Approach
        </SectionTitle>

        <FeaturesGrid>
          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <FeatureIcon>
              <TrendingUp />
            </FeatureIcon>
            <FeatureTitle>Perpetual Value</FeatureTitle>
            <FeatureDescription>
              Every mention, comment, and recommendation becomes a permanent asset.
              Content from months ago continues driving traffic today, creating
              compounding returns without additional investment.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <FeatureIcon>
              <MessageCircle />
            </FeatureIcon>
            <FeatureTitle>Authentic Reach</FeatureTitle>
            <FeatureDescription>
              Build genuine connections through peer recommendations. Real people
              sharing real experiences create trust that no amount of advertising
              can replicate.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <FeatureIcon>
              <Target />
            </FeatureIcon>
            <FeatureTitle>Zero Decay Rate</FeatureTitle>
            <FeatureDescription>
              Unlike paid ads that vanish when budgets end, organic mentions
              remain forever. Your growth engine continues accelerating with
              no ongoing cost.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <FeatureIcon>
              <Zap />
            </FeatureIcon>
            <FeatureTitle>Global Scale</FeatureTitle>
            <FeatureDescription>
              Reach audiences worldwide through natural language processing and
              cultural adaptation. Your message resonates authentically across
              any market.
            </FeatureDescription>
          </FeatureCard>
        </FeaturesGrid>
      </FeaturesSection>

      <FoundersSection>
        <SectionTitle
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          Our Founders
        </SectionTitle>

        <FoundersGrid>
          <FounderCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <FounderImage src={stevePhoto} />
            <FounderName>Steven J. Wilson</FounderName>
            <FounderRole>Co-Founder</FounderRole>
            <FounderBio>
              Certified leader in AI for Business from Wharton. Mentioned in Forbes and Inc. Magazine
              for his insights on AI. Experienced in building successful, growth minded teams.
              Believes AI should unlock new ways for businesses to acquire customers.
            </FounderBio>
            <SocialLinks>
              <SocialLink href="https://www.linkedin.com/in/stevenjwilson1/" target="_blank" rel="noopener noreferrer">
                <Linkedin />
              </SocialLink>
              <SocialLink href="https://stevenjwilson.com" target="_blank" rel="noopener noreferrer">
                <Globe />
              </SocialLink>
            </SocialLinks>
          </FounderCard>

          <FounderCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <FounderImage src={valdairPhoto} />
            <FounderName>Valdair Demello</FounderName>
            <FounderRole>Co-Founder & CTO</FounderRole>
            <FounderBio>
              Expert in machine learning, natural language processing, and scalable cloud systems.
              Passionate about democratizing access to AI-powered marketing tools and transforming
              how businesses grow globally.
            </FounderBio>
            <SocialLinks>
              <SocialLink href="https://github.com/BVStecnologia" target="_blank" rel="noopener noreferrer">
                <Github />
              </SocialLink>
              <SocialLink href="https://www.linkedin.com/in/valdair-demello" target="_blank" rel="noopener noreferrer">
                <Linkedin />
              </SocialLink>
            </SocialLinks>
          </FounderCard>
        </FoundersGrid>
      </FoundersSection>

      <FooterSection>
        <FooterText>
          © 2025 Liftlio · Building the Future of Organic Growth
        </FooterText>
      </FooterSection>
    </PageContainer>
  );
};

export default AboutPage;