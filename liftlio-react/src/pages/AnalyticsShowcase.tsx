import React, { useState, useEffect, useRef } from 'react';
import styled, { createGlobalStyle, keyframes, ThemeProvider } from 'styled-components';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import GlobeDemo from '../components/GlobeDemo';
import { FaGlobe, FaRoute, FaShoppingCart, FaCreditCard, FaCheckCircle, 
         FaChartLine, FaFunnelDollar, FaExchangeAlt, FaChartBar } from 'react-icons/fa';

// Tema Dark
const darkTheme = {
  name: 'dark',
  colors: {
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    background: '#0f0f0f',
    text: {
      primary: '#ffffff',
      secondary: '#9ca3af'
    },
    border: '#2a2a2a'
  }
};

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background: #0a0a0a;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow-x: hidden;
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a0f2e 100%);
  color: white;
`;

const Hero = styled.section`
  padding: 80px 20px;
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.5);
  padding: 8px 20px;
  border-radius: 100px;
  font-size: 14px;
  color: #a78bfa;
  margin-bottom: 30px;
  animation: ${float} 3s ease-in-out infinite;
`;

const LiveDot = styled.div`
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: ${pulse} 2s infinite;
`;

const MainTitle = styled.h1`
  font-size: 56px;
  font-weight: 800;
  margin: 0 0 24px 0;
  background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 20px;
  color: #9ca3af;
  max-width: 700px;
  margin: 0 auto 48px;
  line-height: 1.6;
`;

const CTAButton = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 50px rgba(139, 92, 246, 0.4);
  }
`;

const DemoSection = styled.section`
  padding: 60px 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 60px;
  color: white;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
`;

const StatCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 92, 246, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
    animation: ${float} 3s ease-in-out infinite;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(139, 92, 246, 0.4);
    transform: translateY(-4px);
  }
`;

const StatValue = styled.div`
  font-size: 42px;
  font-weight: 700;
  color: #8b5cf6;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const GlobeSection = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 24px;
  padding: 40px;
  margin-bottom: 60px;
  position: relative;
  overflow: hidden;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: ${props => props.active ? '#8b5cf6' : '#9ca3af'};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #8b5cf6;
    transform: scaleX(${props => props.active ? 1 : 0});
    transition: transform 0.3s ease;
  }
  
  &:hover {
    color: #8b5cf6;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  padding: 30px;
  backdrop-filter: blur(10px);
`;

const ChartTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const JourneyContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40px 20px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 10%;
    right: 10%;
    height: 2px;
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    z-index: 0;
  }
`;

const JourneyStep = styled.div<{ active?: boolean }>`
  background: ${props => props.active ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.active ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)'};
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
  }
`;

const JourneyIcon = styled.div`
  font-size: 24px;
  margin-bottom: 4px;
`;

const JourneyLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ConversionFunnel = styled.div`
  padding: 30px;
`;

const FunnelStep = styled.div<{ width: number }>`
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
  margin: 10px auto;
  padding: 20px;
  border-radius: 8px;
  width: ${props => props.width}%;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(10px);
    box-shadow: 0 5px 20px rgba(139, 92, 246, 0.3);
  }
`;

const FunnelLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-weight: 600;
`;

export default function AnalyticsShowcase() {
  const [activeTab, setActiveTab] = useState('overview');
  const [liveVisitors, setLiveVisitors] = useState(1247);
  const [pageViews, setPageViews] = useState(45231);
  const [avgDuration, setAvgDuration] = useState(222);
  const [conversionRate, setConversionRate] = useState(4.8);

  // Simular dados em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVisitors(prev => Math.max(100, prev + Math.floor(Math.random() * 10 - 3)));
      setPageViews(prev => prev + Math.floor(Math.random() * 15));
      setAvgDuration(prev => Math.max(60, prev + Math.floor(Math.random() * 5 - 2)));
      setConversionRate(prev => Math.max(1, Math.min(10, prev + (Math.random() * 0.2 - 0.1))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Dados para gráficos - Mostrando Liftlio como melhor fonte
  const trafficSourceData = [
    { time: '00:00', liftlio: 420, paid: 180, social: 120, direct: 280 },
    { time: '04:00', liftlio: 380, paid: 150, social: 90, direct: 180 },
    { time: '08:00', liftlio: 680, paid: 320, social: 280, direct: 420 },
    { time: '12:00', liftlio: 1120, paid: 480, social: 420, direct: 580 },
    { time: '16:00', liftlio: 1450, paid: 520, social: 480, direct: 650 },
    { time: '20:00', liftlio: 1280, paid: 420, social: 380, direct: 520 },
    { time: '23:00', liftlio: 820, paid: 280, social: 220, direct: 380 }
  ];

  const conversionBySource = [
    { source: 'Liftlio', rate: 8.2, visitors: 5450, conversions: 447 },
    { source: 'Paid Ads', rate: 2.1, visitors: 2350, conversions: 49 },
    { source: 'Social', rate: 1.8, visitors: 1890, conversions: 34 },
    { source: 'Direct', rate: 3.5, visitors: 2680, conversions: 94 }
  ];

  const funnelData = [
    { stage: 'Visitors', count: 12370, percentage: 100 },
    { stage: 'Engaged (Liftlio: 85%)', count: 8450, percentage: 68.3 },
    { stage: 'Intent (Liftlio: 72%)', count: 4820, percentage: 39 },
    { stage: 'Converted (Liftlio: 68%)', count: 624, percentage: 5.04 }
  ];

  const journeySteps = [
    { icon: '🏠', label: 'Visit', count: 12370 },
    { icon: '🔍', label: 'Explore', count: 8920 },
    { icon: '🛒', label: 'Add Cart', count: 3450 },
    { icon: '💳', label: 'Checkout', count: 1280 },
    { icon: '✅', label: 'Purchase', count: 624 }
  ];

  return (
    <ThemeProvider theme={darkTheme}>
      <GlobalStyle />
      <PageContainer>
        <Hero>
          <Badge>
            <LiveDot />
            Built-in Analytics for Every Plan
          </Badge>
          
          <MainTitle>
            See How Liftlio Drives 4X More Conversions
          </MainTitle>
          
          <Subtitle>
            Our AI-powered organic traffic doesn't just bring visitors - it brings buyers. 
            Watch how Liftlio outperforms traditional marketing channels.
          </Subtitle>
          
          <CTAButton
            href="https://liftlio.com/signup"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Free Trial
            <span>→</span>
          </CTAButton>
        </Hero>

        <DemoSection>
          <SectionTitle>Real-Time Performance Metrics</SectionTitle>
          
          <StatsGrid>
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <StatValue>{liveVisitors.toLocaleString()}</StatValue>
              <StatLabel>Live Visitors</StatLabel>
            </StatCard>
            
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <StatValue>{pageViews.toLocaleString()}</StatValue>
              <StatLabel>Page Views Today</StatLabel>
            </StatCard>
            
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <StatValue>{Math.floor(avgDuration / 60)}m {avgDuration % 60}s</StatValue>
              <StatLabel>Avg. Duration</StatLabel>
            </StatCard>
            
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <StatValue>{conversionRate.toFixed(1)}%</StatValue>
              <StatLabel>Conversion Rate</StatLabel>
            </StatCard>
          </StatsGrid>

          {/* Globe Section com Tabs */}
          <GlobeSection>
            <TabsContainer>
              <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                <FaGlobe style={{ marginRight: '8px' }} />
                Live Traffic
              </Tab>
              <Tab active={activeTab === 'journey'} onClick={() => setActiveTab('journey')}>
                <FaRoute style={{ marginRight: '8px' }} />
                User Journey
              </Tab>
              <Tab active={activeTab === 'conversions'} onClick={() => setActiveTab('conversions')}>
                <FaFunnelDollar style={{ marginRight: '8px' }} />
                Conversion Funnel
              </Tab>
            </TabsContainer>

            {activeTab === 'overview' && (
              <div>
                <div style={{ 
                  position: 'absolute', 
                  top: '80px', 
                  left: '20px', 
                  zIndex: 10,
                  background: 'rgba(0,0,0,0.7)',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Active Now</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LiveDot />
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '18px' }}>
                      {liveVisitors} visitors from 47 countries
                    </span>
                  </div>
                </div>
                <GlobeDemo />
              </div>
            )}

            {activeTab === 'journey' && (
              <JourneyContainer>
                {journeySteps.map((step, index) => (
                  <JourneyStep key={index} active={index <= 2}>
                    <JourneyIcon>{step.icon}</JourneyIcon>
                    <JourneyLabel>{step.label}</JourneyLabel>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#10b981' }}>
                      {step.count.toLocaleString()}
                    </div>
                  </JourneyStep>
                ))}
              </JourneyContainer>
            )}

            {activeTab === 'conversions' && (
              <ConversionFunnel>
                {funnelData.map((step, index) => (
                  <FunnelStep key={index} width={100 - (index * 20)}>
                    <FunnelLabel>
                      <span>{step.stage}</span>
                      <span>{step.count.toLocaleString()} ({step.percentage}%)</span>
                    </FunnelLabel>
                  </FunnelStep>
                ))}
                <div style={{ 
                  marginTop: '30px', 
                  padding: '20px', 
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>
                    🚀 Liftlio drives 68% of all conversions
                  </div>
                  <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                    While representing only 44% of traffic
                  </div>
                </div>
              </ConversionFunnel>
            )}
          </GlobeSection>

          {/* Traffic Sources Comparison */}
          <ChartsGrid>
            <ChartCard>
              <ChartTitle>
                <FaChartLine />
                Traffic Sources Performance
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trafficSourceData}>
                  <defs>
                    <linearGradient id="liftlioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="liftlio" 
                    stackId="1"
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#liftlioGradient)"
                    strokeWidth={2}
                    name="Liftlio Organic"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="paid" 
                    stackId="1"
                    stroke="#fb923c" 
                    fillOpacity={1} 
                    fill="url(#paidGradient)"
                    name="Paid Ads"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="social" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fillOpacity={0.3} 
                    fill="#3b82f6"
                    name="Social"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="direct" 
                    stackId="1"
                    stroke="#6b7280" 
                    fillOpacity={0.2} 
                    fill="#6b7280"
                    name="Direct"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <strong style={{ color: '#8b5cf6' }}>Liftlio Organic</strong> consistently outperforms 
                all other channels combined, delivering high-intent traffic that converts.
              </div>
            </ChartCard>

            <ChartCard>
              <ChartTitle>
                <FaExchangeAlt />
                Conversion Rate by Source
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionBySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="source" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'rate') return `${value}%`;
                      return value;
                    }}
                  />
                  <Bar dataKey="rate" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                    {conversionBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.source === 'Liftlio' ? '#8b5cf6' : '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ 
                marginTop: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '12px'
              }}>
                {conversionBySource.map((source, index) => (
                  <div key={index} style={{ 
                    padding: '10px',
                    background: source.source === 'Liftlio' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ color: source.source === 'Liftlio' ? '#8b5cf6' : '#9ca3af', fontWeight: 600 }}>
                      {source.source}
                    </div>
                    <div style={{ color: '#fff', fontSize: '14px', marginTop: '4px' }}>
                      {source.conversions} conversions
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </ChartsGrid>

          {/* Why Liftlio Converts Better */}
          <div style={{ 
            marginTop: '60px',
            padding: '40px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
            borderRadius: '24px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '32px', marginBottom: '20px', color: '#fff' }}>
              Why Liftlio Traffic Converts 4X Better
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '30px',
              marginTop: '40px'
            }}>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎯</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#8b5cf6' }}>High Intent</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  Users searching for solutions, not randomly browsing
                </div>
              </div>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🤝</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#8b5cf6' }}>Trust Signals</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  Organic recommendations from trusted sources
                </div>
              </div>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📈</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#8b5cf6' }}>Compound Growth</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  Content stays forever, traffic grows over time
                </div>
              </div>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>💰</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#8b5cf6' }}>Zero Ad Spend</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  No cost per click, pure profit margins
                </div>
              </div>
            </div>
          </div>
        </DemoSection>

        <footer style={{ 
          padding: '60px 20px',
          textAlign: 'center',
          borderTop: '1px solid rgba(139, 92, 246, 0.1)'
        }}>
          <CTAButton
            href="https://liftlio.com/signup"
            as={motion.a}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Free Trial Now
            <span>→</span>
          </CTAButton>
          <p style={{ marginTop: '24px', color: '#6b7280', fontSize: '14px' }}>
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </footer>
      </PageContainer>
    </ThemeProvider>
  );
}