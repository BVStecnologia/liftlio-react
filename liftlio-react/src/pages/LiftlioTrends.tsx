import React from 'react';
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

// Footer Components
const Footer = styled.footer`
  background: #0a0a0a;
  border-top: 1px solid #27272a;
  padding: 60px 0 40px;
  margin-top: 80px;
`;

const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

const FooterContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
`;

const FooterBrand = styled.div`
  max-width: 300px;
`;

const FooterLogo = styled.div`
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -1px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FooterDescription = styled.p`
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin-bottom: 24px;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 16px;
`;

const SocialLink = styled.a`
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s;
  
  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: ${theme.primary};
    color: ${theme.primary};
    transform: translateY(-2px);
  }
`;

const FooterColumn = styled.div``;

const FooterTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
`;

const FooterLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FooterLink = styled.a`
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.3s;
  font-size: 14px;
  
  &:hover {
    color: ${theme.primary};
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  padding-top: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
`;

const Copyright = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
`;

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

const glow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3),
                0 0 40px rgba(139, 92, 246, 0.2);
  }
  50% { 
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.5),
                0 0 60px rgba(139, 92, 246, 0.3);
  }
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

const HeroSection = styled.section`
  padding: 100px 60px 60px;
  text-align: center;
  position: relative;
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, transparent 100%);
  width: 100%;

  @media (max-width: 1200px) {
    padding: 100px 40px 60px;
  }

  @media (max-width: 768px) {
    padding: 80px 20px 40px;
  }
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
`;

const HeroSubtitle = styled(motion.p)`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: rgba(255, 255, 255, 0.7);
  max-width: 700px;
  margin: 0 auto 40px;
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
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  position: relative;
  overflow: hidden;
  animation: ${glow} 3s ease infinite;

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: ${theme.gradient};
    border-radius: 20px;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: -1;
  }

  &:hover::before {
    opacity: 0.3;
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
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: 25px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 10px 40px rgba(139, 92, 246, 0.2);
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
      case 'EXPLODING': return 'linear-gradient(135deg, #f97316, #ef4444)';
      case 'ON FIRE': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 'HOT': return 'linear-gradient(135deg, #f59e0b, #f97316)';
      case 'TRENDING': return theme.gradient;
      case 'RISING': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'STABLE': return 'linear-gradient(135deg, #6b7280, #9ca3af)';
      case 'DECLINING': return 'linear-gradient(135deg, #ef4444, #f97316)';
      case 'COLLAPSING': return 'linear-gradient(135deg, #dc2626, #991b1b)';
      case 'DYING': return 'linear-gradient(135deg, #7c2d12, #991b1b)';
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
  background: rgba(139, 92, 246, 0.02);
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  
  @media (max-width: 1200px) {
    padding: 60px 40px;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

const HowItWorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
`;

const HowItWorksCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
  }

  h3 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 15px 0 10px;
    color: #ffffff;
  }

  p {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
  }
`;

const HowItWorksIcon = styled.div`
  width: 70px;
  height: 70px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.gradient};
  border-radius: 20px;
  font-size: 30px;
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
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
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

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
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
          <h2 style={{ color: theme.primary }}>Loading Trends Data...</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Analyzing millions of YouTube videos</p>
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
      color: theme.primary
    },
    {
      icon: React.createElement(FaArrowUp as any),
      label: 'Rising Topics',
      value: risingTrends.length,
      color: '#10b981'
    },
    {
      icon: React.createElement(FaArrowDown as any),
      label: 'Declining Topics',
      value: decliningTrends.length,
      color: '#ef4444'
    },
    {
      icon: React.createElement(FaVideo as any),
      label: 'Total Videos',
      value: formatNumber(trends.reduce((sum, t) => sum + (t.video_count || 0), 0)),
      color: theme.accent
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
      
      {/* Header */}
      <Header>
        <HeaderContainer>
          <Logo href="/">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <LogoText>LIFTLIO</LogoText>
            <TrendsText>Trends</TrendsText>
            <BetaBadge>Beta</BetaBadge>
          </Logo>
          
          <Nav>
            <NavButtons>
              <SignInButton href="/login">Sign In</SignInButton>
            </NavButtons>
          </Nav>
        </HeaderContainer>
      </Header>

      <PageContainer>
        <MainContainer>
          {/* Hero Section */}
          <HeroSection>
            <HeroTitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Real-Time YouTube Trends Observatory
            </HeroTitle>
            <HeroSubtitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Discover what's exploding on YouTube right now with AI-powered sentiment analysis
            </HeroSubtitle>
            
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
                </StatCard>
              ))}
            </StatsGrid>
          </HeroSection>

          {/* How It Works */}
          <HowItWorksSection>
            <SectionTitle>How We Discover Trends</SectionTitle>
            <HowItWorksGrid>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaYoutube as any)}</HowItWorksIcon>
                <h3>Real-Time YouTube Analysis</h3>
                <p>Our AI analyzes millions of YouTube videos in real-time, tracking views, engagement, and growth patterns across channels.</p>
              </HowItWorksCard>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaChartLine as any)}</HowItWorksIcon>
                <h3>Growth Detection Algorithm</h3>
                <p>Advanced algorithms identify explosive growth patterns, comparing current momentum against historical baselines to spot breakout trends.</p>
              </HowItWorksCard>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaBrain as any)}</HowItWorksIcon>
                <h3>AI Sentiment Analysis</h3>
                <p>Natural language processing evaluates comments and descriptions to determine sentiment, separating genuine trends from temporary hype.</p>
              </HowItWorksCard>
              <HowItWorksCard>
                <HowItWorksIcon>{React.createElement(FaBolt as any)}</HowItWorksIcon>
                <h3>Velocity & Momentum Tracking</h3>
                <p>We calculate acceleration rates to predict which trends will explode next, giving you insights before they go mainstream.</p>
              </HowItWorksCard>
            </HowItWorksGrid>
          </HowItWorksSection>

          {/* Rising Trends */}
          {risingTrends.length > 0 && (
            <TrendsSection>
              <SectionTitle>
                {React.createElement(FaFire as any, { style: { verticalAlign: 'middle', marginRight: '10px' } })}
                Exploding & Rising Topics
              </SectionTitle>
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

                      <TrendGrowth $positive={trend.growth > 0}>
                        {trend.growth > 0 ? '+' : ''}{trend.growth.toFixed(1)}%
                        {trend.growth > 0 ? 
                          React.createElement(FaArrowUp as any) : 
                          React.createElement(FaArrowDown as any)
                        }
                      </TrendGrowth>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                        Growth
                      </div>

                      <TrendStats>
                        <TrendStat>
                          {React.createElement(FaVideo as any)}
                          {trend.video_count} Videos
                        </TrendStat>
                        <TrendStat>
                          {getSentimentIcon(trend.sentiment_score)}
                          {(trend.sentiment_score * 100).toFixed(0)}%
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
                        {trend.sentiment_label && (
                          <TrendInsight>
                            {React.createElement(FaBrain as any)}
                            {trend.sentiment_label}
                          </TrendInsight>
                        )}
                        {trend.insights && trend.insights.slice(0, 2).map((insight, i) => (
                          <TrendInsight key={i}>
                            {React.createElement(HiLightningBolt as any)}
                            {insight}
                          </TrendInsight>
                        ))}
                      </TrendInsights>
                    </TrendCard>
                  );
                })}
              </TrendsGrid>
            </TrendsSection>
          )}

          {/* Declining Trends */}
          {decliningTrends.length > 0 && (
            <TrendsSection style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(139, 92, 246, 0.05))' }}>
              <SectionTitle>
                {React.createElement(FaArrowDown as any, { style: { verticalAlign: 'middle', marginRight: '10px' } })}
                Declining & Fading Topics
              </SectionTitle>
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
                        <TrendStat>
                          {React.createElement(FaVideo as any)}
                          {trend.video_count} Videos
                        </TrendStat>
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
                        {trend.sentiment_label && (
                          <TrendInsight>
                            {React.createElement(FaBrain as any)}
                            {trend.sentiment_label}
                          </TrendInsight>
                        )}
                        {trend.insights && trend.insights.slice(0, 2).map((insight, i) => (
                          <TrendInsight key={i}>
                            {React.createElement(HiLightningBolt as any)}
                            {insight}
                          </TrendInsight>
                        ))}
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
              <SectionTitle>Trending Categories</SectionTitle>
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
                    <span>trends</span>
                  </CategoryCard>
                ))}
              </CategoryGrid>
            </CategorySection>
          )}

          {/* Analytics */}
          {analytics && (
            <TrendsSection>
              <SectionTitle>Platform Analytics</SectionTitle>
              <StatsGrid>
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
            </TrendsSection>
          )}
        </MainContainer>

        {/* Footer */}
        <Footer>
          <FooterContainer>
            <FooterContent>
              <FooterBrand>
                <FooterLogo>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <LogoText>LIFTLIO</LogoText>
                  <BetaBadge>Beta</BetaBadge>
                </FooterLogo>
                <FooterDescription>
                  Real-time YouTube trends analysis powered by AI. Discover what's exploding before it goes mainstream.
                </FooterDescription>
                <SocialLinks>
                  <SocialLink href="#" aria-label="Twitter">
                    𝕏
                  </SocialLink>
                  <SocialLink href="#" aria-label="LinkedIn">
                    in
                  </SocialLink>
                  <SocialLink href="#" aria-label="GitHub">
                    <span style={{ fontWeight: 'bold' }}>GH</span>
                  </SocialLink>
                  <SocialLink href="#" aria-label="Email">
                    ✉️
                  </SocialLink>
                </SocialLinks>
              </FooterBrand>
              
              <FooterColumn>
                <FooterTitle>Product</FooterTitle>
                <FooterLinks>
                  <FooterLink href="/features">Features</FooterLink>
                  <FooterLink href="/pricing">Pricing</FooterLink>
                  <FooterLink href="/api">API Documentation</FooterLink>
                </FooterLinks>
              </FooterColumn>
              
              <FooterColumn>
                <FooterTitle>Company</FooterTitle>
                <FooterLinks>
                  <FooterLink href="/about">About</FooterLink>
                  <FooterLink href="/blog">Blog</FooterLink>
                  <FooterLink href="/careers">Careers</FooterLink>
                </FooterLinks>
              </FooterColumn>
              
              <FooterColumn>
                <FooterTitle>Legal</FooterTitle>
                <FooterLinks>
                  <FooterLink href="/privacy">Privacy Policy</FooterLink>
                  <FooterLink href="/terms">Terms of Service</FooterLink>
                  <FooterLink href="/security">Security</FooterLink>
                </FooterLinks>
              </FooterColumn>
            </FooterContent>
            
            <FooterBottom>
              <Copyright>
                © 2025 Liftlio. All rights reserved.
              </Copyright>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                Made with ❤️ for content creators
              </div>
            </FooterBottom>
          </FooterContainer>
        </Footer>
      </PageContainer>
    </div>
  );
};

export default LiftlioTrends;