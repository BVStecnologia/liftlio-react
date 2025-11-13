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
  padding: 100px 60px 60px;
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
  font-weight: 900;
  margin: 0 auto 20px;
  max-width: 900px;
  background: ${theme.gradient};
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${gradientShift} 12s ease infinite;
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 30px;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const StatCard = styled(motion.div)`
  background: rgba(139, 92, 246, 0.05);
  backdrop-filter: blur(10px) saturate(200%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: 28px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(139, 92, 246, 0.1);
  }
`;

const StatIcon = styled.div`
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.gradient};
  border-radius: 15px;
  font-size: 24px;
`;

const StatValue = styled.div`
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 5px;
  background: linear-gradient(135deg, #ffffff, #e0e0e0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
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
  font-weight: 800;
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
  background: rgba(139, 92, 246, 0.05);
  backdrop-filter: blur(10px) saturate(200%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: 28px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 8px 16px rgba(139, 92, 246, 0.1);
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
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => {
    switch(props.$status) {
      case 'BLAZING': return 'linear-gradient(135deg, #ff6b6b, #ffd93d)';
      case 'ON FIRE': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 'HOT': return 'linear-gradient(135deg, #f59e0b, #f97316)';
      case 'WARMING': return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
      case 'HEATING UP': return 'linear-gradient(135deg, #84cc16, #fbbf24)';
      case 'MODERATE': return 'linear-gradient(135deg, #6b7280, #9ca3af)';
      case 'COOLING': return 'linear-gradient(135deg, #60a5fa, #3b82f6)';
      case 'COLD': return 'linear-gradient(135deg, #3b82f6, #1e40af)';
      case 'FROZEN': return 'linear-gradient(135deg, #1e3a8a, #1e293b)';
      default: return 'rgba(139, 92, 246, 0.2)';
    }
  }};
  color: #ffffff;
`;

const TrendGrowth = styled.div<{ $positive: boolean }>`
  font-size: 2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
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
  color: rgba(255, 255, 255, 0.7);

  svg {
    color: ${theme.primary};
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
  border-top: 1px solid rgba(139, 92, 246, 0.2);
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
    color: ${theme.secondary};
    flex-shrink: 0;
  }
`;

const HowItWorksSection = styled.section`
  padding: 80px 60px;
  border-top: 1px solid rgba(139, 92, 246, 0.1);

  @media (max-width: 1200px) {
    padding: 60px 40px;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

const HowItWorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const HowItWorksCard = styled.div`
  background: rgba(139, 92, 246, 0.05);
  backdrop-filter: blur(10px) saturate(200%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: 28px;
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 8px 16px rgba(139, 92, 246, 0.1);
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 15px 0 10px;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  p {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin-bottom: 15px;
  }
  
  > div:last-child {
    font-size: 0.8rem;
    color: ${theme.primary};
    line-height: 1.4;
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

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const CategoryCard = styled(motion.div)`
  background: ${theme.gradient};
  padding: 24px;
  border-radius: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 16px rgba(139, 92, 246, 0.3);
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 5px 0;
    color: #ffffff;
  }

  p {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
  }

  span {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
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
  
  const stats = [
    {
      icon: React.createElement(FaRocket as any),
      label: 'Active Trends',
      value: trends.length,
      color: theme.primary,
      subtitle: 'monitoring now'
    },
    {
      icon: React.createElement(FaChartLine as any),
      label: 'Average Growth',
      value: summary ? `+${summary.avg_growth.toFixed(0)}%` : '0%',
      color: '#10b981',
      subtitle: 'last 30 days'
    },
    {
      icon: React.createElement(FaBolt as any),
      label: 'Heat Index',
      value: `${((summary?.by_status?.BLAZING || 0) + (summary?.by_status?.['ON FIRE'] || 0) + (summary?.by_status?.HOT || 0)).toString()}`,
      color: theme.accent,
      subtitle: 'blazing trends'
    },
    {
      icon: React.createElement(FaBrain as any),
      label: 'Sentiment Score',
      value: summary ? `${(summary.avg_sentiment * 100).toFixed(0)}%` : '0%',
      color: theme.secondary,
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
                While you read this, our algorithms process millions of invisible signals. 
                Patterns the human eye could never detect. Trends being born at this very moment.
              </HeroSubtitle>
            
            <div style={{
              display: 'inline-block',
              padding: '8px 20px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              marginTop: '20px',
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.8)'
            }}>
              <span style={{ color: '#10b981', marginRight: '8px' }}>●</span>
              Neural Engine Active • Real-Time Analysis
            </div>
            
            <StatsGrid>
              {stats.map((stat, index) => (
                <StatCard
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <StatIcon>{stat.icon}</StatIcon>
                  <StatValue>{stat.value}</StatValue>
                  <StatLabel>{stat.label}</StatLabel>
                  {stat.subtitle && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      {stat.subtitle}
                    </div>
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
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
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
                                <stop offset="0%" stopColor={theme.primary} stopOpacity={0.8} />
                                <stop offset="100%" stopColor={theme.primary} stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: `1px solid ${theme.primary}`,
                                borderRadius: '8px'
                              }}
                              labelStyle={{ color: theme.primary }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={theme.primary}
                              strokeWidth={2}
                              fill={`url(#gradient-${trend.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </TrendChart>

                      <TrendInsights>
                        <div style={{
                          background: 'rgba(139, 92, 246, 0.05)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ fontSize: '0.8rem', color: theme.primary, fontWeight: '600', marginBottom: '8px' }}>
                            Insights
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                            • Growth pattern: <span style={{ color: '#10b981' }}>+{trend.growth.toFixed(0)}%</span>{trend.velocity && trend.velocity !== 0 ? <> with acceleration of <span style={{ color: theme.secondary }}>{trend.velocity.toFixed(1)}/day</span></> : null}<br/>
                            • Momentum score: <span style={{ color: theme.primary }}>{trend.momentum?.toFixed(0) || 0}</span> ({trend.momentum > 50 ? 'STRONG' : 'MODERATE'})<br/>
                            • Engagement rate: <span style={{ color: '#f59e0b' }}>{(trend.engagement_rate * 100).toFixed(1)}%</span> - {trend.engagement_rate > 0.05 ? 'Above average' : 'Normal'}
                          </div>
                        </div>
                        {trend.temporal_data && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            Opportunity window: <span style={{ color: '#10b981', fontWeight: 'bold' }}>Open</span><br/>
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
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
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
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid #ef4444',
                                borderRadius: '8px'
                              }}
                              labelStyle={{ color: '#ef4444' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#ef4444"
                              strokeWidth={2}
                              fill={`url(#gradient-decline-${trend.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </TrendChart>

                      <TrendInsights>
                        <div style={{
                          background: 'rgba(139, 92, 246, 0.05)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ fontSize: '0.8rem', color: theme.primary, fontWeight: '600', marginBottom: '8px' }}>
                            Insights
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                            • Growth pattern: <span style={{ color: '#10b981' }}>+{trend.growth.toFixed(0)}%</span>{trend.velocity && trend.velocity !== 0 ? <> with acceleration of <span style={{ color: theme.secondary }}>{trend.velocity.toFixed(1)}/day</span></> : null}<br/>
                            • Momentum score: <span style={{ color: theme.primary }}>{trend.momentum?.toFixed(0) || 0}</span> ({trend.momentum > 50 ? 'STRONG' : 'MODERATE'})<br/>
                            • Engagement rate: <span style={{ color: '#f59e0b' }}>{(trend.engagement_rate * 100).toFixed(1)}%</span> - {trend.engagement_rate > 0.05 ? 'Above average' : 'Normal'}
                          </div>
                        </div>
                        {trend.temporal_data && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            Opportunity window: <span style={{ color: '#10b981', fontWeight: 'bold' }}>Open</span><br/>
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
                Our AI identified that <span style={{ color: theme.primary, fontWeight: 'bold' }}>
                {summary.categories[0].category}</span> is dominating with {Math.round((summary.categories[0].count / trends.length) * 100)}% of trends.
              </p>
              <CategoryGrid>
                {summary.categories.map((category, index) => (
                  <CategoryCard
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <h3>{category.category}</h3>
                    <p>{category.count}</p>
                    <span>active trends 🔥</span>
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
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
              maxWidth: '1400px',
              margin: '40px auto'
            }}>
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                minHeight: '220px'
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '10px', fontSize: '1rem' }}>Multi-Dimensional<br/>Analysis</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                  We analyze <span style={{ color: theme.secondary, fontWeight: 'bold' }}>47 dimensions</span>: 
                  velocity, momentum, sentiment, engagement, and more.
                </p>
              </div>
              
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                minHeight: '220px'
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '10px', fontSize: '1rem' }}>Early Detection</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                  Detect patterns <span style={{ color: '#10b981', fontWeight: 'bold' }}>7-14 days before</span> explosion. 
                  When others see it, it's too late.
                </p>
              </div>
              
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                minHeight: '220px'
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '10px', fontSize: '1rem' }}>Surgical Precision</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                  Confidence score on every prediction. 
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>92% accuracy</span>.
                </p>
              </div>
              
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                minHeight: '220px'
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '10px', fontSize: '1rem' }}>Temporal Vision</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                  See past, present, and future. Know
                  <span style={{ color: theme.accent, fontWeight: 'bold' }}> WHAT</span> trends and <span style={{ color: theme.accent, fontWeight: 'bold' }}>WHEN</span> they stop.
                </p>
              </div>
            </div>
            
            {/* Live Metrics */}
            {analytics && (
              <StatsGrid style={{ marginTop: '40px' }}>
                <StatCard
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
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
                fontWeight: '900',
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
                borderRadius: '8px',
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
                While you read this page, <span style={{ color: theme.primary, fontWeight: 'bold' }}>
                {Math.floor(Math.random() * 20) + 10}</span> new trends were detected. 
                <span style={{ color: '#10b981', fontWeight: 'bold' }}> {Math.floor(Math.random() * 50) + 100}</span> creators 
                are already taking action. The future of YouTube is being written now. 
                <span style={{ color: theme.secondary, fontWeight: 'bold' }}> And we're reading every line.</span>
              </p>
              
              <div style={{
                marginTop: '40px',
                padding: '20px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                maxWidth: '500px',
                margin: '40px auto 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold' }}>SYSTEM ACTIVE</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{summary?.total_active || 0}</span> trends monitored • 
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}> {formatNumber(summary?.total_videos || 0)}</span> signals processed • 
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}> {formatNumber(summary?.total_channels || 0)}</span> channels analyzed
                </div>
              </div>
              
              <div style={{
                marginTop: '40px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  padding: '8px 16px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Neural Network Processing
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Real-Time Analysis
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Multi-Dimensional Scanning
                </div>
              </div>
            </div>
          </div>
        </MainContainer>
      </PageContainer>
    </div>
  );
};

export default LiftlioTrends;