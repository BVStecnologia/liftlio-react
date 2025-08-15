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

// Header Styles
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
  color: #f3f4f6;
  
  svg {
    width: 24px;
    height: 24px;
    stroke: currentColor;
  }
`;

const LogoText = styled.span`
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const AnalyticsText = styled.span`
  color: #818cf8;
  font-size: 20px;
  font-weight: 500;
  margin-left: 8px;
  opacity: 0.9;
`;

const BetaBadge = styled.span`
  display: inline-block;
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.2);
  color: #818cf8;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-left: 10px;
  transition: all 0.3s;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 32px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: #a1a1aa;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;
  
  &:hover {
    color: #818cf8;
  }
`;

const NavButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const SignInButton = styled.a`
  background: transparent;
  color: #fff;
  border: 1px solid #27272a;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-block;
  
  &:hover {
    background: #18181b;
    border-color: #818cf8;
    color: #818cf8;
  }
`;

// Footer Styles
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
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 24px;
    height: 24px;
    stroke: currentColor;
  }
`;

const FooterDescription = styled.p`
  color: #a1a1aa;
  line-height: 1.6;
`;

const FooterColumn = styled.div`
  h3 {
    font-weight: 600;
    margin-bottom: 16px;
    color: #fff;
  }
`;

const FooterLinks = styled.ul`
  list-style: none;
  padding: 0;
  
  li {
    margin-bottom: 8px;
  }
  
  a {
    color: #a1a1aa;
    text-decoration: none;
    display: block;
    padding: 4px 0;
    transition: color 0.3s;
    
    &:hover {
      color: #818cf8;
    }
  }
`;

const FooterBottom = styled.div`
  text-align: center;
  padding-top: 40px;
  border-top: 1px solid #27272a;
  color: #a1a1aa;
`;

// Main Container with padding for fixed header
const MainContainer = styled.div`
  padding-top: 80px;
  min-height: 100vh;
  background: #0a0a0a;
`;

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
    { name: 'Liftlio', value: 90, color: '#8b5cf6' },
    { name: 'Social Media', value: 4, color: '#3b82f6' },
    { name: 'Direct', value: 3, color: '#10b981' },
    { name: 'Referral', value: 3, color: '#f59e0b' },
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
    <>
      {/* Header */}
      <Header>
        <HeaderContainer>
          <Logo href="/">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <LogoText>LIFTLIO</LogoText>
            <AnalyticsText>Analytics</AnalyticsText>
            <BetaBadge>Beta</BetaBadge>
          </Logo>
          
          <Nav>
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#testimonials">Testimonials</NavLink>
            
            <NavButtons>
              <SignInButton href="/login">Sign In</SignInButton>
            </NavButtons>
          </Nav>
        </HeaderContainer>
      </Header>

      {/* Main Content */}
      <MainContainer>
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

      {/* Conversion by Traffic Source - DESTAQUE DO PODER DO LIFTLIO */}
      <ChartCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        style={{ marginBottom: '40px', marginTop: '40px' }}
      >
        
        <ChartTitle>
          <IconComponent icon={FaIcons.FaTrophy} style={{ color: '#fbbf24' }} />
          Conversion Rate by Traffic Source
        </ChartTitle>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
          Outperforming paid advertising with organic, qualified traffic
        </p>
        
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={[
            { source: 'Liftlio', rate: 24.8, visitors: 11580, conversions: 2872, color: '#8b5cf6' },
            { source: 'Paid Ads', rate: 3.2, visitors: 514, conversions: 16, color: '#ef4444' },
            { source: 'Social Media', rate: 2.1, visitors: 385, conversions: 8, color: '#3b82f6' },
            { source: 'Direct', rate: 1.8, visitors: 385, conversions: 7, color: '#10b981' },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
            <XAxis dataKey="source" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa' } }} />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(26, 26, 26, 0.95)', 
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px'
              }}
              formatter={(value, name) => {
                if (name === 'rate') return [`${value}%`, 'Conversion Rate'];
                return [value, name];
              }}
              labelFormatter={(label) => `Source: ${label}`}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{
                      background: 'rgba(26, 26, 26, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
                      <p style={{ color: '#a1a1aa', fontSize: '12px' }}>Visitors: {data.visitors.toLocaleString()}</p>
                      <p style={{ color: '#10b981', fontSize: '12px' }}>Conversions: {data.conversions.toLocaleString()}</p>
                      <p style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
                        Rate: {data.rate}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="rate" fill="#8b5cf6" barSize={60}>
              {[
                { source: 'Liftlio', rate: 24.8, color: '#8b5cf6' },
                { source: 'Paid Ads', rate: 3.2, color: '#ef4444' },
                { source: 'Social Media', rate: 2.1, color: '#3b82f6' },
                { source: 'Direct', rate: 1.8, color: '#10b981' },
              ].map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '32px',
          padding: '20px',
          background: 'rgba(139, 92, 246, 0.05)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '12px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>24.8%</div>
            <div style={{ color: '#a1a1aa', fontSize: '14px' }}>Liftlio Conversion</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>7.7x</div>
            <div style={{ color: '#a1a1aa', fontSize: '14px' }}>Better than Paid Ads</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>2,872</div>
            <div style={{ color: '#a1a1aa', fontSize: '14px' }}>Total Conversions</div>
          </div>
        </div>
      </ChartCard>

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
                AI-powered platform to scale word-of-mouth recommendations without paying for ads.
              </FooterDescription>
            </FooterBrand>
            
            <FooterColumn>
              <h3>Product</h3>
              <FooterLinks>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#api">API Documentation</a></li>
              </FooterLinks>
            </FooterColumn>
            
            <FooterColumn>
              <h3>Company</h3>
              <FooterLinks>
                <li><a href="/about">About</a></li>
                <li><a href="/blog">Blog</a></li>
                <li><a href="/careers">Careers</a></li>
              </FooterLinks>
            </FooterColumn>
            
            <FooterColumn>
              <h3>Legal</h3>
              <FooterLinks>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/security">Security</a></li>
              </FooterLinks>
            </FooterColumn>
          </FooterContent>
          
          <FooterBottom>
            © 2024 Liftlio. All rights reserved.
          </FooterBottom>
        </FooterContainer>
      </Footer>
    </>
  );
};

export default LiftlioAnalytics;