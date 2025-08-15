import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter
} from 'recharts';
import * as FaIcons from 'react-icons/fa';
import { FaCode, FaCopy, FaCheck, FaCheckCircle, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { motion, AnimatePresence } from 'framer-motion';
import GlobeVisualizationPro, { globeEventEmitter, GlobeVisualizationHandle } from '../components/GlobeVisualizationPro';
// import { useProject } from '../context/ProjectContext';
// import { useTheme } from '../context/ThemeContext';
// import { supabase } from '../lib/supabaseClient';
// import { useRealtime } from '../context/RealtimeProvider';

// Helpers para gerar dados demo
const generateDemoEvents = (count: number) => {
  const events = [];
  const now = new Date();
  const sources = ['Liftlio', 'Direct', 'Social Media', 'Referral', 'Email'];
  const pages = ['/home', '/products', '/about', '/contact', '/blog', '/pricing'];
  const eventTypes = ['pageview', 'click', 'scroll', 'conversion', 'add_to_cart', 'form_submit'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const countries = ['Brazil', 'United States', 'Portugal', 'Spain', 'Argentina'];
  const cities = ['São Paulo', 'New York', 'Lisbon', 'Madrid', 'Buenos Aires'];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    events.push({
      id: `demo-${i}`,
      project_id: 58,
      visitor_id: `visitor-${Math.floor(Math.random() * 100)}`,
      session_id: `session-${Math.floor(Math.random() * 50)}`,
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      page_url: pages[Math.floor(Math.random() * pages.length)],
      referrer: Math.random() > 0.3 ? sources[Math.floor(Math.random() * sources.length)] : null,
      device_type: devices[Math.floor(Math.random() * devices.length)],
      browser: Math.random() > 0.5 ? 'Chrome' : 'Safari',
      os: Math.random() > 0.5 ? 'Windows' : 'macOS',
      country: countries[Math.floor(Math.random() * countries.length)],
      city: cities[Math.floor(Math.random() * cities.length)],
      latitude: -23.5505 + (Math.random() - 0.5) * 10,
      longitude: -46.6333 + (Math.random() - 0.5) * 10,
      scroll_depth: Math.floor(Math.random() * 100),
      time_on_page: Math.floor(Math.random() * 300),
      created_at: timestamp.toISOString(),
      custom_props: {}
    });
  }
  
  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const generateSingleDemoEvent = () => {
  const sources = ['Liftlio', 'Direct', 'Social Media', 'Referral', 'Email'];
  const pages = ['/home', '/products', '/about', '/contact', '/blog', '/pricing'];
  const eventTypes = ['pageview', 'click', 'scroll', 'conversion'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const countries = ['Brazil', 'United States', 'Portugal', 'Spain', 'Argentina'];
  const cities = ['São Paulo', 'New York', 'Lisbon', 'Madrid', 'Buenos Aires'];
  
  return {
    id: `demo-${Date.now()}`,
    project_id: 58,
    visitor_id: `visitor-${Math.floor(Math.random() * 100)}`,
    session_id: `session-${Math.floor(Math.random() * 50)}`,
    event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    page_url: pages[Math.floor(Math.random() * pages.length)],
    referrer: Math.random() > 0.3 ? sources[Math.floor(Math.random() * sources.length)] : null,
    device_type: devices[Math.floor(Math.random() * devices.length)],
    browser: Math.random() > 0.5 ? 'Chrome' : 'Safari',
    os: Math.random() > 0.5 ? 'Windows' : 'macOS',
    country: countries[Math.floor(Math.random() * countries.length)],
    city: cities[Math.floor(Math.random() * cities.length)],
    latitude: -23.5505 + (Math.random() - 0.5) * 10,
    longitude: -46.6333 + (Math.random() - 0.5) * 10,
    scroll_depth: Math.floor(Math.random() * 100),
    time_on_page: Math.floor(Math.random() * 300),
    created_at: new Date().toISOString(),
    custom_props: {}
  };
};

// Animações adicionais
const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const slideInFromRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const Container = styled.div`
  padding: 0;
  animation: fadeIn 0.5s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Header = styled.div`
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 600;
  color: ${props => '#ffffff'};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 1.5rem;
    color: ${props => '#8b5cf6'};
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 10px 20px;
  border: 1px solid ${props => props.active 
    ? '#8b5cf6' 
    : true ? 'rgba(255, 255, 255, 0.2)' : '#2a2a2a'};
  background: ${props => {
    if (props.active) {
      return '#8b5cf6';
    }
    return true ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
  }};
  color: ${props => props.active 
    ? 'white' 
    : '#ffffff'};
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active 
      ? '#7c3aed'
      : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled(motion.div)<{ trend?: 'up' | 'down' | 'neutral' }>`
  background: ${props => true 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${props => true 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#2a2a2a'};
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
  }
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const MetricTitle = styled.div`
  color: ${props => '#9ca3af'};
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
  margin-bottom: 8px;
`;

const MetricIcon = styled.div<{ color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color || '#8b5cf6'};
  
  svg {
    font-size: 24px;
    color: white;
  }
`;

const MetricValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => '#ffffff'};
  margin-bottom: 4px;
`;

const MetricChange = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};

  svg {
    font-size: 16px;
  }
`;

const MetricDescription = styled.div`
  color: ${props => '#6b7280'};
  font-size: 13px;
  margin-top: 4px;
`;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
`;

const SecondaryChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => true 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#2a2a2a'};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${props => '#9ca3af'};
`;

const LegendDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const ChartCard = styled(motion.div)`
  background: ${props => true 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border-radius: 16px;
  padding: 24px;
  border: 1px solid ${props => true 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#2a2a2a'};
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const DemoIndicator = styled.span`
  background: rgba(249, 115, 22, 0.1);
  color: #8b5cf6;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(249, 115, 22, 0.2);
  cursor: help;
  position: relative;
  
  &:hover::after {
    content: "Real data will appear once the tracking tag is installed";
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1000;
    font-weight: 400;
    border: 1px solid rgba(139, 92, 246, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:hover::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.95);
    pointer-events: none;
    z-index: 1000;
    margin-bottom: 2px;
  }
`;

const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${props => '#ffffff'};
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${props => '#8b5cf6'};
  }
`;

const ChartOptions = styled.div`
  display: flex;
  gap: 8px;
`;

const ChartOption = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${props => props.active 
    ? '#8b5cf6' 
    : '#2a2a2a'};
  background: ${props => props.active 
    ? '#8b5cf6' 
    : props.theme.colors.background};
  color: ${props => props.active 
    ? 'white' 
    : '#ffffff'Secondary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => '#8b5cf6'};
  }
`;

const InsightCard = styled(motion.div)`
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: pulse 3s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
`;

const InsightTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
`;

const InsightText = styled.p`
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.95;
  position: relative;
  z-index: 1;
`;

const TagImplementation = styled.div`
  background: ${props => true 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border: 1px solid ${props => true 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#2a2a2a'};
  border-radius: 16px;
  padding: 32px;
  margin-top: 32px;
`;

const TagTitle = styled.h3<{ clickable?: boolean }>`
  font-size: 20px;
  font-weight: 700;
  color: ${props => '#ffffff'};
  margin-bottom: ${props => props.clickable ? '0' : '24px'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  user-select: none;
  transition: all 0.3s ease;
  padding: ${props => props.clickable ? '12px 0' : '0'};
  
  ${props => props.clickable && `
    &:hover {
      color: ${'#8b5cf6'};
    }
  `}

  svg {
    color: ${props => '#8b5cf6'};
    font-size: 24px;
  }
`;

const CollapsibleContent = styled.div<{ collapsed: boolean }>`
  overflow: hidden;
  transition: all 0.3s ease;
  max-height: ${props => props.collapsed ? '0' : '5000px'};
  opacity: ${props => props.collapsed ? '0' : '1'};
  margin-top: ${props => props.collapsed ? '0' : '20px'};
`;

const CollapseIcon = styled.span<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
  transform: ${props => props.collapsed ? 'rotate(0deg)' : 'rotate(180deg)'};
  color: ${props => '#9ca3af'};
`;

const ImplementationSteps = styled.div`
  display: grid;
  gap: 24px;
  margin-bottom: 24px;
`;

const Step = styled.div`
  display: flex;
  gap: 16px;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => '#8b5cf6'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${props => '#ffffff'};
  margin-bottom: 8px;
`;

const StepDescription = styled.p`
  color: ${props => '#9ca3af'};
  font-size: 14px;
  line-height: 1.6;
`;

const CodeContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.5);
  color: #a0aec0;
  padding: 20px;
  padding-right: 60px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props => '#8b5cf6'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => '#8b5cf6'Dark};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 14px;
  }
`;

const SuccessMessage = styled.div`
  color: #10b981;
  font-size: 14px;
  font-weight: 600;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    font-size: 16px;
  }
`;

const NoDataAlert = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.1) 0%, 
    rgba(168, 85, 247, 0.1) 100%);
  border: 2px dashed ${props => '#8b5cf6'};
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%);
  }
`;

const DemoDataBadge = styled.div`
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
  
  svg {
    font-size: 14px;
  }
`;

const AlertIcon = styled.div`
  font-size: 48px;
  color: ${props => '#8b5cf6'};
  margin-bottom: 16px;
`;

const AlertTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => '#ffffff'};
  margin-bottom: 12px;
`;

const AlertText = styled.p`
  font-size: 16px;
  color: ${props => '#9ca3af'};
  margin-bottom: 24px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
`;

const AlertButton = styled.button`
  background: ${props => '#8b5cf6'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => '#8b5cf6'Dark};
    transform: translateY(-2px);
  }

  svg {
    font-size: 18px;
  }
`;

// Novos componentes para seção avançada
const AdvancedSection = styled.div`
  background: ${props => true 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border: 1px solid ${props => true 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#2a2a2a'};
  border-radius: 16px;
  padding: 32px;
  margin-top: 32px;
`;

const AdvancedTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${props => '#ffffff'};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${props => '#8b5cf6'};
    font-size: 24px;
  }
`;

const AdvancedSubtitle = styled.p`
  color: ${props => '#9ca3af'};
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.6;
`;

const AccordionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const AccordionItem = styled.div`
  background: ${props => true
    ? 'rgba(139, 92, 246, 0.05)'
    : 'rgba(139, 92, 246, 0.03)'};
  border: 1px solid ${props => true
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.15)'};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${props => '#8b5cf6'};
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
  }
`;

const AccordionHeader = styled.button<{ isOpen?: boolean }>`
  width: 100%;
  padding: 20px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => true
      ? 'rgba(139, 92, 246, 0.08)'
      : 'rgba(139, 92, 246, 0.05)'};
  }
`;

const AccordionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: ${props => '#ffffff'};
  text-align: left;

  svg {
    color: ${props => '#8b5cf6'};
    font-size: 20px;
  }
`;

const AccordionIcon = styled.div<{ $isOpen?: boolean }>`
  color: ${props => '#8b5cf6'};
  transition: transform 0.3s ease;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  font-size: 20px;
`;

const AccordionContent = styled(motion.div)`
  padding: 0 24px 24px;
`;

const EventExample = styled.div`
  margin-bottom: 20px;
`;

const EventTitle = styled.h5`
  font-size: 14px;
  font-weight: 600;
  color: ${props => '#ffffff'};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${props => '#8b5cf6'};
  }
`;

const EventDescription = styled.p`
  color: ${props => '#9ca3af'};
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 12px;
`;

const EventCode = styled.div`
  background: ${props => true 
    ? 'rgba(0, 0, 0, 0.5)' 
    : '#1e293b'};
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
`;

const TabContainer = styled.div`
  margin-top: 20px;
`;

const TabButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ active?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.active 
    ? '#8b5cf6' 
    : true ? 'rgba(255, 255, 255, 0.2)' : '#2a2a2a'};
  background: ${props => props.active 
    ? '#8b5cf6' 
    : 'transparent'};
  color: ${props => props.active 
    ? 'white' 
    : '#ffffff'};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active 
      ? '#8b5cf6'Dark 
      : true ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const TabContent = styled(motion.div)`
  padding: 20px;
  background: ${props => true
    ? 'rgba(0, 0, 0, 0.3)'
    : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 12px;
  border: 1px solid ${props => true
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
`;

const HelpTooltip = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  cursor: help;
  
  svg {
    color: ${props => '#8b5cf6'};
    opacity: 0.7;
    font-size: 16px;
    transition: opacity 0.2s;
  }
  
  &:hover svg {
    opacity: 1;
  }
`;

const TooltipContent = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: ${props => true 
    ? 'rgba(17, 24, 39, 0.98)' 
    : 'rgba(255, 255, 255, 0.98)'};
  color: ${props => '#ffffff'};
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  min-width: 200px;
  max-width: 350px;
  white-space: normal;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => true
    ? 'rgba(139, 92, 246, 0.3)'
    : 'rgba(139, 92, 246, 0.2)'};
  z-index: 99999;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${props => true 
      ? 'rgba(17, 24, 39, 0.98)' 
      : 'rgba(255, 255, 255, 0.98)'};
  }
  
  ${HelpTooltip}:hover & {
    opacity: 1;
    visibility: visible;
  }
`;

const VerifiedBadge = styled.span<{ $verified: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => props.$verified
    ? true
      ? 'rgba(139, 92, 246, 0.15)'
      : 'rgba(139, 92, 246, 0.1)'
    : true
      ? 'rgba(107, 114, 128, 0.15)'
      : 'rgba(107, 114, 128, 0.1)'
  };
  color: ${props => props.$verified 
    ? '#8b5cf6'
    : '#9ca3af'
  };
  border: 1px solid ${props => props.$verified
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(107, 114, 128, 0.1)'
  };
  
  svg {
    font-size: 10px;
  }
`;

const TagStatusCard = styled.div<{ $connected: boolean }>`
  background: ${props => props.$connected
    ? true 
      ? 'rgba(139, 92, 246, 0.03)'
      : 'rgba(139, 92, 246, 0.02)'
    : true
      ? 'rgba(107, 114, 128, 0.05)'
      : 'rgba(107, 114, 128, 0.03)'
  };
  border: 1px solid ${props => props.$connected 
    ? true
      ? 'rgba(139, 92, 246, 0.2)'
      : 'rgba(139, 92, 246, 0.15)'
    : true
      ? 'rgba(107, 114, 128, 0.2)'
      : 'rgba(107, 114, 128, 0.15)'
  };
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(10px);
`;

const TagStatusInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const TagStatusIcon = styled.div<{ $connected: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.$connected 
    ? true
      ? 'rgba(139, 92, 246, 0.15)'
      : 'rgba(139, 92, 246, 0.1)'
    : true
      ? 'rgba(107, 114, 128, 0.15)'
      : 'rgba(107, 114, 128, 0.1)'
  };
  color: ${props => props.$connected ? '#8b5cf6' : '#6b7280'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 1px solid ${props => props.$connected 
    ? 'rgba(139, 92, 246, 0.2)' 
    : 'rgba(107, 114, 128, 0.15)'
  };
`;

const TagStatusText = styled.div`
  flex: 1;
`;

const TagStatusTitle = styled.h3<{ $connected: boolean }>`
  color: ${props => props.$connected ? '#8b5cf6' : '#6b7280'};
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TagStatusDescription = styled.p`
  color: ${props => '#9ca3af'};
  font-size: 14px;
  margin: 0;
`;

const TagStatusMetrics = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const TagMetric = styled.div`
  text-align: center;
`;

const TagMetricValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => '#8b5cf6'};
`;

const TagMetricLabel = styled.div`
  font-size: 12px;
  color: ${props => '#9ca3af'};
  margin-top: 2px;
`;

const ImportantNote = styled.div`
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.1) 0%, 
    rgba(168, 85, 247, 0.1) 100%);
  border: 2px solid ${props => '#8b5cf6'};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg {
    color: ${props => '#8b5cf6'};
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const NoteContent = styled.div`
  flex: 1;
`;

const NoteTitle = styled.h4`
  color: ${props => '#ffffff'};
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const NoteText = styled.p`
  color: ${props => '#9ca3af'};
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  
  code {
    background: ${props => true
      ? 'rgba(139, 92, 246, 0.2)'
      : 'rgba(139, 92, 246, 0.1)'};
    color: ${props => '#8b5cf6'};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }
`;

const AnalyticsDemo: React.FC = () => {
  // SOLUTION 7: Direct ref to Globe component for imperative control
  const globeRef = useRef<GlobeVisualizationHandle>(null);
  
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('wordpress');
  // Dados demo - não precisa de context
  const currentProject = { id: 58, name: 'Demo Project' };
  const theme = {
    name: 'dark',
    colors: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      background: '#0f0f0f',
      text: {
        primary: '#ffffff',
        secondary: '#9ca3af',
        muted: '#6b7280'
      },
      border: '#2a2a2a'
    }
  };
  const isConnected = true; // Sempre conectado para demo
  
  // Estados para os novos gráficos de conversão - com dados demo iniciais
  const [funnelData, setFunnelData] = useState([
    { name: 'Visited', value: 1000, percentage: '100%' },
    { name: 'Engaged', value: 450, percentage: '45%' },
    { name: 'Converted', value: 120, percentage: '12%' }
  ]);
  
  const [qualityData, setQualityData] = useState([
    { metric: 'Time on Page', value: 75 },
    { metric: 'Scroll Depth', value: 82 },
    { metric: 'Interactions', value: 68 },
    { metric: 'Pages/Session', value: 71 },
    { metric: 'Return Rate', value: 35 }
  ]);
  
  const [returnRateData, setReturnRateData] = useState([
    { name: 'New Visitors', value: 65, color: '#8b5cf6' },
    { name: 'Returning', value: 35, color: '#c084fc' }
  ]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analyticsScript, setAnalyticsScript] = useState<string>('');
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([
    { month: 'Aug', crescimento: 100, meta: 100 },
    { month: 'Sep', crescimento: 145, meta: 130 },
    { month: 'Oct', crescimento: 178, meta: 160 },
    { month: 'Nov', crescimento: 215, meta: 190 },
    { month: 'Dec', crescimento: 268, meta: 220 },
    { month: 'Jan', crescimento: 295, meta: 250 }
  ]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [metricsData, setMetricsData] = useState({
    organicTraffic: 0,
    uniqueUsers: 0,
    conversionRate: 0,
    avgTime: 0,
    organicChange: 0,
    usersChange: 0,
    conversionChange: 0,
    timeChange: 0
  });
  // Estado para controlar se o usuário expandiu manualmente
  const [userHasExpanded, setUserHasExpanded] = useState(false);
  // Iniciar colapsado será definido depois baseado na tag
  const [implementationCollapsed, setImplementationCollapsed] = useState(false);
  const [advancedCollapsed, setAdvancedCollapsed] = useState(true); // Iniciar fechado por padrão
  
  // Estado para rastrear eventos verificados
  const [verifiedEvents, setVerifiedEvents] = useState<string[]>([]);
  
  // Estado para tag conectada e contadores
  const [tagStatus, setTagStatus] = useState<{
    connected: boolean;
    lastSeen: Date | null;
    totalEvents24h: number;
    pageviews24h: number;
  }>({
    connected: false,
    lastSeen: null,
    totalEvents24h: 0,
    pageviews24h: 0
  });
  
  // Cores dinâmicas baseadas no tema (usando paleta roxa do Liftlio)
  const chartColors = {
    primary: '#8b5cf6', // Roxo principal do Liftlio
    secondary: '#a855f7', // Roxo secundário
    tertiary: '#d8b4fe', // Roxo ainda mais claro
    accent: '#c084fc', // Roxo mais claro
    grid: theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
    text: theme.name === 'dark' ? '#9ca3af' : '#6b7280',
    tooltip: theme.name === 'dark' ? '#1f2937' : '#ffffff'
  };

  // Função para verificar eventos implementados e status da tag
  const checkVerifiedEvents = useCallback(async () => {
    // DEMO MODE - Sempre mostra eventos verificados
    setVerifiedEvents(['pageview', 'click', 'scroll', 'conversion']);
    setTagStatus({
      connected: true,
      lastSeen: new Date(),
      totalEvents24h: 1542,
      pageviews24h: 847
    });
    return;
    
    /* CÓDIGO ORIGINAL COMENTADO
    if (!currentProject?.id) return;
    
    try {
      // Buscar TODOS os eventos das últimas 24 horas para status da tag
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Demo: simular eventos das últimas 24h
      const allEvents24h = generateDemoEvents(150).filter(e => 
        new Date(e.created_at) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      if (allEvents24h && allEvents24h.length > 0) {
        // Atualizar status da tag
        const pageviews = allEvents24h.filter(e => e.event_type === 'pageview').length;
        setTagStatus({
          connected: true,
          lastSeen: new Date(allEvents24h[0].created_at),
          totalEvents24h: allEvents24h.length,
          pageviews24h: pageviews
        });
        setHasData(true);
        // Não colapsar automaticamente - deixar o usuário controlar o estado
      } else {
        setTagStatus({
          connected: false,
          lastSeen: null,
          totalEvents24h: 0,
          pageviews24h: 0
        });
        // Se tag não conectada, abrir as seções
        if (!userHasExpanded) {
          setImplementationCollapsed(false); // Abrir quando não tem tag
        }
        setAdvancedCollapsed(false);
      }
      
      // Demo: simular eventos específicos dos últimos 30 dias
      const data = [
        { event_type: 'add_to_cart' },
        { event_type: 'checkout_start' },
        { event_type: 'purchase' },
        { event_type: 'product_view' },
        { event_type: 'form_submit' }
      ];
      
      if (data && data.length > 0) {
        const eventTypesSet = new Set(data.map(item => item.event_type));
        const eventTypes = Array.from(eventTypesSet);
        // Para demo, sempre mostrar todos os eventos como verificados
        setVerifiedEvents(['add_to_cart', 'checkout_start', 'purchase', 'product_view', 'form_submit']);
      }
    } catch (error) {
      console.error('Error checking verified events:', error);
    }
  }, [currentProject]);

  // Efeito para controlar o colapso inicial baseado na tag
  useEffect(() => {
    // Se tag está conectada e usuário nunca expandiu manualmente, colapsar
    if (tagStatus.connected && !userHasExpanded) {
      setImplementationCollapsed(true);
    }
  }, [tagStatus.connected]); // Só re-executar quando status da tag mudar

  // Fetch analytics script from project
  useEffect(() => {
    const fetchProjectScript = async () => {
      if (!currentProject?.id) return;
      
      // Demo: retornar script de exemplo
      const data = {
        analytics_script: `<script async src="https://track.liftlio.com/t.js" data-id="58"></script>`
      };
      const error = null;
      
      if (data?.analytics_script) {
        setAnalyticsScript(data.analytics_script);
      } else {
        // Generate default script if not exists
        const defaultScript = `<!-- Liftlio Analytics -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://analytics.liftlio.com/tag.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${currentProject.id}');
</script>`;
        setAnalyticsScript(defaultScript);
      }
    };
    
    fetchProjectScript();
    checkVerifiedEvents(); // Verificar eventos implementados
  }, [currentProject]);
  
  const generateDemoData = () => {
    console.log('🎯 generateDemoData CALLED!');
    // Generate realistic demo data for all charts
    const now = new Date();
    const demoTraffic = [];
    
    // Generate 30 days of traffic data with realistic growth pattern
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const baseVisitors = 150 + Math.floor(Math.random() * 50);
      const growth = Math.floor((30 - i) * 2); // Gradual growth
      const dailyVariation = Math.floor(Math.random() * 30) - 15; // Daily variation
      
      demoTraffic.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        visitors: Math.max(50, baseVisitors + growth + dailyVariation),
        pageViews: Math.max(100, (baseVisitors + growth + dailyVariation) * 2.5),
        sessions: Math.max(80, (baseVisitors + growth + dailyVariation) * 1.8)
      });
    }
    
    setTrafficData(demoTraffic);
    console.log('📊 Traffic data set:', demoTraffic.length, 'days');
    
    // Realistic traffic sources - Liftlio generates the search traffic
    setSourceData([
      { name: 'Liftlio', value: 45, color: '#8b5cf6' },
      { name: 'Direct', value: 30, color: '#a855f7' },
      { name: 'Social Media', value: 15, color: '#c084fc' },
      { name: 'Referral', value: 7, color: '#d8b4fe' },
      { name: 'Others', value: 3, color: '#e9d5ff' }
    ]);
    
    // Realistic device distribution
    setDeviceData([
      { name: 'Desktop', users: 580, sessions: 1450, percentage: 55, color: '#8b5cf6' },
      { name: 'Mobile', users: 380, sessions: 720, percentage: 35, color: '#a855f7' },
      { name: 'Tablet', users: 120, sessions: 180, percentage: 10, color: '#c084fc' }
    ]);
    
    // Realistic growth data - últimos 6 meses
    const growth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      growth.push({
        month: monthName,
        crescimento: 100 + ((5-i) * 35) + Math.floor(Math.random() * 20),
        meta: 100 + ((5-i) * 30)
      });
    }
    setGrowthData(growth);
    console.log('📊 Demo growth data set:', growth);
    
    // Set realistic metrics
    setMetricsData({
      organicTraffic: 12500,
      uniqueUsers: 3247,
      conversionRate: 12.5,
      avgTime: 165, // 2m 45s in seconds
      organicChange: 24.7,
      usersChange: 12.5,
      conversionChange: 8.3,
      timeChange: -5.2
    });
    
    // Set demo data for conversion charts
    setFunnelData([
      { name: 'Visited', value: 1000, percentage: '100%' },
      { name: 'Engaged', value: 450, percentage: '45%' },
      { name: 'Converted', value: 120, percentage: '12%' }
    ]);
    
    setQualityData([
      { metric: 'Time on Page', value: 75 },
      { metric: 'Scroll Depth', value: 82 },
      { metric: 'Interactions', value: 68 },
      { metric: 'Pages/Session', value: 71 },
      { metric: 'Return Rate', value: 35 }
    ]);
    
    setReturnRateData([
      { name: 'New Visitors', value: 65, color: '#8b5cf6' },
      { name: 'Returning', value: 35, color: '#c084fc' }
    ]);
  };

  // Função para buscar dados de analytics - USANDO DADOS DEMO  
  const fetchAnalyticsData = async () => {
    // Para demo, sempre gera dados demo
    console.log('🎯 Demo mode - generating demo data...');
    setHasData(true);
    generateDemoData();
    setLoading(false);
    return;
    
    /* CÓDIGO ORIGINAL COMENTADO
      console.log('🚀 fetchAnalyticsData - currentProject:', currentProject);
      if (!currentProject?.id) {
        // Se não há projeto, mostrar dados demo
        console.log('⚠️ No project ID, generating demo data...');
        setHasData(false);
        generateDemoData();
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // Calculate date range based on period
        const now = new Date();
        const startDate = new Date();
        
        switch(period) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        }
        
        // Fetch analytics data com fallback para demo
        // Demo: gerar dados de analytics
        const analytics = generateDemoEvents(500);
        const error = null;
        
        if (error) throw error;
        
        console.log('📈 Analytics data fetched:', analytics?.length || 0, 'records');
        
        // Process data for charts (agora sempre processa pois a função SQL já retorna demo se necessário)
        if (analytics && analytics.length > 0) {
          console.log('✅ Processing data (real or demo from SQL)...');
          // Verifica se são dados demo baseado no visitor_id ou custom_data
          // Dados reais têm visitor_id como 'v_xxx' ou similares, demo tem 'visitor_'
          const isDemo = analytics[0]?.visitor_id?.startsWith('visitor_') || 
                         analytics[0]?.custom_data?.demo === true;
          
          console.log('📊 Data type detection:', {
            firstVisitorId: analytics[0]?.visitor_id,
            customData: analytics[0]?.custom_data,
            isDemo,
            willSetHasData: !isDemo
          });
          
          setHasData(!isDemo);
          
          // Se são dados demo, usar valores demo bonitos ao invés de calcular
          if (isDemo) {
            // Set beautiful demo metrics
            setMetricsData({
              organicTraffic: 12847,
              uniqueUsers: 3562,
              conversionRate: 14.2,
              avgTime: 185, // 3m 5s
              organicChange: 32.5,
              usersChange: 28.4,
              conversionChange: 12.7,
              timeChange: 15.3
            });
            
            // Set demo data for Engagement Funnel
            setFunnelData([
              { name: 'Visited', value: 3562, percentage: '100%' },
              { name: 'Engaged', value: 1674, percentage: '47%' },
              { name: 'Converted', value: 506, percentage: '14%' }
            ]);
            
            // Set demo data for Visit Quality
            setQualityData([
              { metric: 'Time on Page', value: 75 },
              { metric: 'Scroll Depth', value: 82 },
              { metric: 'Interactions', value: 68 },
              { metric: 'Pages/Session', value: 71 },
              { metric: 'Return Rate', value: 35 }
            ]);
            
            // Set demo data for Return Rate
            setReturnRateData([
              { name: 'New Visitors', value: 65, color: '#8b5cf6' },
              { name: 'Returning', value: 35, color: '#c084fc' }
            ]);
          }
          
          processAnalyticsData(analytics);
          
          // IMPORTANTE: Trigger Globe refresh aqui!
          console.log('🎯 Triggering Globe refresh after data fetch');
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setHasData(false);
        // Set realistic demo data even on error
        generateDemoData();
      } finally {
        setLoading(false);
      }
    */
  
  const processAnalyticsData = (data: any[]) => {
      // Process real data from database
      setAnalyticsData(data);
      
      // Calculate metrics for cards
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Current period (last 30 days)
      const currentPeriodData = data.filter(e => new Date(e.created_at) >= thirtyDaysAgo);
      const previousPeriodData = data.filter(e => {
        const date = new Date(e.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      });
      
      // Calculate organic traffic
      const organicCount = currentPeriodData.filter(e => e.is_organic === true).length;
      const previousOrganic = previousPeriodData.filter(e => e.is_organic === true).length;
      const organicChange = previousOrganic > 0 
        ? ((organicCount - previousOrganic) / previousOrganic * 100) 
        : 100;
      
      // Calculate unique users
      const uniqueUsers = new Set(currentPeriodData.map(e => e.visitor_id)).size;
      const previousUsers = new Set(previousPeriodData.map(e => e.visitor_id)).size;
      const usersChange = previousUsers > 0 
        ? ((uniqueUsers - previousUsers) / previousUsers * 100)
        : 100;
      
      // Calculate conversion rate (purchase events / total visitors)
      const purchases = currentPeriodData.filter(e => 
        e.event_type === 'purchase' || e.event_type === 'payment_success'
      ).length;
      const conversionRate = uniqueUsers > 0 ? (purchases / uniqueUsers * 100) : 0;
      
      // Calculate average time (simulated - would need session duration tracking)
      const avgTimeSeconds = Math.floor(Math.random() * 180) + 120; // 2-5 minutes simulated
      
      setMetricsData({
        organicTraffic: organicCount,
        uniqueUsers: uniqueUsers,
        conversionRate: conversionRate,
        avgTime: avgTimeSeconds,
        organicChange: organicChange,
        usersChange: usersChange,
        conversionChange: Math.random() * 2 - 0.5, // Simulated small change
        timeChange: Math.round(Math.random() * 30 - 10) // Round to avoid decimals
      });
      
      // Process traffic data by day
      const trafficByDay = new Map();
      const sourceCount = new Map();
      const deviceCount = new Map();
      const dailyTotals = new Map();
      
      // Get last 7 days with actual dates
      const today = new Date();
      const last7Days = [];
      const dateToKey = new Map();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        last7Days.push(dayName);
        dateToKey.set(dateKey, dayName);
        trafficByDay.set(dayName, { liftlio: 0, ads: 0, social: 0, direct: 0 });
      }
      
      // Process each event
      data.forEach((event: any) => {
        const eventDate = new Date(event.created_at);
        const eventDateKey = eventDate.toISOString().split('T')[0];
        const dayName = dateToKey.get(eventDateKey);
        
        if (dayName && trafficByDay.has(dayName)) {
          const dayData = trafficByDay.get(dayName);
          
          // Categorize traffic source based on actual database fields
          const referrer = event.referrer || '';
          const utmMedium = event.utm_medium || '';
          const utmSource = event.utm_source || '';
          const isOrganic = event.is_organic === true;
          
          // Categorize into 4 groups for the Traffic Growth chart
          if (isOrganic || referrer.toLowerCase().includes('liftlio') || utmSource === 'liftlio') {
            dayData.liftlio++;
          } else if (utmMedium === 'cpc' || utmMedium === 'cpm' || utmMedium === 'cpv') {
            dayData.ads++;
          } else if (utmMedium === 'social' || 
                     referrer.toLowerCase().includes('facebook') || 
                     referrer.toLowerCase().includes('instagram') || 
                     referrer.toLowerCase().includes('twitter') || 
                     referrer.toLowerCase().includes('linkedin') ||
                     referrer.toLowerCase().includes('youtube') ||
                     referrer.toLowerCase().includes('reddit') ||
                     referrer.toLowerCase().includes('tiktok') ||
                     referrer.toLowerCase().includes('pinterest')) {
            dayData.social++;
          } else {
            dayData.direct++;
          }
        }
        
        // Count sources - group all search traffic as Liftlio
        let sourceName = event.custom_data?.traffic_source || event.referrer || 'Direct';
        
        // Group all search/organic traffic as Liftlio
        if (event.is_organic === true || 
            sourceName.toLowerCase().includes('google') ||
            sourceName.toLowerCase().includes('bing') ||
            sourceName.toLowerCase().includes('yahoo') ||
            sourceName.toLowerCase().includes('duckduckgo') ||
            sourceName.toLowerCase().includes('search') ||
            sourceName.toLowerCase().includes('liftlio')) {
          sourceName = 'Liftlio';
        } else if (sourceName.toLowerCase().includes('facebook') || 
                   sourceName.toLowerCase().includes('instagram') ||
                   sourceName.toLowerCase().includes('twitter') ||
                   sourceName.toLowerCase().includes('linkedin')) {
          sourceName = 'Social Media';
        } else if (sourceName.toLowerCase().includes('ads') ||
                   event.custom_data?.utm_params?.utm_medium === 'cpc') {
          sourceName = 'Paid Ads';
        } else if (sourceName === '' || sourceName === null) {
          sourceName = 'Direct';
        }
        
        sourceCount.set(sourceName, (sourceCount.get(sourceName) || 0) + 1);
        
        // Count devices - normalize device types
        const deviceType = event.device_type ? event.device_type.toLowerCase() : 'desktop';
        let deviceKey = 'Desktop';
        if (deviceType === 'mobile' || deviceType === 'smartphone' || deviceType === 'phone') {
          deviceKey = 'Mobile';
        } else if (deviceType === 'tablet' || deviceType === 'ipad') {
          deviceKey = 'Tablet';
        } else if (deviceType === 'desktop' || deviceType === 'computer' || deviceType === 'pc') {
          deviceKey = 'Desktop';
        }
        deviceCount.set(deviceKey, (deviceCount.get(deviceKey) || 0) + 1);
      });
      
      // Convert to chart format
      const traffic = last7Days.map(day => {
        const data = trafficByDay.get(day) || { liftlio: 0, ads: 0, social: 0, direct: 0 };
        return {
          date: day,
          ...data
        };
      });
      
      // Process sources - top 5
      const totalEvents = data.length;
      const sourcesArray = Array.from(sourceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const sources = sourcesArray.map(([name, count], index) => ({
        name: name.replace('Search', '').trim() || name,
        value: Math.round((count / totalEvents) * 100),
        color: ['#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'][index]
      }));
      
      // Process devices - ensure all types are represented
      const deviceTypes = ['Desktop', 'Mobile', 'Tablet'];
      const devices = deviceTypes.map(device => ({
        name: device,
        users: deviceCount.get(device) || 0,
        percentage: totalEvents > 0 ? Math.round(((deviceCount.get(device) || 0) / totalEvents) * 100) : 0,
        color: device === 'Desktop' ? '#8b5cf6' : 
               device === 'Mobile' ? '#a855f7' : 
               '#c084fc'
      }));
      
      // Growth data - compare months
      const growth = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthEvents = data.filter((e: any) => {
          const eventDate = new Date(e.created_at);
          return eventDate.getMonth() === monthDate.getMonth() &&
                 eventDate.getFullYear() === monthDate.getFullYear();
        }).length;
        
        growth.push({
          month: monthName,
          crescimento: monthEvents,
          meta: Math.round(monthEvents * 1.2) // Meta 20% higher
        });
      }
      
      // Set all chart data - always use real data
      setTrafficData(traffic);
      setSourceData(sources.length > 0 ? sources : [
        { name: 'No data yet', value: 100, color: '#8b5cf6' }
      ]);
      setDeviceData(devices);
      // Sempre atualiza growthData (agora já tem fallback para dados demo)
      setGrowthData(growth);
      console.log('🔴 processAnalyticsData - growth data:', growth);
    };
  
  // Atualizar verificações a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      checkVerifiedEvents();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [currentProject, checkVerifiedEvents]);
  
  // useEffect principal para buscar dados e configurar realtime
  useEffect(() => {
    fetchAnalyticsData();
    
    // DEMO: Simular realtime updates
    if (currentProject?.id) {
      console.log('✅ Using centralized RealtimeProvider for Analytics');
      
      const handleRealtimeUpdate = (event: any) => {
        console.log('🔥 REALTIME EVENT via Provider - Updating ALL components!', event.detail);
        
        // Recarregar TODOS os dados quando novo evento chegar
        fetchAnalyticsData();
        
        // Incrementar refreshTrigger para atualizar o Globe
        console.log('🌍 Incrementing refreshTrigger for Globe update');
        setRefreshTrigger(prev => {
          console.log('📈 refreshTrigger changing from', prev, 'to', prev + 1);
          return prev + 1;
        });
        
        // SOLUTION: Multiple force update mechanisms
        // 1. Emit global event to force Globe update
        console.log('📡 Emitting global globe refresh event');
        globeEventEmitter.emitRefresh();
        
        // 2. Call imperative refresh method
        if (globeRef.current) {
          console.log('💪 Calling imperative Globe refresh');
          globeRef.current.forceUpdate();
        }
        
        // 3. Dispatch window custom event as fallback
        console.log('🪟 Dispatching window custom event');
        window.dispatchEvent(new CustomEvent('globe-force-update', { 
          detail: { timestamp: Date.now(), source: 'realtime-provider' } 
        }));
        
        // Forçar atualização dos componentes
        checkVerifiedEvents();
      };
      
      // Demo: simular eventos a cada 5-10 segundos
      const interval = setInterval(() => {
        handleRealtimeUpdate({ detail: generateSingleDemoEvent() });
      }, 5000 + Math.random() * 5000);
      
      // Cleanup
      return () => {
        clearInterval(interval);
      };
    }
    
    // COMENTADO PARA DEMO - Não precisa de realtime
    /*
    // FALLBACK: Se o provider não estiver conectado, usar subscription própria
    let realtimeChannel: any = null;
    
    if (currentProject?.id && !isConnected) {
      console.log('⚠️ RealtimeProvider not connected, creating own subscription for Analytics');
      
      // DEMO: código comentado
      /* realtimeChannel = supabase
        .channel(`analytics-page-${currentProject.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'analytics',
            filter: `project_id=eq.${currentProject.id}`
          },
          (payload: any) => {
            console.log('🔥 REALTIME EVENT RECEIVED - Updating ALL components!', payload.new);
            
            // Recarregar TODOS os dados quando novo evento chegar
            fetchAnalyticsData();
            
            // Incrementar refreshTrigger para atualizar o Globe
            console.log('🌍 Incrementing refreshTrigger for Globe update');
            setRefreshTrigger(prev => {
              console.log('📈 refreshTrigger changing from', prev, 'to', prev + 1);
              return prev + 1;
            });
            
            // SOLUTION: Multiple force update mechanisms
            // 1. Emit global event to force Globe update
            console.log('📡 Emitting global globe refresh event');
            globeEventEmitter.emitRefresh();
            
            // 2. Call imperative refresh method
            if (globeRef.current) {
              console.log('💪 Calling imperative Globe refresh');
              globeRef.current.forceUpdate();
            }
            
            // 3. Dispatch window custom event as fallback
            console.log('🪟 Dispatching window custom event');
            window.dispatchEvent(new CustomEvent('globe-force-update', { 
              detail: { timestamp: Date.now(), source: 'realtime' } 
            }));
            
            // Forçar atualização dos componentes
            checkVerifiedEvents();
          }
        )
        .subscribe((status: string) => {
          console.log('📡 Analytics Realtime Status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Analytics page subscribed to realtime updates!');
          }
        });
    }
    
    // Cleanup
    return () => {
      if (realtimeChannel) {
        console.log('🔌 Unsubscribing from Analytics realtime');
        // supabase.removeChannel(realtimeChannel);
      }
    };
    */
  }, [period, currentProject, fetchAnalyticsData]);

  // Calcular dados de conversão e engajamento
  useEffect(() => {
    const calculateConversionData = async () => {
      // Se não há dados, os dados demo já foram definidos em generateDemoData()
      console.log('🔍 calculateConversionData:', {
        hasProject: !!currentProject?.id,
        analyticsLength: analyticsData.length,
        hasData,
        willProcess: currentProject?.id && analyticsData.length > 0 && hasData
      });
      
      if (!currentProject?.id || analyticsData.length === 0 || !hasData) return;
      
      // Calcular funil de engajamento baseado em visitantes únicos
      const uniqueVisitors = new Set(analyticsData.map(d => d.visitor_id)).size;
      
      // Visitantes engajados: aqueles com alto scroll, tempo, clicks ou ações de e-commerce
      const engagedVisitorIds = new Set(
        analyticsData.filter(d => 
          (d.scroll_depth && d.scroll_depth > 50) || 
          (d.time_on_page && d.time_on_page > 30) ||
          d.event_type === 'click' ||
          d.event_type === 'add_to_cart' ||
          d.event_type === 'video_play' ||
          d.event_type === 'form_submit' ||
          d.event_type === 'checkout_started'
        ).map(d => d.visitor_id)
      );
      const engagedVisitors = engagedVisitorIds.size;
      
      // Visitantes convertidos: aqueles que fizeram purchase OU clicaram em CTAs específicos
      const convertedVisitorIds = new Set(
        analyticsData.filter(d => 
          d.event_type === 'purchase' || // Incluir compras diretas
          d.event_type === 'checkout_started' || // Incluir início de checkout
          (d.click_target && (
            d.click_target.toLowerCase().includes('signup') ||
            d.click_target.toLowerCase().includes('start') ||
            d.click_target.toLowerCase().includes('buy') ||
            d.click_target.toLowerCase().includes('contact')
          ))
        ).map(d => d.visitor_id)
      );
      const convertedVisitors = convertedVisitorIds.size;
      
      console.log('📊 Funnel calculation:', {
        uniqueVisitors,
        engagedVisitors,
        convertedVisitors,
        engagedIds: Array.from(engagedVisitorIds),
        convertedIds: Array.from(convertedVisitorIds)
      });
      
      setFunnelData([
        { name: 'Visited', value: uniqueVisitors, percentage: '100%' },
        { name: 'Engaged', value: engagedVisitors, percentage: uniqueVisitors > 0 ? `${Math.round((engagedVisitors/uniqueVisitors)*100)}%` : '0%' },
        { name: 'Converted', value: convertedVisitors, percentage: uniqueVisitors > 0 ? `${Math.round((convertedVisitors/uniqueVisitors)*100)}%` : '0%' }
      ]);
      
      // Calcular qualidade da visita
      const avgTimeOnPage = analyticsData.filter(d => d.time_on_page).reduce((sum, d) => sum + (d.time_on_page || 0), 0) / (analyticsData.filter(d => d.time_on_page).length || 1);
      const avgScrollDepth = analyticsData.filter(d => d.scroll_depth).reduce((sum, d) => sum + (d.scroll_depth || 0), 0) / (analyticsData.filter(d => d.scroll_depth).length || 1);
      const totalClicks = analyticsData.filter(d => d.event_type === 'click').length;
      const clickRate = uniqueVisitors > 0 ? (totalClicks / uniqueVisitors) * 100 : 0;
      
      // Calcular páginas por sessão
      const sessions = Array.from(new Set(analyticsData.map(d => d.session_id)));
      const totalPages = analyticsData.filter(d => d.event_type === 'pageview').length;
      const pagesPerSession = sessions.length > 0 ? totalPages / sessions.length : 0;
      
      // Calcular taxa de retorno
      const uniqueVisitorIds = Array.from(new Set(analyticsData.map(d => d.visitor_id)));
      const returningVisitors = uniqueVisitorIds.filter(vid => 
        analyticsData.filter(d => d.visitor_id === vid).length > 1
      ).length;
      const returnRate = uniqueVisitorIds.length > 0 ? (returningVisitors / uniqueVisitorIds.length) * 100 : 0;
      
      setQualityData([
        { metric: 'Time on Page', value: Math.min(100, Math.round((avgTimeOnPage / 60) * 20)) }, // Normalizado para 100
        { metric: 'Scroll Depth', value: Math.round(avgScrollDepth) },
        { metric: 'Interactions', value: Math.min(100, Math.round(clickRate * 10)) }, // Normalizado
        { metric: 'Pages/Session', value: Math.min(100, Math.round(pagesPerSession * 20)) }, // Normalizado
        { metric: 'Return Rate', value: Math.round(returnRate) }
      ]);
      
      // Calcular taxa de retorno para o gráfico de pizza
      const newVisitorPercentage = Math.round((1 - returnRate/100) * 100);
      const returningPercentage = Math.round(returnRate);
      
      setReturnRateData([
        { name: 'New Visitors', value: newVisitorPercentage, color: '#8b5cf6' },
        { name: 'Returning', value: returningPercentage, color: '#c084fc' }
      ]);
    };
    
    calculateConversionData();
  }, [analyticsData, currentProject, hasData]);

  // Formatar valores dos dados reais
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatChange = (change: number) => {
    if (!change || isNaN(change)) return '0%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const metrics = [
    {
      title: 'Organic Traffic',
      value: formatNumber(metricsData.organicTraffic),
      change: formatChange(metricsData.organicChange),
      positive: metricsData.organicChange >= 0,
      description: 'vs. last month',
      icon: <IconComponent icon={FaIcons.FaSearch} />,
      color: '#22d3ee',
      trend: metricsData.organicChange >= 0 ? 'up' as const : 'down' as const
    },
    {
      title: 'Unique Users',
      value: formatNumber(metricsData.uniqueUsers),
      change: formatChange(metricsData.usersChange),
      positive: metricsData.usersChange >= 0,
      description: 'unique visitors',
      icon: <IconComponent icon={FaIcons.FaUsers} />,
      color: '#a855f7',
      trend: metricsData.usersChange >= 0 ? 'up' as const : 'down' as const
    },
    {
      title: 'Conversion Rate',
      value: `${metricsData.conversionRate.toFixed(1)}%`,
      change: formatChange(metricsData.conversionChange),
      positive: metricsData.conversionChange >= 0,
      description: 'from organic traffic',
      icon: <IconComponent icon={FaIcons.FaRocket} />,
      color: '#8b5cf6',
      trend: metricsData.conversionChange >= 0 ? 'up' as const : 'down' as const
    },
    {
      title: 'Avg. Time',
      value: formatTime(metricsData.avgTime),
      change: metricsData.timeChange !== 0 ? `${metricsData.timeChange > 0 ? '+' : ''}${Math.round(metricsData.timeChange)}s` : '0s',
      positive: metricsData.timeChange >= 0,
      description: 'on page',
      icon: <IconComponent icon={FaIcons.FaClock} />,
      color: '#10b981',
      trend: metricsData.timeChange >= 0 ? 'up' as const : 'down' as const
    }
  ];

  // Copy to clipboard function
  const handleCopyCode = () => {
    navigator.clipboard.writeText(analyticsScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Analytics script is now fetched from database above

  return (
    <Container>
      
      <Header>
        <Title>
          <IconComponent icon={FaIcons.FaChartLine} />
          Organic Traffic Analytics
        </Title>
      </Header>

      {/* Globo 3D de visitantes online */}
      <GlobeVisualizationPro
        ref={globeRef}
        projectId={58} 
        supabase={null}
        refreshTrigger={refreshTrigger}
      />

      {/* Tag Connection Status - Compact version below globe */}
      {tagStatus.connected && (
        <TagStatusCard 
          $connected={tagStatus.connected} 
          style={{ 
            marginTop: '24px', 
            marginBottom: '20px',
            padding: '12px 20px',
            background: theme.name === 'dark' 
              ? 'rgba(139, 92, 246, 0.05)'
              : 'rgba(139, 92, 246, 0.03)',
            border: `1px solid ${theme.name === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'}`,
            borderRadius: '12px'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TagStatusIcon 
                $connected={tagStatus.connected} 
                style={{ fontSize: '18px', color: '#8b5cf6' }}
              >
                <IconComponent icon={FaIcons.FaCheckCircle} />
              </TagStatusIcon>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600,
                color: '#8b5cf6'
              }}>
                Tag Connected
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: theme.colors.text.secondary,
                opacity: 0.8
              }}>
                Last seen: {tagStatus.lastSeen ? new Date(tagStatus.lastSeen).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '24px',
              alignItems: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 700,
                  color: theme.colors.text.primary
                }}>
                  {tagStatus.totalEvents24h}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: theme.colors.text.secondary,
                  opacity: 0.7,
                  marginTop: '2px'
                }}>
                  Total Events (24h)
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 700,
                  color: theme.colors.text.primary
                }}>
                  {tagStatus.pageviews24h}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: theme.colors.text.secondary,
                  opacity: 0.7,
                  marginTop: '2px'
                }}>
                  Page Views (24h)
                </div>
              </div>
              
            </div>
          </div>
        </TagStatusCard>
      )}

      {!hasData && (
        <>
          <DemoDataBadge>
            <IconComponent icon={FaIcons.FaInfoCircle} />
            Demonstration Data - Install tracking tag to see real data
          </DemoDataBadge>
          
          <NoDataAlert
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AlertIcon>
              <IconComponent icon={FaIcons.FaChartLine} />
            </AlertIcon>
            <AlertTitle>Start Tracking Your Growth!</AlertTitle>
            <AlertText>
              Add the Liftlio tracking tag to your website to start measuring your organic traffic growth. 
              Once installed, you'll see real-time analytics about your visitors, traffic sources, and conversion rates.
            </AlertText>
            <AlertButton onClick={() => {
              const element = document.getElementById('implementation-guide');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <IconComponent icon={FaIcons.FaRocket} />
              Install Tracking Tag
            </AlertButton>
          </NoDataAlert>
        </>
      )}

      {hasData && (
        <InsightCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <InsightTitle>
            <IconComponent icon={FaIcons.FaGem} /> Liftlio Insight
          </InsightTitle>
          <InsightText>
            {metricsData.organicChange > 0 ? (
              <>
                Your organic traffic grew {metricsData.organicChange.toFixed(0)}% this month! 
                You have {metricsData.uniqueUsers} unique visitors with a {metricsData.conversionRate.toFixed(1)}% conversion rate. 
                Keep optimizing your content to reach even better results.
              </>
            ) : metricsData.uniqueUsers > 0 ? (
              <>
                You have {metricsData.uniqueUsers} unique visitors this month with {metricsData.organicTraffic} organic traffic events. 
                Your conversion rate is {metricsData.conversionRate.toFixed(1)}%. 
                Keep monitoring your metrics to track growth trends.
              </>
            ) : (
              <>
                Start tracking your website performance! 
                Once you have more data, you'll see insights about your organic traffic growth, 
                unique visitors, and conversion rates.
              </>
            )}
          </InsightText>
        </InsightCard>
      )}

      <MetricsGrid>
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            trend={metric.trend}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <MetricHeader>
              <div>
                <MetricTitle>
                  {metric.title}
                  {!hasData && (
                    <span 
                      title="Real data will appear once the tracking tag is installed"
                      style={{ 
                        marginLeft: '8px',
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        borderRadius: '4px',
                        color: '#8b5cf6',
                        fontWeight: 600,
                        verticalAlign: 'middle',
                        display: 'inline-block',
                        cursor: 'help'
                      }}
                    >
                      DEMO
                    </span>
                  )}
                </MetricTitle>
                <MetricValue>{metric.value}</MetricValue>
                <MetricChange positive={metric.positive}>
                  {metric.positive ? <IconComponent icon={FaIcons.FaArrowUp} /> : <IconComponent icon={FaIcons.FaArrowDown} />}
                  {metric.change}
                  <MetricDescription>{metric.description}</MetricDescription>
                </MetricChange>
              </div>
              <MetricIcon color={metric.color}>
                {metric.icon}
              </MetricIcon>
            </MetricHeader>
          </MetricCard>
        ))}
      </MetricsGrid>

      <ChartSection>
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartLine} /> Traffic Growth
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo Data</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trafficData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorLiftlio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#fb923c" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorDirect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e9d5ff" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#e9d5ff" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke={chartColors.grid} vertical={false} opacity={0.1} />
              <XAxis 
                dataKey="date" 
                stroke={chartColors.text}
                tick={{ fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: chartColors.grid, strokeWidth: 0.5 }}
                dy={10}
              />
              <YAxis 
                stroke={chartColors.text}
                tick={{ fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dx={-5}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(17, 24, 39, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: theme.name === 'dark' 
                    ? '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 1px rgba(139, 92, 246, 0.5)'
                    : '0 10px 40px rgba(0, 0, 0, 0.1), 0 0 1px rgba(139, 92, 246, 0.3)',
                  color: theme.colors.text.primary,
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: 500
                }}
                formatter={(value: number) => [`${value.toLocaleString()} visits`, '']}
                labelStyle={{ fontWeight: 600, marginBottom: 8 }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Area 
                type="monotone" 
                dataKey="direct" 
                stackId="1"
                stroke="transparent" 
                fillOpacity={1} 
                fill="url(#colorDirect)" 
                strokeWidth={0}
                name="Direct"
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="social" 
                stackId="1"
                stroke="transparent" 
                fillOpacity={1} 
                fill="url(#colorSocial)" 
                strokeWidth={0}
                name="Social Media"
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="ads" 
                stackId="1"
                stroke="transparent" 
                fillOpacity={1} 
                fill="url(#colorAds)" 
                strokeWidth={0}
                name="Paid Ads"
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="liftlio" 
                stackId="1"
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorLiftlio)" 
                strokeWidth={2}
                name="Liftlio Organic"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
          <ChartLegend>
            <LegendItem>
              <LegendDot color="#8b5cf6" />
              <span><strong>Liftlio Organic</strong> - SEO optimized traffic</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#fb923c" />
              <span><strong>Paid Ads</strong> - Sponsored Traffic</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#3b82f6" />
              <span><strong>Social Media</strong> - Social networks</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#e9d5ff" />
              <span><strong>Direct</strong> - Direct visits</span>
            </LegendItem>
          </ChartLegend>
        </ChartCard>
      </ChartSection>

      <SecondaryChartsGrid>
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartPie} /> Traffic Sources
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartBar} /> Growth vs Target
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
              />
              <Bar dataKey="crescimento" fill={chartColors.primary} name="Actual Growth" />
              <Line 
                type="monotone" 
                dataKey="meta" 
                stroke={chartColors.accent} 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaMobile} /> Devices
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
              />
              <Bar dataKey="users" fill={chartColors.primary} name="Users" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sessions" fill={chartColors.accent} name="Sessions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SecondaryChartsGrid>

      {/* Nova Seção de Conversão e Engajamento */}
      <div style={{ marginTop: '40px', marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '700',
          color: chartColors.primary,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <IconComponent icon={FaIcons.FaChartLine} />
          Conversion & Engagement
        </h2>
        
        <SecondaryChartsGrid>
          {/* Gráfico 1: Funil de Engajamento */}
          <ChartCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ChartHeader>
              <ChartTitle>
                <IconComponent icon={FaIcons.FaFilter} style={{ color: chartColors.primary }} />
                Engagement Funnel
              </ChartTitle>
              {!hasData && <DemoIndicator>Demo</DemoIndicator>}
            </ChartHeader>
            <div style={{ padding: '20px 10px', height: '250px' }}>
              {funnelData.map((item, index) => {
                const maxValue = Math.max(...funnelData.map(d => d.value));
                const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                const colors = ['#8b5cf6', '#a855f7', '#c084fc'];
                
                return (
                  <div key={item.name} style={{ marginBottom: '25px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        color: theme.colors.text.secondary,
                        fontSize: '13px',
                        fontWeight: 500,
                        minWidth: '80px'
                      }}>
                        {item.name}
                      </span>
                      <span style={{ 
                        color: theme.colors.text.primary,
                        fontSize: '14px',
                        fontWeight: 600
                      }}>
                        {item.value.toLocaleString()} users ({item.percentage})
                      </span>
                    </div>
                    <div style={{ 
                      background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '6px',
                      height: '32px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        style={{ 
                          background: `linear-gradient(90deg, ${colors[index]}, ${colors[index]}dd)`,
                          height: '100%',
                          borderRadius: '6px',
                          boxShadow: `0 2px 8px ${colors[index]}40`,
                          position: 'relative'
                        }}
                      >
                        {barWidth > 20 && (
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}>
                            {item.value}
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {/* Gráfico 2: Qualidade da Visita (Gauge) */}
          <ChartCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ChartHeader>
              <ChartTitle>
                <IconComponent icon={FaIcons.FaTachometerAlt} style={{ color: chartColors.primary }} />
                Visit Quality Score
              </ChartTitle>
              {!hasData && <DemoIndicator>Demo</DemoIndicator>}
            </ChartHeader>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={qualityData}>
                <PolarGrid stroke={chartColors.grid} />
                <PolarAngleAxis dataKey="metric" stroke={chartColors.text} tick={{ fontSize: 10 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  stroke={chartColors.text}
                  tick={{ fontSize: 10 }}
                />
                <Radar 
                  name="Score" 
                  dataKey="value" 
                  stroke={chartColors.primary} 
                  fill={chartColors.primary} 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Score']}
                  contentStyle={{
                    backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${chartColors.primary}`,
                    borderRadius: '12px',
                    padding: '10px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Gráfico 3: Taxa de Retorno */}
          <ChartCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <ChartHeader>
              <ChartTitle>
                <IconComponent icon={FaIcons.FaUserClock} style={{ color: chartColors.primary }} />
                Return Rate
              </ChartTitle>
              {!hasData && <DemoIndicator>Demo</DemoIndicator>}
            </ChartHeader>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={returnRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={chartColors.primary} />
                  <Cell fill={chartColors.accent} />
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, '']}
                  contentStyle={{
                    backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${chartColors.primary}`,
                    borderRadius: '12px',
                    padding: '10px'
                  }}
                />
                <text 
                  x="50%" 
                  y="50%" 
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  style={{ fontSize: '24px', fontWeight: 'bold', fill: chartColors.primary }}
                >
                  {returnRateData[1]?.value || 0}%
                </text>
                <text 
                  x="50%" 
                  y="50%" 
                  dy={20}
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  style={{ fontSize: '12px', fill: chartColors.text }}
                >
                  Returning
                </text>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '20px', 
              marginTop: '10px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: chartColors.primary,
                  borderRadius: '2px'
                }} />
                <span>New ({returnRateData[0]?.value || 0}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: chartColors.accent,
                  borderRadius: '2px'
                }} />
                <span>Returning ({returnRateData[1]?.value || 0}%)</span>
              </div>
            </div>
          </ChartCard>
        </SecondaryChartsGrid>
      </div>

      <TagImplementation id="implementation-guide">
        <TagTitle 
          clickable={tagStatus.connected}
          onClick={() => {
            if (tagStatus.connected) {
              // Marcar que usuário expandiu manualmente
              if (implementationCollapsed) {
                setUserHasExpanded(true);
              }
              setImplementationCollapsed(!implementationCollapsed);
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconComponent icon={FaIcons.FaCode} /> Implementation Guide
          </div>
          {tagStatus.connected && (
            <CollapseIcon collapsed={implementationCollapsed}>
              <IconComponent icon={FaIcons.FaChevronDown} />
            </CollapseIcon>
          )}
        </TagTitle>
        
        <CollapsibleContent collapsed={tagStatus.connected ? implementationCollapsed : false}>
          <ImplementationSteps>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <StepTitle>Copy the tracking code</StepTitle>
              <StepDescription>
                Click the "Copy Code" button below to copy your unique Liftlio tracking script to your clipboard.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <StepTitle>Open your website's HTML</StepTitle>
              <StepDescription>
                Access your website's HTML file or content management system. If you're using WordPress, 
                go to Appearance → Theme Editor → header.php. For other platforms, locate your main HTML template.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>3</StepNumber>
            <StepContent>
              <StepTitle>Paste before the closing &lt;/head&gt; tag</StepTitle>
              <StepDescription>
                Find the &lt;/head&gt; tag in your HTML and paste the tracking code right before it. 
                This ensures the script loads on every page of your website.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>4</StepNumber>
            <StepContent>
              <StepTitle>Save and verify</StepTitle>
              <StepDescription>
                Save your changes and visit your website. The tracking will start automatically within 5 minutes. 
                You can verify it's working by checking the Analytics dashboard for real-time data.
              </StepDescription>
            </StepContent>
          </Step>
        </ImplementationSteps>

        <CodeContainer>
          <CodeBlock>{analyticsScript || 'Loading...'}</CodeBlock>
          <CopyButton onClick={handleCopyCode}>
            {copied ? (
              <>
                <IconComponent icon={FaIcons.FaCheck} />
                Copied!
              </>
            ) : (
              <>
                <IconComponent icon={FaIcons.FaCopy} />
                Copy Code
              </>
            )}
          </CopyButton>
        </CodeContainer>
        
        {copied && (
          <SuccessMessage>
            <IconComponent icon={FaIcons.FaCheckCircle} />
            Code copied successfully! Now paste it into your website's HTML.
          </SuccessMessage>
        )}
        </CollapsibleContent>
      </TagImplementation>

      {/* Nova Seção: Guia Avançado de Rastreamento */}
      <AdvancedSection>
        <AdvancedTitle 
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => setAdvancedCollapsed(!advancedCollapsed)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconComponent icon={FaIcons.FaRocket} /> Advanced Tracking Guide
            <HelpTooltip>
              <IconComponent icon={FaQuestionCircle} />
              <TooltipContent>
                These tracking features require the main Liftlio tag to be installed first. 
                The tag creates the 'liftlio' object that these events use.
              </TooltipContent>
            </HelpTooltip>
          </div>
          <CollapseIcon collapsed={advancedCollapsed}>
            <IconComponent icon={FaIcons.FaChevronDown} />
          </CollapseIcon>
        </AdvancedTitle>
        
        <CollapsibleContent collapsed={advancedCollapsed}>
          <AdvancedSubtitle>
            Track specific user actions like purchases, cart additions, and form submissions. 
            Choose what you want to track and add simple code snippets to your site.
          </AdvancedSubtitle>
        
        {/* Status Summary dos Eventos */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap', 
          marginBottom: '20px',
          padding: '16px',
          background: theme.name === 'dark' ? 'rgba(139, 92, 246, 0.03)' : 'rgba(139, 92, 246, 0.02)',
          borderRadius: '12px',
          border: `1px solid ${theme.name === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)'}`
        }}>
          <div style={{ width: '100%', marginBottom: '12px', fontWeight: 600, color: theme.colors.primary }}>
            📊 Event Implementation Status:
          </div>
          <VerifiedBadge $verified={verifiedEvents.includes('add_to_cart')}>
            <IconComponent icon={FaIcons.FaShoppingCart} />
            Add to Cart {verifiedEvents.includes('add_to_cart') ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.includes('checkout_start')}>
            <IconComponent icon={FaIcons.FaCreditCard} />
            Checkout {verifiedEvents.includes('checkout_start') ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.includes('purchase')}>
            <IconComponent icon={FaIcons.FaCheckCircle} />
            Purchase {verifiedEvents.includes('purchase') ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.includes('product_view')}>
            <IconComponent icon={FaIcons.FaEye} />
            Product View {verifiedEvents.includes('product_view') ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.includes('form_submit')}>
            <IconComponent icon={FaIcons.FaEnvelope} />
            Form Submit {verifiedEvents.includes('form_submit') ? '✓' : '✗'}
          </VerifiedBadge>
        </div>

        <ImportantNote>
          <IconComponent icon={FaIcons.FaExclamationTriangle} />
          <NoteContent>
            <NoteTitle>⚠️ Prerequisites: Main Tracking Tag Required!</NoteTitle>
            <NoteText>
              Before using any of these advanced tracking features, you MUST have the main Liftlio tracking tag 
              installed on your website:
              <br/><br/>
              <code style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', display: 'block' }}>
                {analyticsScript || `<script async src="https://track.liftlio.com/t.js" data-id="${currentProject?.id || 'YOUR_PROJECT_ID'}"></script>`}
              </code>
              <br/>
              This tag creates the <code>window.liftlio</code> object that all these events depend on. 
              Without it, none of these tracking events will work. Install the main tag first using the guide above!
            </NoteText>
          </NoteContent>
        </ImportantNote>

        <AccordionContainer>
          {/* Accordion 1: E-commerce Events */}
          <AccordionItem>
            <AccordionHeader 
              onClick={() => setOpenAccordion(openAccordion === 'ecommerce' ? null : 'ecommerce')}
              isOpen={openAccordion === 'ecommerce'}
            >
              <AccordionTitle>
                <IconComponent icon={FaIcons.FaShoppingCart} />
                E-commerce Tracking (Cart, Checkout, Purchase)
              </AccordionTitle>
              <AccordionIcon $isOpen={openAccordion === 'ecommerce'}>
                <IconComponent icon={FaIcons.FaChevronDown} />
              </AccordionIcon>
            </AccordionHeader>
            
            <AnimatePresence>
              {openAccordion === 'ecommerce' && (
                <AccordionContent
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaCartPlus} /> 
                      Add to Cart
                      <VerifiedBadge $verified={verifiedEvents.includes('add_to_cart')}>
                        <IconComponent icon={verifiedEvents.includes('add_to_cart') ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.includes('add_to_cart') ? 'Verified' : 'Not Implemented'}
                      </VerifiedBadge>
                      <HelpTooltip>
                        <IconComponent icon={FaQuestionCircle} />
                        <TooltipContent>
                          Add this code directly to your button's onclick attribute, 
                          or call it from your existing JavaScript function.
                        </TooltipContent>
                      </HelpTooltip>
                    </EventTitle>
                    <EventDescription>
                      Track when users add products to their shopping cart. Add this code to your "Add to Cart" button:
                    </EventDescription>
                    <EventCode>
                      {`onclick="liftlio.trackEvent('add_to_cart', {
  product_id: '123',
  product_name: 'Product Name',
  price: 99.90,
  quantity: 1
})"`}
                    </EventCode>
                  </EventExample>

                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaCreditCard} /> 
                      Start Checkout
                      <VerifiedBadge $verified={verifiedEvents.includes('checkout_start')}>
                        <IconComponent icon={verifiedEvents.includes('checkout_start') ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.includes('checkout_start') ? 'Verified' : 'Not Implemented'}
                      </VerifiedBadge>
                    </EventTitle>
                    <EventDescription>
                      Track when users begin the checkout process. Add this to your "Checkout" button:
                    </EventDescription>
                    <EventCode>
                      {`onclick="liftlio.trackEvent('checkout_start', {
  cart_value: 299.80,
  items_count: 3
})"`}
                    </EventCode>
                  </EventExample>

                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaCheckCircle} /> 
                      Purchase Complete
                      <VerifiedBadge $verified={verifiedEvents.includes('purchase')}>
                        <IconComponent icon={verifiedEvents.includes('purchase') ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.includes('purchase') ? 'Verified' : 'Not Implemented'}
                      </VerifiedBadge>
                      <HelpTooltip>
                        <IconComponent icon={FaQuestionCircle} />
                        <TooltipContent>
                          Add this script to your order confirmation/thank you page. 
                          It should run after the payment is confirmed.
                        </TooltipContent>
                      </HelpTooltip>
                    </EventTitle>
                    <EventDescription>
                      Track successful purchases. Add this code to your "Thank You" page:
                    </EventDescription>
                    <EventCode>
                      {`<script>
// Make sure Liftlio is loaded first
if (window.liftlio) {
  liftlio.trackPurchase('ORDER-123', 299.80, [
    {id: '123', name: 'Product A', price: 99.90, qty: 2},
    {id: '456', name: 'Product B', price: 100.00, qty: 1}
  ]);
}
</script>`}
                    </EventCode>
                  </EventExample>
                </AccordionContent>
              )}
            </AnimatePresence>
          </AccordionItem>

          {/* Accordion 2: User Engagement */}
          <AccordionItem>
            <AccordionHeader 
              onClick={() => setOpenAccordion(openAccordion === 'engagement' ? null : 'engagement')}
              isOpen={openAccordion === 'engagement'}
            >
              <AccordionTitle>
                <IconComponent icon={FaIcons.FaMousePointer} />
                User Engagement (Forms, Videos, Downloads)
              </AccordionTitle>
              <AccordionIcon $isOpen={openAccordion === 'engagement'}>
                <IconComponent icon={FaIcons.FaChevronDown} />
              </AccordionIcon>
            </AccordionHeader>
            
            <AnimatePresence>
              {openAccordion === 'engagement' && (
                <AccordionContent
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaEnvelope} /> 
                      Form Submission
                      <VerifiedBadge $verified={verifiedEvents.includes('form_submit')}>
                        <IconComponent icon={verifiedEvents.includes('form_submit') ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.includes('form_submit') ? 'Verified' : 'Not Implemented'}
                      </VerifiedBadge>
                      <HelpTooltip>
                        <IconComponent icon={FaQuestionCircle} />
                        <TooltipContent>
                          Add to your form tag's onsubmit attribute. 
                          Make sure to include 'return true;' to allow form submission.
                        </TooltipContent>
                      </HelpTooltip>
                    </EventTitle>
                    <EventDescription>
                      Track form submissions (contact, newsletter, quote). Add to your form's onsubmit:
                    </EventDescription>
                    <EventCode>
                      {`onsubmit="liftlio.trackEvent('form_submit', {
  form_type: 'contact',
  form_id: 'header-contact'
})"`}
                    </EventCode>
                  </EventExample>

                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaPlay} /> 
                      Video Interaction
                    </EventTitle>
                    <EventDescription>
                      Track video plays and engagement. Add to your video player:
                    </EventDescription>
                    <EventCode>
                      {`onplay="liftlio.trackEvent('video_play', {
  video_id: 'demo-video',
  video_title: 'Product Demo',
  duration: 120
})"`}
                    </EventCode>
                  </EventExample>

                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaDownload} /> 
                      File Download
                    </EventTitle>
                    <EventDescription>
                      Track PDF, eBook, or resource downloads. Add to download links:
                    </EventDescription>
                    <EventCode>
                      {`onclick="liftlio.trackEvent('download', {
  file_name: 'guide.pdf',
  file_type: 'PDF',
  category: 'Resources'
})"`}
                    </EventCode>
                  </EventExample>
                </AccordionContent>
              )}
            </AnimatePresence>
          </AccordionItem>

          {/* Accordion 3: Platform-Specific Implementation */}
          <AccordionItem>
            <AccordionHeader 
              onClick={() => setOpenAccordion(openAccordion === 'platforms' ? null : 'platforms')}
              isOpen={openAccordion === 'platforms'}
            >
              <AccordionTitle>
                <IconComponent icon={FaIcons.FaCode} />
                Platform-Specific Setup (WordPress, React, Shopify)
              </AccordionTitle>
              <AccordionIcon $isOpen={openAccordion === 'platforms'}>
                <IconComponent icon={FaIcons.FaChevronDown} />
              </AccordionIcon>
            </AccordionHeader>
            
            <AnimatePresence>
              {openAccordion === 'platforms' && (
                <AccordionContent
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabButtons>
                    <TabButton 
                      active={activeTab === 'wordpress'}
                      onClick={() => setActiveTab('wordpress')}
                    >
                      WordPress
                    </TabButton>
                    <TabButton 
                      active={activeTab === 'react'}
                      onClick={() => setActiveTab('react')}
                    >
                      React/Next.js
                    </TabButton>
                    <TabButton 
                      active={activeTab === 'shopify'}
                      onClick={() => setActiveTab('shopify')}
                    >
                      Shopify
                    </TabButton>
                    <TabButton 
                      active={activeTab === 'html'}
                      onClick={() => setActiveTab('html')}
                    >
                      Pure HTML
                    </TabButton>
                  </TabButtons>

                  <AnimatePresence mode="wait">
                    {activeTab === 'wordpress' && (
                      <TabContent
                        key="wordpress"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <EventTitle>
                          <IconComponent icon={FaIcons.FaWordpress} /> 
                          WordPress / WooCommerce Setup
                        </EventTitle>
                        <EventDescription>
                          Add to your theme's functions.php file:
                        </EventDescription>
                        <EventCode>
{`// Track product views
add_action('woocommerce_after_single_product', function() {
    global $product;
    ?>
    <script>
    if(window.liftlio) {
        liftlio.trackEvent('product_view', {
            product_id: '<?php echo $product->get_id(); ?>',
            product_name: '<?php echo esc_js($product->get_name()); ?>',
            price: <?php echo $product->get_price(); ?>
        });
    }
    </script>
    <?php
});`}
                        </EventCode>
                      </TabContent>
                    )}

                    {activeTab === 'react' && (
                      <TabContent
                        key="react"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <EventTitle>
                          <IconComponent icon={FaIcons.FaReact} /> 
                          React / Next.js Setup
                          <VerifiedBadge $verified={verifiedEvents.includes('product_view')}>
                            <IconComponent icon={verifiedEvents.includes('product_view') ? FaIcons.FaCheck : FaIcons.FaTimes} />
                            {verifiedEvents.includes('product_view') ? 'Product View Verified' : 'Product View Not Detected'}
                          </VerifiedBadge>
                        </EventTitle>
                        <EventDescription>
                          Add to your product component:
                        </EventDescription>
                        <EventCode>
{`// In your Product component
useEffect(() => {
  if (window.liftlio && product) {
    window.liftlio.trackEvent('product_view', {
      product_id: product.id,
      product_name: product.name,
      price: product.price
    });
  }
}, [product]);

// Add to Cart button
const handleAddToCart = () => {
  // Your cart logic...
  if (window.liftlio) {
    window.liftlio.trackEvent('add_to_cart', {
      product_id: product.id,
      price: product.price
    });
  }
};`}
                        </EventCode>
                      </TabContent>
                    )}

                    {activeTab === 'shopify' && (
                      <TabContent
                        key="shopify"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <EventTitle>
                          <IconComponent icon={FaIcons.FaShopify} /> 
                          Shopify Setup
                        </EventTitle>
                        <EventDescription>
                          Add to your theme.liquid file:
                        </EventDescription>
                        <EventCode>
{`{% if template contains 'product' %}
<script>
  if (window.liftlio) {
    liftlio.trackEvent('product_view', {
      product_id: '{{ product.id }}',
      product_name: '{{ product.title | escape }}',
      price: {{ product.price | divided_by: 100.0 }}
    });
  }
</script>
{% endif %}

{% if template contains 'thank-you' %}
<script>
  if (window.liftlio) {
    liftlio.trackPurchase(
      '{{ checkout.order_number }}',
      {{ checkout.total_price | divided_by: 100.0 }},
      []
    );
  }
</script>
{% endif %}`}
                        </EventCode>
                      </TabContent>
                    )}

                    {activeTab === 'html' && (
                      <TabContent
                        key="html"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <EventTitle>
                          <IconComponent icon={FaIcons.FaCode} /> 
                          Pure HTML/JavaScript
                        </EventTitle>
                        <EventDescription>
                          Add directly to your HTML elements:
                        </EventDescription>
                        <EventCode>
{`<!-- Add to Cart Button -->
<button onclick="
  addToCart(); // Your existing function
  liftlio.trackEvent('add_to_cart', {
    product_id: '123',
    price: 99.90
  });
">
  Add to Cart
</button>

<!-- On Product Page Load -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  if(window.liftlio) {
    liftlio.trackEvent('product_view', {
      product_id: '123',
      product_name: document.querySelector('h1').innerText,
      price: 99.90
    });
  }
});
</script>`}
                        </EventCode>
                      </TabContent>
                    )}
                  </AnimatePresence>
                </AccordionContent>
              )}
            </AnimatePresence>
          </AccordionItem>

          {/* Accordion 4: Testing & Verification */}
          <AccordionItem>
            <AccordionHeader 
              onClick={() => setOpenAccordion(openAccordion === 'testing' ? null : 'testing')}
              isOpen={openAccordion === 'testing'}
            >
              <AccordionTitle>
                <IconComponent icon={FaIcons.FaBug} />
                Testing & Verification
              </AccordionTitle>
              <AccordionIcon $isOpen={openAccordion === 'testing'}>
                <IconComponent icon={FaIcons.FaChevronDown} />
              </AccordionIcon>
            </AccordionHeader>
            
            <AnimatePresence>
              {openAccordion === 'testing' && (
                <AccordionContent
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaTerminal} /> 
                      Test in Browser Console
                      <HelpTooltip>
                        <IconComponent icon={FaQuestionCircle} />
                        <TooltipContent>
                          Press F12 to open Developer Tools, click Console tab, 
                          then paste these commands to test.
                        </TooltipContent>
                      </HelpTooltip>
                    </EventTitle>
                    <EventDescription>
                      Open your browser's Developer Console (F12) and test your tracking:
                    </EventDescription>
                    <EventCode>
{`// STEP 1: Check if main tag is installed
console.log(window.liftlio); // Should show an object, not undefined

// If undefined, the main tracking tag is NOT installed!

// STEP 2: Test tracking an event (only if step 1 works)
if (window.liftlio) {
  liftlio.trackEvent('test_event', {
    test: true,
    timestamp: new Date().toISOString()
  });
  console.log('Event sent! Check dashboard in 5 seconds');
} else {
  console.error('Liftlio not loaded! Install main tag first!');
}`}
                    </EventCode>
                  </EventExample>

                  <EventExample>
                    <EventTitle>
                      <IconComponent icon={FaIcons.FaCheckSquare} /> 
                      Verify in Dashboard
                    </EventTitle>
                    <EventDescription>
                      After implementing tracking, verify it's working:
                    </EventDescription>
                    <EventCode>
{`1. Go to your Analytics dashboard
2. Look for "Real-time" or recent events
3. Perform the action (add to cart, etc.)
4. Event should appear within 5-10 seconds
5. Check event_type and custom_data fields`}
                    </EventCode>
                  </EventExample>
                </AccordionContent>
              )}
            </AnimatePresence>
          </AccordionItem>
        </AccordionContainer>
        </CollapsibleContent>
      </AdvancedSection>
    </Container>
  );
};

export default AnalyticsDemo;