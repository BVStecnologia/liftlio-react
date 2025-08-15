import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Container principal - igual ao original
const GlobeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 600px;
  background: radial-gradient(ellipse at bottom, #1B1464 0%, #0D0321 100%);
  border-radius: 24px;
  margin-bottom: 32px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    height: 400px;
    border-radius: 16px;
    margin-bottom: 24px;
  }
  
  @media (max-width: 480px) {
    height: 350px;
    border-radius: 12px;
  }
`;

// Wrapper do Globo
const GlobeWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  canvas {
    outline: none !important;
    max-width: 100%;
    touch-action: pan-y pinch-zoom;
  }
`;

// Stats Overlay - card do lado esquerdo
const StatsOverlay = styled(motion.div)`
  position: absolute;
  top: 40px;
  left: 40px;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  min-width: 260px;
  max-width: 320px;
  z-index: 10;
  
  @media (max-width: 768px) {
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    max-width: none;
    padding: 20px;
    min-width: auto;
    max-height: calc(100% - 40px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  
  @media (max-width: 480px) {
    top: 16px;
    left: 16px;
    right: 16px;
    bottom: 16px;
    padding: 16px;
    max-height: calc(100% - 32px);
  }
`;

const LiveBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  svg {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.2); }
  }
`;

const StatNumber = styled.div`
  font-size: 56px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
`;

const StatDescription = styled.div`
  color: #64748b;
  font-size: 12px;
  margin-bottom: 24px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
    }
  ` : `
    background: transparent;
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: #a855f7;
    
    &:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.5);
    }
  `}
`;

const LocationsSection = styled.div`
  padding-top: 20px;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
  
  @media (max-width: 768px) {
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding-right: 8px;
    
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(139, 92, 246, 0.1);
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.5);
      border-radius: 2px;
    }
  }
`;

const LocationItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

// Journey Funnel Styles
const JourneyFunnel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const JourneyStep = styled.div<{ $width: string; $delay: number }>`
  position: relative;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  height: 36px;
  width: ${props => props.$width};
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  animation: slideIn 0.5s ease-out ${props => props.$delay}s both;
  cursor: pointer;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    filter: brightness(1.1);
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const StepInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StepNumber = styled.div`
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
`;

const StepName = styled.div`
  color: white;
  font-size: 13px;
  font-weight: 600;
`;

const StepTime = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 700;
`;

const ConversionArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  color: #64748b;
  font-size: 10px;
  gap: 4px;
  
  svg {
    font-size: 12px;
    animation: bounce 2s infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(2px); }
  }
`;

const LocationInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LocationFlag = styled.span`
  font-size: 20px;
`;

const LocationName = styled.div`
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
`;

const LocationCount = styled.div`
  color: #8b5cf6;
  font-size: 14px;
  font-weight: 600;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  
  svg {
    color: #3b82f6;
    animation: pulse 3s infinite;
  }
`;

// Title overlay no canto superior direito
const TitleOverlay = styled.div`
  position: absolute;
  top: 40px;
  right: 40px;
  text-align: right;
  z-index: 10;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
  margin-bottom: 8px;
`;


const Title = styled.h2`
  color: white;
  font-size: 36px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 18px;
  margin: 0;
`;

// Stats Cards Section
const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
    padding: 0 16px;
  }
`;

const StatCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(37, 37, 37, 0.95));
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(139, 92, 246, 0.1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8b5cf6, #a855f7);
  }
`;

const StatCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const StatCardTitle = styled.div`
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
`;

const StatCardIcon = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  background: ${props => props.color};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const StatCardValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
`;

const StatCardChange = styled.div<{ $positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
  
  svg {
    font-size: 12px;
  }
`;

// Charts Section
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  @media (max-width: 640px) {
    gap: 16px;
    margin-bottom: 24px;
  }
`;

const ChartCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(37, 37, 37, 0.95));
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(139, 92, 246, 0.1);
`;

const ChartTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  
  svg {
    color: #8b5cf6;
  }
`;

// Funnel Component
const FunnelBar = styled.div<{ width: string }>`
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  height: 40px;
  width: ${props => props.width};
  border-radius: 8px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  color: white;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }
`;

const FunnelLabel = styled.div`
  color: #94a3b8;
  font-size: 14px;
  margin-bottom: 8px;
`;

const LiftlioAnalytics: React.FC = () => {
  const globeRef = useRef<any>(null);
  const [liveVisitors] = useState(47);
  const [currentArcIndex, setCurrentArcIndex] = useState(0);
  const [activeView, setActiveView] = useState<'live' | 'journey'>('live');
  
  // Dados demo realistas para o globo
  const [points] = useState([
    // Americas
    { lat: 40.7128, lng: -74.0060, size: 0.15, color: '#8b5cf6' }, // New York
    { lat: 34.0522, lng: -118.2437, size: 0.12, color: '#8b5cf6' }, // Los Angeles
    { lat: 41.8781, lng: -87.6298, size: 0.10, color: '#8b5cf6' }, // Chicago
    { lat: -23.5505, lng: -46.6333, size: 0.14, color: '#8b5cf6' }, // São Paulo
    { lat: 19.4326, lng: -99.1332, size: 0.11, color: '#8b5cf6' }, // Mexico City
    
    // Europe
    { lat: 51.5074, lng: -0.1278, size: 0.16, color: '#8b5cf6' }, // London
    { lat: 48.8566, lng: 2.3522, size: 0.13, color: '#8b5cf6' }, // Paris
    { lat: 52.5200, lng: 13.4050, size: 0.11, color: '#8b5cf6' }, // Berlin
    { lat: 40.4168, lng: -3.7038, size: 0.10, color: '#8b5cf6' }, // Madrid
    { lat: 41.9028, lng: 12.4964, size: 0.09, color: '#8b5cf6' }, // Rome
    
    // Asia
    { lat: 35.6762, lng: 139.6503, size: 0.18, color: '#8b5cf6' }, // Tokyo
    { lat: 31.2304, lng: 121.4737, size: 0.15, color: '#8b5cf6' }, // Shanghai
    { lat: 1.3521, lng: 103.8198, size: 0.12, color: '#8b5cf6' }, // Singapore
    { lat: 28.6139, lng: 77.2090, size: 0.13, color: '#8b5cf6' }, // New Delhi
    { lat: 37.5665, lng: 126.9780, size: 0.11, color: '#8b5cf6' }, // Seoul
    
    // Oceania
    { lat: -33.8688, lng: 151.2093, size: 0.10, color: '#8b5cf6' }, // Sydney
    { lat: -37.8136, lng: 144.9631, size: 0.08, color: '#8b5cf6' }, // Melbourne
  ]);

  const [arcs, setArcs] = useState(() => {
    const allArcs = [
      // Jornada de usuário - USA -> UK -> Japan -> Australia -> Brazil -> USA
      { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 51.5074, startLng: -0.1278, endLat: 35.6762, endLng: 139.6503, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 35.6762, startLng: 139.6503, endLat: -33.8688, endLng: 151.2093, color: ['#8b5cf6', '#a855f7'] },
      { startLat: -33.8688, startLng: 151.2093, endLat: -23.5505, endLng: -46.6333, color: ['#8b5cf6', '#a855f7'] },
      { startLat: -23.5505, startLng: -46.6333, endLat: 40.7128, endLng: -74.0060, color: ['#8b5cf6', '#a855f7'] },
      // Conexões adicionais
      { startLat: 48.8566, startLng: 2.3522, endLat: 31.2304, endLng: 121.4737, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 31.2304, startLng: 121.4737, endLat: 1.3521, endLng: 103.8198, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 1.3521, startLng: 103.8198, endLat: 28.6139, endLng: 77.2090, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 52.5200, startLng: 13.4050, endLat: 40.4168, endLng: -3.7038, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 40.4168, startLng: -3.7038, endLat: 41.9028, endLng: 12.4964, color: ['#8b5cf6', '#a855f7'] },
    ];
    return allArcs.slice(0, 3);
  });

  // Dados para os gráficos
  const trafficGrowthData = [
    { day: 'Mon', visitors: 1200 },
    { day: 'Tue', visitors: 1890 },
    { day: 'Wed', visitors: 2340 },
    { day: 'Thu', visitors: 3200 },
    { day: 'Fri', visitors: 4780 },
    { day: 'Sat', visitors: 3900 },
    { day: 'Sun', visitors: 2800 },
  ];

  const trafficSourcesData = [
    { name: 'Liftlio Organic', value: 45, color: '#8b5cf6' },
    { name: 'Social Media', value: 25, color: '#3b82f6' },
    { name: 'Direct', value: 20, color: '#10b981' },
    { name: 'Referral', value: 10, color: '#f59e0b' },
  ];

  const devicesData = [
    { name: 'Desktop', value: 62, color: '#8b5cf6' },
    { name: 'Mobile', value: 31, color: '#a855f7' },
    { name: 'Tablet', value: 7, color: '#c084fc' },
  ];

  const radarData = [
    { metric: 'Time on Page', value: 85 },
    { metric: 'Scroll Depth', value: 72 },
    { metric: 'Interactions', value: 68 },
    { metric: 'Pages/Session', value: 78 },
    { metric: 'Return Rate', value: 90 },
  ];

  const growthTargetData = [
    { month: 'Jan', actual: 1200, target: 1000 },
    { month: 'Feb', actual: 2100, target: 1500 },
    { month: 'Mar', actual: 3400, target: 2200 },
    { month: 'Apr', actual: 4800, target: 3000 },
    { month: 'May', actual: 6200, target: 4000 },
    { month: 'Jun', actual: 7800, target: 5200 },
  ];

  useEffect(() => {
    // Auto-rotação
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.controls().enableZoom = true;
    }
    
    // Animação de jornada - rotaciona entre diferentes conjuntos de arcos
    const allArcs = [
      { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 51.5074, startLng: -0.1278, endLat: 35.6762, endLng: 139.6503, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 35.6762, startLng: 139.6503, endLat: -33.8688, endLng: 151.2093, color: ['#8b5cf6', '#a855f7'] },
      { startLat: -33.8688, startLng: 151.2093, endLat: -23.5505, endLng: -46.6333, color: ['#8b5cf6', '#a855f7'] },
      { startLat: -23.5505, startLng: -46.6333, endLat: 40.7128, endLng: -74.0060, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 48.8566, startLng: 2.3522, endLat: 31.2304, endLng: 121.4737, color: ['#8b5cf6', '#a855f7'] },
      { startLat: 31.2304, startLng: 121.4737, endLat: 1.3521, endLng: 103.8198, color: ['#8b5cf6', '#a855f7'] },
    ];
    
    const interval = setInterval(() => {
      setCurrentArcIndex(prev => {
        const nextIndex = (prev + 1) % 5;
        // Mostra 3 arcos por vez, rotacionando
        const startIdx = nextIndex;
        const newArcs = [];
        for (let i = 0; i < 3; i++) {
          newArcs.push(allArcs[(startIdx + i) % allArcs.length]);
        }
        setArcs(newArcs);
        return nextIndex;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      padding: '20px',
      paddingBottom: '40px',
      minHeight: '100vh',
      overflowX: 'hidden',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      position: 'relative'
    }}>
      <GlobeContainer>
        <GlobeWrapper>
          <Globe
            ref={globeRef}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            showAtmosphere={true}
            atmosphereColor="#3a228a"
            atmosphereAltitude={0.25}
            animateIn={true}
            
            // Pontos
            pointsData={points}
            pointAltitude={0.01}
            pointColor="color"
            pointRadius="size"
            pointResolution={20}
            
            // Arcos
            arcsData={arcs}
            arcColor="color"
            arcDashLength={0.5}
            arcDashGap={0.05}
            arcDashAnimateTime={3000}
            arcStroke={0.5}
            
            // Controles
            enablePointerInteraction={true}
          />
        </GlobeWrapper>

        {/* Card do lado esquerdo - LIVE NOW */}
        <StatsOverlay
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LiveBadge>
            <IconComponent icon={FaIcons.FaCircle} style={{ fontSize: '8px' }} />
            LIVE NOW
          </LiveBadge>

          <div style={{ marginBottom: '24px' }}>
            <StatNumber>{liveVisitors}</StatNumber>
            <StatLabel>Active Visitors</StatLabel>
            <StatDescription>Last 30 minutes</StatDescription>
          </div>

          <ActionButtons>
            <ActionButton 
              $primary={activeView === 'live'}
              onClick={() => setActiveView('live')}
            >
              <IconComponent icon={FaIcons.FaEye} />
              Live
            </ActionButton>
            <ActionButton 
              $primary={activeView === 'journey'}
              onClick={() => setActiveView('journey')}
            >
              <IconComponent icon={FaIcons.FaRoute} />
              Journey
            </ActionButton>
          </ActionButtons>

          <LocationsSection>
            {activeView === 'live' ? (
              <>
                <SectionTitle>
                  <IconComponent icon={FaIcons.FaMapMarkerAlt} />
                  HOTTEST LOCATIONS
                </SectionTitle>
                
                <LocationItem>
                  <LocationInfo>
                    <LocationFlag>🇺🇸</LocationFlag>
                    <LocationName>United States</LocationName>
                  </LocationInfo>
                  <LocationCount>18</LocationCount>
                </LocationItem>
                
                <LocationItem>
                  <LocationInfo>
                    <LocationFlag>🇬🇧</LocationFlag>
                    <LocationName>United Kingdom</LocationName>
                  </LocationInfo>
                  <LocationCount>12</LocationCount>
                </LocationItem>
                
                <LocationItem>
                  <LocationInfo>
                    <LocationFlag>🇧🇷</LocationFlag>
                    <LocationName>Brazil</LocationName>
                  </LocationInfo>
                  <LocationCount>9</LocationCount>
                </LocationItem>
                
                <LocationItem>
                  <LocationInfo>
                    <LocationFlag>🇯🇵</LocationFlag>
                    <LocationName>Japan</LocationName>
                  </LocationInfo>
                  <LocationCount>8</LocationCount>
                </LocationItem>
              </>
            ) : (
              <>
                <SectionTitle>
                  <IconComponent icon={FaIcons.FaRoute} />
                  USER JOURNEY
                </SectionTitle>
                
                <JourneyFunnel>
                  <JourneyStep $width="100%" $delay={0}>
                    <StepInfo>
                      <StepNumber>1</StepNumber>
                      <StepName>Landing Page</StepName>
                    </StepInfo>
                    <StepTime>2m 14s</StepTime>
                  </JourneyStep>
                  
                  <ConversionArrow>
                    <IconComponent icon={FaIcons.FaArrowDown} />
                    85% continue
                  </ConversionArrow>
                  
                  <JourneyStep $width="85%" $delay={0.1}>
                    <StepInfo>
                      <StepNumber>2</StepNumber>
                      <StepName>Product View</StepName>
                    </StepInfo>
                    <StepTime>1m 32s</StepTime>
                  </JourneyStep>
                  
                  <ConversionArrow>
                    <IconComponent icon={FaIcons.FaArrowDown} />
                    62% continue
                  </ConversionArrow>
                  
                  <JourneyStep $width="65%" $delay={0.2}>
                    <StepInfo>
                      <StepNumber>3</StepNumber>
                      <StepName>Add to Cart</StepName>
                    </StepInfo>
                    <StepTime>45s</StepTime>
                  </JourneyStep>
                  
                  <ConversionArrow>
                    <IconComponent icon={FaIcons.FaArrowDown} />
                    38% convert
                  </ConversionArrow>
                  
                  <JourneyStep $width="40%" $delay={0.3}>
                    <StepInfo>
                      <StepNumber>4</StepNumber>
                      <StepName>Purchase</StepName>
                    </StepInfo>
                    <StepTime>✓</StepTime>
                  </JourneyStep>
                </JourneyFunnel>
              </>
            )}
          </LocationsSection>
        </StatsOverlay>

        {/* Título do lado direito */}
        <TitleOverlay>
          <TitleContainer>
            <div>
              <div style={{ fontSize: '14px', color: '#8b5cf6', fontWeight: '600', letterSpacing: '2px', marginBottom: '4px' }}>LIFTLIO ANALYTICS</div>
              <Title>Live Global Traffic</Title>
            </div>
          </TitleContainer>
          <Subtitle>Real-time visitor activity from around the world</Subtitle>
        </TitleOverlay>
      </GlobeContainer>

      {/* Stats Cards */}
      <StatsSection>
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatCardHeader>
            <StatCardTitle>Organic Traffic</StatCardTitle>
            <StatCardIcon color="linear-gradient(135deg, #06b6d4, #0891b2)">
              <IconComponent icon={FaIcons.FaSearch} />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>12,847</StatCardValue>
          <StatCardChange $positive>
            <IconComponent icon={FaIcons.FaArrowUp} />
            +127.3% vs. last month
          </StatCardChange>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatCardHeader>
            <StatCardTitle>Unique Users</StatCardTitle>
            <StatCardIcon color="linear-gradient(135deg, #8b5cf6, #7c3aed)">
              <IconComponent icon={FaIcons.FaUsers} />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>8,392</StatCardValue>
          <StatCardChange $positive>
            <IconComponent icon={FaIcons.FaArrowUp} />
            +89.1% unique visitors
          </StatCardChange>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatCardHeader>
            <StatCardTitle>Conversion Rate</StatCardTitle>
            <StatCardIcon color="linear-gradient(135deg, #a855f7, #9333ea)">
              <IconComponent icon={FaIcons.FaRocket} />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>4.8%</StatCardValue>
          <StatCardChange $positive>
            <IconComponent icon={FaIcons.FaArrowUp} />
            +2.3% from organic traffic
          </StatCardChange>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StatCardHeader>
            <StatCardTitle>Avg. Time</StatCardTitle>
            <StatCardIcon color="linear-gradient(135deg, #10b981, #059669)">
              <IconComponent icon={FaIcons.FaClock} />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>3m 42s</StatCardValue>
          <StatCardChange $positive>
            <IconComponent icon={FaIcons.FaArrowUp} />
            +28s on page
          </StatCardChange>
        </StatCard>
      </StatsSection>

      {/* Traffic Growth Chart */}
      <ChartCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{ marginBottom: '32px' }}
      >
        <ChartTitle>
          <IconComponent icon={FaIcons.FaChartLine} />
          Traffic Growth
        </ChartTitle>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trafficGrowthData}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(26, 26, 26, 0.95)', 
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="visitors" 
              stroke="#8b5cf6" 
              fillOpacity={1} 
              fill="url(#colorGradient)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Charts Grid */}
      <ChartsGrid>
        {/* Traffic Sources */}
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <ChartTitle>
            <IconComponent icon={FaIcons.FaShareAlt} />
            Traffic Sources
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={trafficSourcesData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {trafficSourcesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(26, 26, 26, 0.95)', 
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
            {trafficSourcesData.map((source) => (
              <div key={source.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: source.color 
                }} />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {source.name} ({source.value}%)
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Growth vs Target */}
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <ChartTitle>
            <IconComponent icon={FaIcons.FaChartBar} />
            Growth vs Target
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={growthTargetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(26, 26, 26, 0.95)', 
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="target" fill="rgba(139, 92, 246, 0.3)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Devices */}
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <ChartTitle>
            <IconComponent icon={FaIcons.FaMobileAlt} />
            Devices
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={devicesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(26, 26, 26, 0.95)', 
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsGrid>

      {/* Conversion & Engagement Section */}
      <ChartTitle style={{ fontSize: '24px', marginTop: '40px', marginBottom: '24px' }}>
        <IconComponent icon={FaIcons.FaChartPie} />
        Conversion & Engagement
      </ChartTitle>

      <ChartsGrid>
        {/* Engagement Funnel */}
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <ChartTitle>
            <IconComponent icon={FaIcons.FaFilter} />
            Engagement Funnel
          </ChartTitle>
          <div>
            <FunnelLabel>Visited</FunnelLabel>
            <FunnelBar width="100%">8,392 users (100%)</FunnelBar>
            
            <FunnelLabel>Engaged</FunnelLabel>
            <FunnelBar width="75%">6,294 users (75%)</FunnelBar>
            
            <FunnelLabel>Converted</FunnelLabel>
            <FunnelBar width="30%">403 users (4.8%)</FunnelBar>
          </div>
        </ChartCard>

        {/* Visit Quality Score */}
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <ChartTitle>
            <IconComponent icon={FaIcons.FaStar} />
            Visit Quality Score
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(139, 92, 246, 0.2)" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" />
              <PolarRadiusAxis stroke="rgba(139, 92, 246, 0.2)" />
              <Radar name="Quality" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Return Rate */}
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <ChartTitle>
            <IconComponent icon={FaIcons.FaRedoAlt} />
            Return Rate
          </ChartTitle>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
              <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="rgba(139, 92, 246, 0.2)"
                  strokeWidth="20"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="#8b5cf6"
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80 * 0.78} ${2 * Math.PI * 80}`}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', fontWeight: '700', color: '#8b5cf6' }}>78%</div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>Returning</div>
              </div>
            </div>
          </div>
        </ChartCard>
      </ChartsGrid>
    </div>
  );
};

export default LiftlioAnalytics;