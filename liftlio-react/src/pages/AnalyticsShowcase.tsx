import React, { useState, useEffect, useRef } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import GlobeVisualizationPro from '../components/GlobeVisualizationPro';

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

const GlobeWrapper = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 24px;
  padding: 40px;
  margin-bottom: 60px;
  min-height: 600px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
    animation: ${pulse} 10s ease-in-out infinite;
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
`;

const FeatureList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin: 80px 0;
`;

const FeatureItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const FeatureIcon = styled.div`
  width: 48px;
  height: 48px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
`;

const FeatureContent = styled.div``;

const FeatureTitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: white;
`;

const FeatureDescription = styled.p`
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
`;

const Footer = styled.footer`
  padding: 60px 20px;
  text-align: center;
  border-top: 1px solid rgba(139, 92, 246, 0.1);
`;

// Dados demo para o Globe
const DEMO_LOCATIONS = [
  { lat: -23.5505, lng: -46.6333, label: 'São Paulo', country: 'BR', visitors: 342 },
  { lat: 40.7128, lng: -74.0060, label: 'New York', country: 'US', visitors: 521 },
  { lat: 51.5074, lng: -0.1278, label: 'London', country: 'UK', visitors: 287 },
  { lat: 35.6762, lng: 139.6503, label: 'Tokyo', country: 'JP', visitors: 198 },
  { lat: 48.8566, lng: 2.3522, label: 'Paris', country: 'FR', visitors: 165 },
  { lat: -33.8688, lng: 151.2093, label: 'Sydney', country: 'AU', visitors: 124 },
  { lat: 52.5200, lng: 13.4050, label: 'Berlin', country: 'DE', visitors: 143 },
  { lat: 43.6532, lng: -79.3832, label: 'Toronto', country: 'CA', visitors: 167 },
  { lat: 19.4326, lng: -99.1332, label: 'Mexico City', country: 'MX', visitors: 234 },
  { lat: 28.6139, lng: 77.2090, label: 'New Delhi', country: 'IN', visitors: 412 }
];

export default function AnalyticsShowcase() {
  const [liveVisitors, setLiveVisitors] = useState(1247);
  const [pageViews, setPageViews] = useState(45231);
  const [avgDuration, setAvgDuration] = useState(222); // seconds
  const [conversionRate, setConversionRate] = useState(4.8);
  const [currentLocations, setCurrentLocations] = useState(DEMO_LOCATIONS);
  const globeRef = useRef<any>(null);

  // Simular dados em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      // Atualizar métricas
      setLiveVisitors(prev => Math.max(100, prev + Math.floor(Math.random() * 10 - 3)));
      setPageViews(prev => prev + Math.floor(Math.random() * 15));
      setAvgDuration(prev => Math.max(60, prev + Math.floor(Math.random() * 5 - 2)));
      setConversionRate(prev => Math.max(1, Math.min(10, prev + (Math.random() * 0.2 - 0.1))));
      
      // Adicionar novo ponto no globe aleatoriamente
      if (Math.random() > 0.7) {
        const randomLocation = DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)];
        setCurrentLocations(prev => {
          const newLocation = {
            ...randomLocation,
            lat: randomLocation.lat + (Math.random() - 0.5) * 5,
            lng: randomLocation.lng + (Math.random() - 0.5) * 5,
            visitors: Math.floor(Math.random() * 50 + 10)
          };
          return [...prev.slice(-20), newLocation];
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Formatar duração
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Dados demo para gráficos com variação
  const [trafficData] = useState([
    { time: '00:00', visitors: 420, pageviews: 1250, events: 2100 },
    { time: '04:00', visitors: 280, pageviews: 820, events: 1400 },
    { time: '08:00', visitors: 620, pageviews: 1850, events: 3200 },
    { time: '12:00', visitors: 890, pageviews: 2680, events: 4500 },
    { time: '16:00', visitors: 1100, pageviews: 3200, events: 5400 },
    { time: '20:00', visitors: 980, pageviews: 2900, events: 4800 },
    { time: '23:00', visitors: 680, pageviews: 1980, events: 3200 }
  ]);

  const sourceData = [
    { name: 'Organic Search', value: 45, color: '#8b5cf6' },
    { name: 'Direct Traffic', value: 28, color: '#a78bfa' },
    { name: 'Social Media', value: 18, color: '#c4b5fd' },
    { name: 'Referral', value: 9, color: '#ddd6fe' }
  ];

  const deviceData = [
    { name: 'Desktop', value: 52, color: '#8b5cf6' },
    { name: 'Mobile', value: 38, color: '#a78bfa' },
    { name: 'Tablet', value: 10, color: '#c4b5fd' }
  ];

  const countryData = [
    { country: 'United States', visitors: 3421, flag: '🇺🇸' },
    { country: 'Brazil', visitors: 2854, flag: '🇧🇷' },
    { country: 'United Kingdom', visitors: 1923, flag: '🇬🇧' },
    { country: 'Germany', visitors: 1654, flag: '🇩🇪' },
    { country: 'Japan', visitors: 1432, flag: '🇯🇵' }
  ];

  const topPages = [
    { page: '/home', views: 15420, avgTime: '2:34' },
    { page: '/pricing', views: 8930, avgTime: '3:45' },
    { page: '/features', views: 7650, avgTime: '4:12' },
    { page: '/blog', views: 6820, avgTime: '5:23' },
    { page: '/contact', views: 4410, avgTime: '1:45' }
  ];

  return (
    <>
      <GlobalStyle />
      <PageContainer>
        <Hero>
          <Badge>
            <LiveDot />
            Built-in Analytics for Every Plan
          </Badge>
          
          <MainTitle>
            Real-Time Analytics That Actually Matter
          </MainTitle>
          
          <Subtitle>
            Track visitors, conversions, and engagement without cookies or compromising privacy. 
            Powerful analytics included in every Liftlio plan - no extra cost.
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
          <SectionTitle>See Your Data Come to Life</SectionTitle>
          
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
              <StatValue>{formatDuration(avgDuration)}</StatValue>
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

          <GlobeWrapper>
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              left: '20px', 
              zIndex: 10,
              background: 'rgba(0,0,0,0.7)',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LiveDot />
                <span style={{ color: '#fff', fontWeight: 600 }}>{currentLocations.length} Active Locations</span>
              </div>
            </div>
            <GlobeVisualizationPro 
              ref={globeRef}
              isDemo={true}
            />
          </GlobeWrapper>

          <ChartsGrid>
            <ChartCard>
              <ChartTitle>📈 Today's Traffic Flow</ChartTitle>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
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
                    dataKey="pageviews" 
                    stroke="#a78bfa" 
                    fillOpacity={1} 
                    fill="url(#colorPageviews)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorVisitors)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>🌐 Traffic Sources</ChartTitle>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${value}%`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>📱 Device Distribution</ChartTitle>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>🌍 Top Countries</ChartTitle>
              <div style={{ padding: '10px 0' }}>
                {countryData.map((country, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: index < countryData.length - 1 ? '1px solid rgba(139, 92, 246, 0.1)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{country.flag}</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{country.country}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{
                        width: '100px',
                        height: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(country.visitors / countryData[0].visitors) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ 
                        color: '#8b5cf6', 
                        fontWeight: 600,
                        minWidth: '50px',
                        textAlign: 'right'
                      }}>
                        {country.visitors.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </ChartsGrid>

          {/* Top Pages Section */}
          <div style={{ marginBottom: '60px' }}>
            <SectionTitle>Most Visited Pages</SectionTitle>
            <ChartCard style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(139, 92, 246, 0.3)' }}>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '12px', 
                        color: '#9ca3af',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}>
                        Page
                      </th>
                      <th style={{ 
                        textAlign: 'center', 
                        padding: '12px', 
                        color: '#9ca3af',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}>
                        Views
                      </th>
                      <th style={{ 
                        textAlign: 'center', 
                        padding: '12px', 
                        color: '#9ca3af',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}>
                        Avg. Time
                      </th>
                      <th style={{ 
                        textAlign: 'right', 
                        padding: '12px', 
                        color: '#9ca3af',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}>
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map((page, index) => (
                      <tr key={index} style={{ 
                        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px 12px', color: '#fff' }}>
                          <span style={{ fontSize: '15px', fontWeight: 500 }}>{page.page}</span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                          <span style={{ 
                            color: '#8b5cf6', 
                            fontWeight: 600,
                            fontSize: '16px'
                          }}>
                            {page.views.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center', color: '#9ca3af' }}>
                          {page.avgTime}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                          <span style={{ 
                            color: '#10b981',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px'
                          }}>
                            ↑ {Math.floor(Math.random() * 30 + 5)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          <FeatureList>
            <FeatureItem
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <FeatureIcon>🔒</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Privacy-First Approach</FeatureTitle>
                <FeatureDescription>
                  No cookies, no personal data. GDPR, CCPA, and PECR compliant by default.
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FeatureIcon>⚡</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Real-Time Updates</FeatureTitle>
                <FeatureDescription>
                  See visitor activity as it happens with instant data streaming.
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FeatureIcon>🚀</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Lightning Fast</FeatureTitle>
                <FeatureDescription>
                  Less than 1KB tracking script that won't slow down your site.
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <FeatureIcon>🎯</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Custom Events</FeatureTitle>
                <FeatureDescription>
                  Track any interaction with flexible event tracking and goals.
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <FeatureIcon>📊</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>Actionable Insights</FeatureTitle>
                <FeatureDescription>
                  Understand user behavior with detailed metrics and funnels.
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>

            <FeatureItem
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <FeatureIcon>🤖</FeatureIcon>
              <FeatureContent>
                <FeatureTitle>AI-Powered Analysis</FeatureTitle>
                <FeatureDescription>
                  Get smart recommendations to improve engagement and conversions.
                </FeatureDescription>
              </FeatureContent>
            </FeatureItem>
          </FeatureList>
        </DemoSection>

        <Footer>
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
        </Footer>
      </PageContainer>
    </>
  );
}