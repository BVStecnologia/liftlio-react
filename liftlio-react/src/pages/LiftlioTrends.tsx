import React, { useEffect, useRef } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import { 
  FaFire, FaChartLine, FaArrowUp, FaArrowDown,
  FaRocket, FaVideo, FaUsers, FaEye, FaClock, FaChartPie,
  FaSync, FaRobot, FaYoutube, FaBrain, FaBolt,
  FaTwitter, FaLinkedin, FaGithub, FaEnvelope
} from 'react-icons/fa';
import { HiLightningBolt, HiFire } from 'react-icons/hi';
import { useTrendsData } from '../hooks/useTrendsData';
import AnimatedBars3D from '../components/AnimatedBars3D';

// Global Styles
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 0;
    background: #0a0a0a !important;
    background-color: #0a0a0a !important;
    background-image: none !important;
    color: #ffffff;
    overflow-x: hidden;
  }

  /* Force remove any green/turquoise colors */
  html, body, #root {
    background: #0a0a0a !important;
    background-color: #0a0a0a !important;
    background-image: none !important;
    filter: none !important;
  }

  /* Responsive 2-column grid */
  @media (max-width: 768px) {
    .responsive-2col {
      grid-template-columns: 1fr !important;
    }
  }
`;

// Theme colors - usando as cores padrões do sistema
const theme = {
  primary: '#8b5cf6',
  secondary: '#a855f7',
  accent: '#ec4899',
  gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
  gradientAccent: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
};

// Header Components
const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 20px 0;
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid #27272a;
  transition: all 0.3s;
`;

const HeaderContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.a`
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #ffffff;
  transition: all 0.3s;
  
  &:hover {
    color: ${theme.primary};
  }
`;

const LogoText = styled.span`
  background: ${theme.gradient};
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const TrendsText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 8px;
`;

const BetaBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  background: rgba(168, 85, 247, 0.2);
  color: ${theme.secondary};
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  vertical-align: super;
  margin-left: 8px;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 32px;
`;

const NavButtons = styled.div`
  display: flex;
  gap: 16px;
`;

const SignInButton = styled.a`
  background: ${theme.gradient};
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }
`;

// Footer removed - keeping page minimal like Overview dashboard

// Animations - Minimalist approach
const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: #0a0a0a !important;
  background-color: #0a0a0a !important;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0a0a0a !important;
    z-index: -2;
    pointer-events: none;
  }
  
  &::after {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(139, 92, 246, 0.02) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
  }
`;

const MainContainer = styled.main`
  padding-top: 80px;
  min-height: calc(100vh - 80px);
`;

const BackgroundCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
  display: block;
`;

const HeroSection = styled.section`
  padding: 100px 60px 80px;
  text-align: center;
  position: relative;
  width: 100%;
  overflow: hidden;

  @media (max-width: 1200px) {
    padding: 100px 40px 60px;
  }

  @media (max-width: 768px) {
    padding: 80px 20px 40px;
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-size: clamp(1.8rem, 6vw, 3.5rem);
  font-weight: 700;
  margin: 0 auto 20px;
  max-width: 900px;
  color: #ffffff;
  line-height: 1.2;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const HeroSubtitle = styled(motion.p)`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: rgba(255, 255, 255, 0.7);
  max-width: 700px;
  margin: 0 auto 40px;
  position: relative;
  z-index: 2;
`;

// Different grid layouts for variety
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ThreeColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

// Minimalist metric cards with outline icons
const StatCard = styled(motion.div)`
  background: rgba(26, 26, 26, 0.3);
  border: 1px solid rgba(161, 161, 170, 0.2);
  border-radius: 12px;
  padding: 28px;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 48px;
  height: 48px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 2px solid ${props => props.color || theme.primary};
  border-radius: 12px;
  font-size: 22px;
  color: ${props => props.color || theme.primary};
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 400;
  color: #ffffff;
  margin-bottom: 4px;
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  margin-bottom: 8px;
`;

const StatSubtitle = styled.div`
  font-size: 12px;
  color: #a1a1aa;
  font-weight: 400;
`;

const TrendsSection = styled.section`
  padding: 60px 60px;
  width: 100%;

  @media (max-width: 1200px) {
    padding: 60px 40px;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  background: ${theme.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const TrendsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 30px;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TrendCard = styled(motion.div)`
  background: rgba(26, 26, 26, 0.3);
  border: 1px solid rgba(161, 161, 170, 0.2);
  border-radius: 16px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(161, 161, 170, 0.3);
  }
`;

const TrendHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const TrendInfo = styled.div`
  flex: 1;
`;

const TrendName = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
`;

const TrendStatus = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(26, 26, 26, 0.5);
  border: 1px solid rgba(161, 161, 170, 0.2);
  color: #a1a1aa;
`;

const TrendGrowth = styled.div<{ $positive: boolean }>`
  font-size: 2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.$positive ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'};
`;

const TrendStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin: 20px 0;
`;

const TrendStat = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);

  svg {
    color: #a1a1aa;
  }
`;

const TrendChart = styled.div`
  height: 100px;
  margin: 20px 0;
  opacity: 0.9;
`;

const TrendInsights = styled.div`
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(161, 161, 170, 0.15);
`;

const TrendInsight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  svg {
    color: #a1a1aa;
    flex-shrink: 0;
  }
`;

const HowItWorksSection = styled.section`
  padding: 100px 60px;
  border-top: 1px solid rgba(139, 92, 246, 0.1);

  @media (max-width: 1200px) {
    padding: 60px 40px;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

// 2x2 grid for more visual impact (like Analytics)
const HowItWorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const HowItWorksCard = styled.div`
  background: rgba(26, 26, 26, 0.3);
  border: 1px solid rgba(161, 161, 170, 0.2);
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(161, 161, 170, 0.3);
  }

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 20px 0 12px;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  p {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    margin-bottom: 16px;
    font-style: italic;
  }

  > div:last-child {
    font-size: 0.85rem;
    color: ${theme.primary};
    line-height: 1.5;
  }
`;

const HowItWorksIcon = styled.div`
  width: 60px;
  height: 60px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.gradient};
  border-radius: 16px;
  font-size: 28px;
  color: #ffffff;
`;

const CategorySection = styled.section`
  padding: 60px 60px;
  
  @media (max-width: 1200px) {
    padding: 60px 40px;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

// Analytics-style city cards for categories
const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
`;

const CategoryCard = styled.div`
  background: rgba(26, 26, 26, 0.3);
  border: 1px solid rgba(161, 161, 170, 0.15);
  padding: 20px;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(26, 26, 26, 0.5);
    border-color: rgba(161, 161, 170, 0.25);
  }

  h3 {
    font-size: 1rem;
    font-weight: 500;
    margin: 0 0 4px 0;
    color: #d4d4d8;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  p {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 12px 0 0 0;
    padding-top: 12px;
    border-top: 1px solid rgba(161, 161, 170, 0.15);
    color: #ffffff;
  }

  span {
    font-size: 0.75rem;
    color: #a1a1aa;
    display: block;
    margin-top: 4px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 20px;
`;

const LoadingSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(139, 92, 246, 0.2);
  border-top-color: ${theme.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 20px;
  text-align: center;
  padding: 20px;
`;

const RefreshButton = styled.button`
  background: ${theme.gradient};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
  }
`;

// Helper functions
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const getSentimentIcon = (score: number) => {
  if (score >= 0.6) return '😍';
  if (score >= 0.2) return '😊';
  if (score >= -0.2) return '😐';
  if (score >= -0.6) return '😟';
  return '😡';
};

// Removed excessive animations for minimalist design

// Main Component
const LiftlioTrends: React.FC = () => {
  console.log('[LiftlioTrends] Component is rendering!');
  const { trends, summary, analytics, loading, error, refresh, getHistoricalData } = useTrendsData();

  if (loading) {
    return (
      <PageContainer>
        <GlobalStyle />
        <LoadingContainer>
          <LoadingSpinner />
          <h2 style={{ color: theme.primary }}>Neural Engine Activating...</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Processing real-time signals from YouTube</p>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <GlobalStyle />
        <ErrorContainer>
          <div style={{ 
            color: theme.primary, 
            fontSize: '60px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            ⚠️
          </div>
          <h2>Unable to Load Trends</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '400px' }}>
            {error}
          </p>
          <RefreshButton onClick={refresh}>
            🔄 Try Again
          </RefreshButton>
        </ErrorContainer>
      </PageContainer>
    );
  }

  const risingTrends = trends.filter(t => t.growth > 0);
  const decliningTrends = trends.filter(t => t.growth < 0);
  
  // Different colored icons like Analytics
  const stats = [
    {
      icon: React.createElement(FaRocket as any),
      label: 'Active Trends',
      value: trends.length,
      color: '#8b5cf6',
      subtitle: 'monitoring now'
    },
    {
      icon: React.createElement(FaChartLine as any),
      label: 'Average Growth',
      value: summary ? `+${summary.avg_growth.toFixed(0)}%` : '0%',
      color: '#8b5cf6',
      subtitle: 'last 30 days'
    },
    {
      icon: React.createElement(FaBolt as any),
      label: 'Heat Index',
      value: `${((summary?.by_status?.BLAZING || 0) + (summary?.by_status?.['ON FIRE'] || 0) + (summary?.by_status?.HOT || 0)).toString()}`,
      color: '#8b5cf6',
      subtitle: 'blazing trends'
    },
    {
      icon: React.createElement(FaBrain as any),
      label: 'Sentiment Score',
      value: summary ? `${(summary.avg_sentiment * 100).toFixed(0)}%` : '0%',
      color: '#8b5cf6',
      subtitle: 'emotional analysis'
    }
  ];

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', position: 'relative' }}>
      <GlobalStyle />
      
      {/* Background Layer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0a0a0a',
        zIndex: -10
      }} />

      <PageContainer style={{ paddingTop: '80px' }}>
        <MainContainer>
          {/* Hero Section */}
          <HeroSection>
            <AnimatedBars3D />
            <HeroContent>
              <HeroTitle
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                The Intelligence System That Decodes YouTube in Real-Time
              </HeroTitle>
              <HeroSubtitle
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Real-time YouTube trend analysis. 
                Catch emerging patterns before they explode. 
              </HeroSubtitle>
            
            
            <StatsGrid>
              {stats.map((stat, index) => (
                <StatCard
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <StatLabel>{stat.label}</StatLabel>
                  <StatIcon color={stat.color}>{stat.icon}</StatIcon>
                  <StatValue>{stat.value}</StatValue>
                  {stat.subtitle && (
                    <StatSubtitle>{stat.subtitle}</StatSubtitle>
                  )}
                </StatCard>
              ))}
            </StatsGrid>
            </HeroContent>
          </HeroSection>

          {/* How It Works */}
          <HowItWorksSection>
            <SectionTitle>How We Detect the Undetectable</SectionTitle>
            <p style={{ 
              textAlign: 'center', 
              maxWidth: '800px', 
              margin: '0 auto 40px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.1rem',
              lineHeight: '1.6'
            }}>
              Our Discovery Engine operates in 5 simultaneous dimensions:
            </p>
            <HowItWorksGrid>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaChartLine as any)}</HowItWorksIcon>
                <h3>VELOCITY TRACKING</h3>
                <p style={{ fontStyle: 'italic' }}>"We measure acceleration - not velocity. Detect explosions before they happen."</p>
                <div style={{ color: theme.primary }}>
                  • Real-time acceleration<br/>
                  • 30-day trend graph
                </div>
              </HowItWorksCard>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaBolt as any)}</HowItWorksIcon>
                <h3>MOMENTUM ENGINE</h3>
                <p style={{ fontStyle: 'italic' }}>"The invisible force behind trends. Separating fads from movements."</p>
                <div style={{ color: theme.primary }}>
                  • Real momentum score<br/>
                  • Visual force indicator
                </div>
              </HowItWorksCard>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaBrain as any)}</HowItWorksIcon>
                <h3>SENTIMENT DNA</h3>
                <p style={{ fontStyle: 'italic' }}>"Decode emotional genetics. Which emotion drives engagement."</p>
                <div style={{ color: theme.primary }}>
                  • Real scores: 0-100<br/>
                  • Precise emotion labels
                </div>
              </HowItWorksCard>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaClock as any)}</HowItWorksIcon>
                <h3>TEMPORAL VISION</h3>
                <p style={{ fontStyle: 'italic' }}>"Track the complete journey: birth, peak, and death."</p>
                <div style={{ color: theme.primary }}>
                  • Days trending tracker<br/>
                  • Peak prediction AI
                </div>
              </HowItWorksCard>
            </HowItWorksGrid>
          </HowItWorksSection>

          {/* Rising Trends */}
          {risingTrends.length > 0 && (
            <TrendsSection>
              <SectionTitle>
                Blazing & On Fire
              </SectionTitle>
              <p style={{ 
                textAlign: 'center', 
                maxWidth: '600px', 
                margin: '0 auto 30px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem'
              }}>
                {summary?.by_status?.BLAZING || 0} trends reaching maximum heat right now. 
                Growth detected: +{summary?.top_growing?.[0]?.growth.toFixed(0) || 0}% in the last 30 days.
              </p>
              <TrendsGrid>
                {trends.filter(t => t.growth > 0).slice(0, 9).map((trend, index) => {
                  const historicalData = getHistoricalData(trend);
                  
                  return (
                    <TrendCard
                      key={trend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <TrendHeader>
                        <TrendInfo>
                          <TrendName>{trend.topic}</TrendName>
                          <TrendStatus $status={trend.status}>{trend.status}</TrendStatus>
                        </TrendInfo>
                      </TrendHeader>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div>
                          <TrendGrowth $positive={trend.growth > 0}>
                            {trend.growth > 0 ? '+' : ''}{trend.growth.toFixed(1)}%
                            {trend.growth > 0 ? 
                              React.createElement(FaArrowUp as any) : 
                              React.createElement(FaArrowDown as any)
                            }
                          </TrendGrowth>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            30-day growth
                          </div>
                        </div>
                        {(trend.velocity !== undefined && trend.velocity !== null && trend.velocity !== 0) ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: theme.secondary }}>
                              {trend.velocity.toFixed(1)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                              velocity/day
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <TrendStats>
                        {(trend.velocity !== undefined && trend.velocity !== null && trend.velocity !== 0) ? (
                          <TrendStat>
                            {React.createElement(FaChartLine as any)}
                            Velocity: {trend.velocity.toFixed(1)}/day
                          </TrendStat>
                        ) : null}
                        <TrendStat>
                          {React.createElement(FaBolt as any)}
                          Momentum: {trend.momentum?.toFixed(0) || 0}
                        </TrendStat>
                        <TrendStat>
                          {React.createElement(FaEye as any)}
                          {formatNumber(trend.volume)} views
                        </TrendStat>
                        <TrendStat>
                          {getSentimentIcon(trend.sentiment_score)}
                          {(trend.sentiment_score * 100).toFixed(0)}% positive
                        </TrendStat>
                      </TrendStats>

                      <TrendChart>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={historicalData}>
                            <defs>
                              <linearGradient id={`gradient-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.9)',
                                border: '1px solid rgba(161, 161, 170, 0.3)',
                                borderRadius: '8px'
                              }}
                              labelStyle={{ color: '#a1a1aa' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#d4d4d8"
                              strokeWidth={2}
                              fill={`url(#gradient-${trend.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </TrendChart>

                      <TrendInsights>
                        <div style={{
                          background: 'rgba(26, 26, 26, 0.3)',
                          border: '1px solid rgba(161, 161, 170, 0.15)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Insights
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                            • Growth pattern: <span style={{ color: 'rgba(255,255,255,0.9)' }}>+{trend.growth.toFixed(0)}%</span>{trend.velocity && trend.velocity !== 0 ? <> with acceleration of <span style={{ color: 'rgba(255,255,255,0.9)' }}>{trend.velocity.toFixed(1)}/day</span></> : null}<br/>
                            • Momentum score: <span style={{ color: 'rgba(255,255,255,0.9)' }}>{trend.momentum?.toFixed(0) || 0}</span> ({trend.momentum > 50 ? 'Strong' : 'Moderate'})<br/>
                            • Engagement rate: <span style={{ color: 'rgba(255,255,255,0.9)' }}>{(trend.engagement_rate * 100).toFixed(1)}%</span> - {trend.engagement_rate > 0.05 ? 'Above average' : 'Normal'}
                          </div>
                        </div>
                        {trend.temporal_data && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                            Opportunity window: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Open</span><br/>
                            Trending for {trend.temporal_data.days_trending} days<br/>
                            {trend.scores?.saturation < 50 && (
                              <>Enter now before saturation</>
                            )}
                          </div>
                        )}
                      </TrendInsights>
                    </TrendCard>
                  );
                })}
              </TrendsGrid>
            </TrendsSection>
          )}

          {/* Declining Trends */}
          {decliningTrends.length > 0 && (
            <TrendsSection>
              <SectionTitle>
                Cooling & Frozen
              </SectionTitle>
              <p style={{ 
                textAlign: 'center', 
                maxWidth: '600px', 
                margin: '0 auto 30px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem'
              }}>
                {summary?.by_status?.COOLING || 0} trends cooling down. 
                Saturation detected. Window closing.
              </p>
              <TrendsGrid>
                {trends.filter(t => t.growth < 0).slice(0, 6).map((trend, index) => {
                  const historicalData = getHistoricalData(trend);
                  
                  return (
                    <TrendCard
                      key={trend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <TrendHeader>
                        <TrendInfo>
                          <TrendName>{trend.topic}</TrendName>
                          <TrendStatus $status={trend.status}>{trend.status}</TrendStatus>
                        </TrendInfo>
                      </TrendHeader>

                      <TrendGrowth $positive={false}>
                        {trend.growth.toFixed(1)}%
                        {React.createElement(FaArrowDown as any)}
                      </TrendGrowth>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                        Decline
                      </div>

                      <TrendStats>
                        {(trend.velocity !== undefined && trend.velocity !== null && trend.velocity !== 0) ? (
                          <TrendStat>
                            {React.createElement(FaChartLine as any)}
                            Velocity: {trend.velocity.toFixed(1)}/day
                          </TrendStat>
                        ) : null}
                        <TrendStat>
                          {getSentimentIcon(trend.sentiment_score)}
                          {(trend.sentiment_score * 100).toFixed(0)}%
                        </TrendStat>
                      </TrendStats>

                      <TrendChart>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={historicalData}>
                            <defs>
                              <linearGradient id={`gradient-decline-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.9)',
                                border: '1px solid rgba(161, 161, 170, 0.3)',
                                borderRadius: '8px'
                              }}
                              labelStyle={{ color: '#a1a1aa' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#d4d4d8"
                              strokeWidth={2}
                              fill={`url(#gradient-decline-${trend.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </TrendChart>

                      <TrendInsights>
                        <div style={{
                          background: 'rgba(26, 26, 26, 0.3)',
                          border: '1px solid rgba(161, 161, 170, 0.15)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Insights
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                            • Growth pattern: <span style={{ color: 'rgba(255,255,255,0.9)' }}>+{trend.growth.toFixed(0)}%</span>{trend.velocity && trend.velocity !== 0 ? <> with acceleration of <span style={{ color: 'rgba(255,255,255,0.9)' }}>{trend.velocity.toFixed(1)}/day</span></> : null}<br/>
                            • Momentum score: <span style={{ color: 'rgba(255,255,255,0.9)' }}>{trend.momentum?.toFixed(0) || 0}</span> ({trend.momentum > 50 ? 'Strong' : 'Moderate'})<br/>
                            • Engagement rate: <span style={{ color: 'rgba(255,255,255,0.9)' }}>{(trend.engagement_rate * 100).toFixed(1)}%</span> - {trend.engagement_rate > 0.05 ? 'Above average' : 'Normal'}
                          </div>
                        </div>
                        {trend.temporal_data && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                            Opportunity window: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Open</span><br/>
                            Trending for {trend.temporal_data.days_trending} days<br/>
                            {trend.scores?.saturation < 50 && (
                              <>Enter now before saturation</>
                            )}
                          </div>
                        )}
                      </TrendInsights>
                    </TrendCard>
                  );
                })}
              </TrendsGrid>
            </TrendsSection>
          )}

          {/* Categories */}
          {summary?.categories && summary.categories.length > 0 && (
            <CategorySection>
              <SectionTitle>
                YouTube Territories Now
              </SectionTitle>
              <p style={{ 
                textAlign: 'center', 
                maxWidth: '600px', 
                margin: '0 auto 30px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem'
              }}>
                Our AI identified that <span style={{ color: theme.primary, fontWeight: '600' }}>
                {summary.categories[0].category}</span> is dominating with {Math.round((summary.categories[0].count / trends.length) * 100)}% of trends.
              </p>
              <CategoryGrid>
                {summary.categories.map((category, index) => (
                  <CategoryCard key={index}>
                    <h3>
                      <span style={{
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: `rgba(139, 92, 246, ${0.9 - (index * 0.1)})`,
                        textAlign: 'center',
                        lineHeight: '24px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {index + 1}
                      </span>
                      {category.category}
                    </h3>
                    <p>{category.count}</p>
                    <span>active trends</span>
                  </CategoryCard>
                ))}
              </CategoryGrid>
            </CategorySection>
          )}

          {/* Métricas de Credibilidade */}
          <TrendsSection>
            <SectionTitle>
              Why Our Data Is Different
            </SectionTitle>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px',
              maxWidth: '1200px',
              margin: '40px auto'
            }}
            className="responsive-2col"
            >
              <div style={{
                background: 'rgba(26, 26, 26, 0.3)',
                border: '1px solid rgba(161, 161, 170, 0.2)',
                borderRadius: '16px',
                padding: '32px'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '12px', fontSize: '1.2rem', fontWeight: '600' }}>Multi-Dimensional Analysis</h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  We analyze <span style={{ color: '#a855f7', fontWeight: '600' }}>47 dimensions</span>:
                  velocity, momentum, sentiment, engagement, and more.
                </p>
              </div>

              <div style={{
                background: 'rgba(26, 26, 26, 0.3)',
                border: '1px solid rgba(161, 161, 170, 0.2)',
                borderRadius: '16px',
                padding: '32px'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '12px', fontSize: '1.2rem', fontWeight: '600' }}>Early Detection</h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Detect patterns <span style={{ color: '#8b5cf6', fontWeight: '600' }}>7-14 days before</span> explosion.
                  When others see it, it's too late.
                </p>
              </div>

              <div style={{
                background: 'rgba(26, 26, 26, 0.3)',
                border: '1px solid rgba(161, 161, 170, 0.2)',
                borderRadius: '16px',
                padding: '32px'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '12px', fontSize: '1.2rem', fontWeight: '600' }}>Surgical Precision</h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Confidence score on every prediction.
                  <span style={{ color: '#8b5cf6', fontWeight: '600' }}>92% accuracy</span>.
                </p>
              </div>

              <div style={{
                background: 'rgba(26, 26, 26, 0.3)',
                border: '1px solid rgba(161, 161, 170, 0.2)',
                borderRadius: '16px',
                padding: '32px'
              }}>
                <h3 style={{ color: '#8b5cf6', marginBottom: '12px', fontSize: '1.2rem', fontWeight: '600' }}>Temporal Vision</h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  See past, present, and future. Know <span style={{ color: '#8b5cf6', fontWeight: '600' }}>what</span> trends and <span style={{ color: '#8b5cf6', fontWeight: '600' }}>when</span> they stop.
                </p>
              </div>
            </div>
            
            {/* Live Metrics */}
            {analytics && (
              <StatsGrid style={{ marginTop: '40px' }}>
                <StatCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <StatIcon>{React.createElement(FaUsers as any)}</StatIcon>
                  <StatValue>{formatNumber(analytics.visitor_count)}</StatValue>
                  <StatLabel>Unique Visitors</StatLabel>
                </StatCard>
                <StatCard
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <StatIcon>{React.createElement(FaEye as any)}</StatIcon>
                  <StatValue>{formatNumber(analytics.pageviews)}</StatValue>
                  <StatLabel>Page Views</StatLabel>
                </StatCard>
                <StatCard
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <StatIcon>{React.createElement(FaClock as any)}</StatIcon>
                  <StatValue>{(analytics.avg_time_on_page / 60).toFixed(1)}m</StatValue>
                  <StatLabel>Avg Time on Page</StatLabel>
                </StatCard>
                <StatCard
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <StatIcon>{React.createElement(FaChartPie as any)}</StatIcon>
                  <StatValue>{analytics.bounce_rate.toFixed(1)}%</StatValue>
                  <StatLabel>Bounce Rate</StatLabel>
                </StatCard>
              </StatsGrid>
            )}
          </TrendsSection>
          {/* Call to Action Final */}
          <div style={{
            padding: '80px 20px',
            borderTop: '1px solid rgba(139, 92, 246, 0.1)',
            marginTop: '60px'
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              
              <h2 style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: '700',
                marginBottom: '20px',
                background: theme.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Early Access - Beta System
              </h2>
              
              <p style={{
                fontSize: '1.3rem',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '30px',
                lineHeight: '1.6'
              }}>
                Exclusive Access to Liftlio's Intelligence Engine
              </p>
              
              <div style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: theme.gradient,
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '30px',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
              }}>
                Feature Coming Soon
              </div>
              
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.6)',
                fontStyle: 'italic',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                Real-time YouTube trend analysis powered by AI. Monitor emerging patterns before they explode.
              </p>
              
              <div style={{
                marginTop: '40px',
                padding: '16px 24px',
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                maxWidth: '500px',
                margin: '40px auto 0',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.6)'
              }}>
                {summary?.total_active || 0} trends • {formatNumber(summary?.total_videos || 0)} signals • {formatNumber(summary?.total_channels || 0)} channels
              </div>
              
            </div>
          </div>
        </MainContainer>
      </PageContainer>
    </div>
  );
};

export default LiftlioTrends;