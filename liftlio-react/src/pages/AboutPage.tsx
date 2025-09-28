import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  Linkedin,
  Globe,
  MessageCircle,
  Target,
  Rocket,
  Building2
} from 'lucide-react';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 100%);
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 20px;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 100px;
`;

const BadgeContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 20px;
`;

const MainTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.1;
  color: ${props => props.theme.mode === 'dark' ? '#ffffff' : '#1a1a2e'};

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.4rem;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  max-width: 800px;
  margin: 0 auto 40px;
  line-height: 1.6;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
  margin: 60px 0;
`;

const StatCard = styled(motion.div)`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
`;

const SectionContainer = styled.section`
  margin: 100px 0;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.mode === 'dark' ? '#ffffff' : '#1a1a2e'};
  margin-bottom: 20px;
`;

const SectionDescription = styled.p`
  font-size: 1.2rem;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  max-width: 700px;
  margin: 0 auto;
`;

const ConceptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  margin-top: 60px;
`;

const ConceptCard = styled(motion.div)`
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(30, 41, 59, 0.5)'
    : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.1)'
    : 'rgba(203, 213, 225, 0.3)'};
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #8b5cf6, #a855f7);
  }
`;

const IconBox = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: white;
`;

const ConceptTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${props => props.theme.mode === 'dark' ? '#f1f5f9' : '#1e293b'};
  margin-bottom: 12px;
`;

const ConceptDescription = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: ${props => props.theme.mode === 'dark' ? '#cbd5e1' : '#64748b'};
`;

const GrowthSection = styled.div`
  background: ${props => props.theme.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)'
    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.02) 100%)'};
  border-radius: 24px;
  padding: 60px 40px;
  margin: 80px 0;
  text-align: center;
`;

const GrowthTitle = styled.h2`
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 30px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const GrowthMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-top: 40px;
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const MetricIcon = styled.div`
  color: #8b5cf6;
`;

const MetricText = styled.div`
  text-align: left;
`;

const MetricValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => props.theme.mode === 'dark' ? '#ffffff' : '#1a1a2e'};
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
`;

const FoundersSection = styled.div`
  margin: 100px 0;
`;

const FoundersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  margin-top: 60px;
`;

const FounderCard = styled(motion.div)`
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(30, 41, 59, 0.5)'
    : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.1)'
    : 'rgba(203, 213, 225, 0.3)'};
  text-align: center;
`;

const FounderImage = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: 0 auto 20px;
  border: 4px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.1)'};
  object-fit: cover;
`;

const FounderImagePlaceholder = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
`;

const FounderName = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${props => props.theme.mode === 'dark' ? '#f1f5f9' : '#1e293b'};
  margin-bottom: 8px;
`;

const FounderRole = styled.div`
  font-size: 1rem;
  color: #8b5cf6;
  font-weight: 500;
  margin-bottom: 20px;
`;

const FounderBio = styled.p`
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${props => props.theme.mode === 'dark' ? '#cbd5e1' : '#64748b'};
  margin-bottom: 20px;
`;

const FounderLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const SocialLink = styled.a`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(139, 92, 246, 0.1)'
    : 'rgba(139, 92, 246, 0.05)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b5cf6;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    color: white;
    transform: translateY(-2px);
  }
`;

const AboutPage: React.FC = () => {
  // Import Steve's photo with require
  const stevePhoto = require('../assets/images/steve-photo.jpeg');

  return (
    <PageContainer>
      <ContentWrapper>
        <HeroSection>
          <BadgeContainer>
            <Rocket size={16} />
            <span>The Organic Growth Engine</span>
          </BadgeContainer>

          <MainTitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Building the Future of<br />
            Organic Traffic Generation
          </MainTitle>

          <Subtitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Liftlio is an AI-powered organic traffic machine that compounds over time,
            creating an unstoppable snowball effect of brand mentions and trust signals
            across the web.
          </Subtitle>

          <StatsGrid>
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <StatNumber>∞</StatNumber>
              <StatLabel>Compound Growth Effect</StatLabel>
            </StatCard>
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <StatNumber>24/7</StatNumber>
              <StatLabel>Autonomous Operation</StatLabel>
            </StatCard>
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <StatNumber>87%</StatNumber>
              <StatLabel>Trust Over Ads</StatLabel>
            </StatCard>
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <StatNumber>10x</StatNumber>
              <StatLabel>ROI vs Traditional Ads</StatLabel>
            </StatCard>
          </StatsGrid>
        </HeroSection>

        <SectionContainer>
          <SectionHeader>
            <SectionTitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              The Organic Traffic Machine Concept
            </SectionTitle>
            <SectionDescription>
              Every interaction creates a permanent digital footprint that continues
              generating value forever. Unlike ads that stop when you stop paying,
              Liftlio builds lasting brand equity.
            </SectionDescription>
          </SectionHeader>

          <ConceptGrid>
            <ConceptCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <IconBox>
                <TrendingUp size={28} />
              </IconBox>
              <ConceptTitle>Cumulative Effect</ConceptTitle>
              <ConceptDescription>
                Every mention, comment, and recommendation adds to your brand's
                digital footprint. These accumulate over time, creating an
                ever-growing presence that compounds exponentially.
              </ConceptDescription>
            </ConceptCard>

            <ConceptCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <IconBox>
                <MessageCircle size={28} />
              </IconBox>
              <ConceptTitle>Perpetual Value</ConceptTitle>
              <ConceptDescription>
                Comments and recommendations from 6 months ago still drive
                traffic today. Each piece of content becomes a permanent
                asset that continues working for you 24/7.
              </ConceptDescription>
            </ConceptCard>

            <ConceptCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <IconBox>
                <Target size={28} />
              </IconBox>
              <ConceptTitle>Zero Decay Rate</ConceptTitle>
              <ConceptDescription>
                Unlike paid ads that disappear when you stop paying, organic
                mentions remain forever. Your investment continues generating
                returns indefinitely with no additional cost.
              </ConceptDescription>
            </ConceptCard>
          </ConceptGrid>
        </SectionContainer>

        <GrowthSection>
          <GrowthTitle>The Snowball Effect in Action</GrowthTitle>
          <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '700px', margin: '0 auto' }}>
            Watch how organic traffic compounds over time. Each month builds on the last,
            creating unstoppable momentum for your brand.
          </p>
          <GrowthMetrics>
            <MetricItem>
              <MetricIcon>
                <BarChart3 size={40} />
              </MetricIcon>
              <MetricText>
                <MetricValue>Month 1</MetricValue>
                <MetricLabel>75 brand mentions</MetricLabel>
              </MetricText>
            </MetricItem>
            <MetricItem>
              <MetricIcon>
                <BarChart3 size={40} />
              </MetricIcon>
              <MetricText>
                <MetricValue>Month 6</MetricValue>
                <MetricLabel>450 cumulative mentions</MetricLabel>
              </MetricText>
            </MetricItem>
            <MetricItem>
              <MetricIcon>
                <BarChart3 size={40} />
              </MetricIcon>
              <MetricText>
                <MetricValue>Month 12</MetricValue>
                <MetricLabel>900+ active touchpoints</MetricLabel>
              </MetricText>
            </MetricItem>
          </GrowthMetrics>
        </GrowthSection>

        <FoundersSection>
          <SectionHeader>
            <SectionTitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Meet the Founders
            </SectionTitle>
            <SectionDescription>
              Building the future of AI-powered organic marketing
            </SectionDescription>
          </SectionHeader>

          <FoundersGrid>
            <FounderCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <FounderImage src={stevePhoto} alt="Steven J. Wilson" />
              <FounderName>Steven J. Wilson</FounderName>
              <FounderRole>Co-Founder</FounderRole>
              <FounderBio>
                Certified leader in AI for Business from Wharton. Mentioned in Forbes
                and Inc. Magazine for his insights on AI, he is experienced in building
                successful, growth minded teams. Steven believes AI should do more than
                automate; it should unlock new ways for businesses to acquire customers.
              </FounderBio>
              <FounderLinks>
                <SocialLink
                  href="https://www.linkedin.com/in/stevenjwilson1/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin size={20} />
                </SocialLink>
                <SocialLink
                  href="https://stevenjwilson.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe size={20} />
                </SocialLink>
              </FounderLinks>
            </FounderCard>

            <FounderCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <FounderImagePlaceholder>V</FounderImagePlaceholder>
              <FounderName>Valdair</FounderName>
              <FounderRole>Co-Founder & CTO</FounderRole>
              <FounderBio>
                Technical visionary and full-stack architect behind Liftlio's AI infrastructure.
                Expert in machine learning, natural language processing, and scalable systems.
                Passionate about using technology to democratize access to powerful marketing tools.
              </FounderBio>
              <FounderLinks>
                <SocialLink
                  href="https://www.linkedin.com/in/valdair"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin size={20} />
                </SocialLink>
              </FounderLinks>
            </FounderCard>
          </FoundersGrid>
        </FoundersSection>

        <SectionContainer>
          <SectionHeader>
            <SectionTitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Our Mission
            </SectionTitle>
            <SectionDescription>
              To democratize organic growth by making AI-powered marketing accessible
              to every business, regardless of size or budget.
            </SectionDescription>
          </SectionHeader>

          <ConceptGrid>
            <ConceptCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <IconBox>
                <Zap size={28} />
              </IconBox>
              <ConceptTitle>Instant Authority</ConceptTitle>
              <ConceptDescription>
                Build domain expertise and thought leadership through
                consistent, valuable contributions across your industry's
                digital ecosystem.
              </ConceptDescription>
            </ConceptCard>

            <ConceptCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <IconBox>
                <Users size={28} />
              </IconBox>
              <ConceptTitle>Trust at Scale</ConceptTitle>
              <ConceptDescription>
                Generate authentic peer recommendations that carry 10x
                more weight than traditional advertising, building real
                relationships with your audience.
              </ConceptDescription>
            </ConceptCard>

            <ConceptCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <IconBox>
                <Building2 size={28} />
              </IconBox>
              <ConceptTitle>Sustainable Growth</ConceptTitle>
              <ConceptDescription>
                Create a self-reinforcing growth engine that becomes
                stronger over time, reducing dependency on paid advertising
                while increasing organic reach.
              </ConceptDescription>
            </ConceptCard>
          </ConceptGrid>
        </SectionContainer>
      </ContentWrapper>
    </PageContainer>
  );
};

export default AboutPage;