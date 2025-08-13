import React, { useState, useEffect } from 'react';
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
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import GlobeVisualizationPro from '../components/GlobeVisualizationPro';
import RealTimeInsights from '../components/RealTimeInsights';

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
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 1.5rem;
    color: ${props => props.theme.colors.primary};
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
    ? props.theme.colors.primary 
    : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.border};
  background: ${props => {
    if (props.active) {
      return props.theme.colors.primary;
    }
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
  }};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text.primary};
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
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
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
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
  color: ${props => props.theme.colors.text.secondary};
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
  background: ${props => props.color || props.theme.colors.primary};
  
  svg {
    font-size: 24px;
    color: white;
  }
`;

const MetricValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
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
  color: ${props => props.theme.colors.text.muted};
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
  border-top: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
`;

const LegendDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const ChartCard = styled(motion.div)`
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border-radius: 16px;
  padding: 24px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
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
`;

const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const ChartOptions = styled.div`
  display: flex;
  gap: 8px;
`;

const ChartOption = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  background: ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.background};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.textSecondary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
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
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
  border-radius: 16px;
  padding: 32px;
  margin-top: 32px;
`;

const TagTitle = styled.h3<{ clickable?: boolean }>`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
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
      color: ${props.theme.colors.primary};
    }
  `}

  svg {
    color: ${props => props.theme.colors.primary};
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
  color: ${props => props.theme.colors.text.secondary};
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
  background: ${props => props.theme.colors.primary};
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
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.6;
`;

const CodeContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;

const CodeBlock = styled.pre`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(0, 0, 0, 0.5)' 
    : '#1e293b'};
  color: ${props => props.theme.name === 'dark' 
    ? '#a0aec0' 
    : '#e2e8f0'};
  padding: 20px;
  padding-right: 60px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'transparent'};
  overflow-x: auto;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props => props.theme.colors.primary};
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
    background: ${props => props.theme.colors.primaryDark};
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
  border: 2px dashed ${props => props.theme.colors.primary};
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
  color: ${props => props.theme.colors.primary};
  margin-bottom: 16px;
`;

const AlertTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 12px;
`;

const AlertText = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 24px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
`;

const AlertButton = styled.button`
  background: ${props => props.theme.colors.primary};
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
    background: ${props => props.theme.colors.primaryDark};
    transform: translateY(-2px);
  }

  svg {
    font-size: 18px;
  }
`;

// Novos componentes para seção avançada
const AdvancedSection = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
  border-radius: 16px;
  padding: 32px;
  margin-top: 32px;
`;

const AdvancedTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 24px;
  }
`;

const AdvancedSubtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
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
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.05)'
    : 'rgba(139, 92, 246, 0.03)'};
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.15)'};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
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
    background: ${props => props.theme.name === 'dark'
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
  color: ${props => props.theme.colors.text.primary};
  text-align: left;

  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 20px;
  }
`;

const AccordionIcon = styled.div<{ $isOpen?: boolean }>`
  color: ${props => props.theme.colors.primary};
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
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const EventDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 12px;
`;

const EventCode = styled.div`
  background: ${props => props.theme.name === 'dark' 
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
    ? props.theme.colors.primary 
    : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.border};
  background: ${props => props.active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text.primary};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const TabContent = styled(motion.div)`
  padding: 20px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(0, 0, 0, 0.3)'
    : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.name === 'dark'
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
    color: ${props => props.theme.colors.primary};
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
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(17, 24, 39, 0.98)' 
    : 'rgba(255, 255, 255, 0.98)'};
  color: ${props => props.theme.colors.text.primary};
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
  max-width: 300px;
  white-space: normal;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.3)'
    : 'rgba(139, 92, 246, 0.2)'};
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  margin-bottom: 8px;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${props => props.theme.name === 'dark' 
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
    ? props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.15)'
      : 'rgba(139, 92, 246, 0.1)'
    : props.theme.name === 'dark'
      ? 'rgba(107, 114, 128, 0.15)'
      : 'rgba(107, 114, 128, 0.1)'
  };
  color: ${props => props.$verified 
    ? '#8b5cf6'
    : props.theme.colors.text.secondary
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
    ? props.theme.name === 'dark' 
      ? 'rgba(139, 92, 246, 0.03)'
      : 'rgba(139, 92, 246, 0.02)'
    : props.theme.name === 'dark'
      ? 'rgba(107, 114, 128, 0.05)'
      : 'rgba(107, 114, 128, 0.03)'
  };
  border: 1px solid ${props => props.$connected 
    ? props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.2)'
      : 'rgba(139, 92, 246, 0.15)'
    : props.theme.name === 'dark'
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
    ? props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.15)'
      : 'rgba(139, 92, 246, 0.1)'
    : props.theme.name === 'dark'
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
  color: ${props => props.theme.colors.text.secondary};
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
  color: ${props => props.theme.colors.primary};
`;

const TagMetricLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 2px;
`;

const ImportantNote = styled.div`
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.1) 0%, 
    rgba(168, 85, 247, 0.1) 100%);
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const NoteContent = styled.div`
  flex: 1;
`;

const NoteTitle = styled.h4`
  color: ${props => props.theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const NoteText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  
  code {
    background: ${props => props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.2)'
      : 'rgba(139, 92, 246, 0.1)'};
    color: ${props => props.theme.colors.primary};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }
`;

const Analytics: React.FC = () => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('wordpress');
  const { currentProject } = useProject();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsScript, setAnalyticsScript] = useState<string>('');
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [implementationCollapsed, setImplementationCollapsed] = useState(false);
  const [advancedCollapsed, setAdvancedCollapsed] = useState(false);
  
  // Estado para rastrear eventos verificados
  const [verifiedEvents, setVerifiedEvents] = useState<{
    add_to_cart: boolean;
    checkout_start: boolean;
    purchase: boolean;
    product_view: boolean;
    form_submit: boolean;
  }>({
    add_to_cart: false,
    checkout_start: false,
    purchase: false,
    product_view: false,
    form_submit: false
  });
  
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
    accent: '#c084fc', // Roxo mais claro
    grid: theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
    text: theme.name === 'dark' ? '#9ca3af' : '#6b7280',
    tooltip: theme.name === 'dark' ? '#1f2937' : '#ffffff'
  };

  // Função para verificar eventos implementados e status da tag
  const checkVerifiedEvents = async () => {
    if (!currentProject?.id) return;
    
    try {
      // Buscar TODOS os eventos das últimas 24 horas para status da tag
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: allEvents24h, error: error24h } = await supabase
        .from('analytics')
        .select('event_type, created_at')
        .eq('project_id', currentProject.id)
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });
      
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
        // Se tag conectada, colapsar as seções
        setImplementationCollapsed(true);
        setAdvancedCollapsed(true);
      } else {
        setTagStatus({
          connected: false,
          lastSeen: null,
          totalEvents24h: 0,
          pageviews24h: 0
        });
        // Se tag não conectada, abrir as seções
        setImplementationCollapsed(false);
        setAdvancedCollapsed(false);
      }
      
      // Buscar eventos específicos dos últimos 30 dias
      const { data, error } = await supabase
        .from('analytics')
        .select('event_type')
        .eq('project_id', currentProject.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .in('event_type', ['add_to_cart', 'checkout_start', 'purchase', 'product_view', 'form_submit']);
      
      if (data && data.length > 0) {
        const eventTypesSet = new Set(data.map(item => item.event_type));
        const eventTypes = Array.from(eventTypesSet);
        const verified = {
          add_to_cart: eventTypes.includes('add_to_cart'),
          checkout_start: eventTypes.includes('checkout_start'),
          purchase: eventTypes.includes('purchase'),
          product_view: eventTypes.includes('product_view'),
          form_submit: eventTypes.includes('form_submit')
        };
        setVerifiedEvents(verified);
      }
    } catch (error) {
      console.error('Error checking verified events:', error);
    }
  };

  // Fetch analytics script from project
  useEffect(() => {
    const fetchProjectScript = async () => {
      if (!currentProject?.id) return;
      
      const { data, error } = await supabase
        .from('Projeto')
        .select('analytics_script')
        .eq('id', currentProject.id)
        .single();
      
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
  
  // Atualizar verificações a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      checkVerifiedEvents();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [currentProject]);
  
  // Fetch real analytics data from Supabase
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!currentProject?.id) return;
      
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
        
        // Fetch analytics data
        const { data: analytics, error } = await supabase
          .from('analytics')
          .select('*')
          .eq('project_id', currentProject.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Process data for charts
        if (analytics && analytics.length > 0) {
          setHasData(true);
          processAnalyticsData(analytics);
        } else {
          setHasData(false);
          // Use mock data for demonstration
          loadMockData();
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        loadMockData();
      } finally {
        setLoading(false);
      }
    };
    
    const processAnalyticsData = (data: any[]) => {
      // Process real data here
      setAnalyticsData(data);
      // For now, still use mock data structure
      loadMockData();
    };
    
    const loadMockData = () => {
      // Traffic data over time - Liftlio includes all organic traffic
      const traffic = [
        { date: 'Mon', liftlio: 5300, ads: 1200, social: 800, direct: 500 },
        { date: 'Tue', liftlio: 6100, ads: 1100, social: 900, direct: 600 },
        { date: 'Wed', liftlio: 6800, ads: 1300, social: 850, direct: 550 },
        { date: 'Thu', liftlio: 6450, ads: 1150, social: 800, direct: 600 },
        { date: 'Fri', liftlio: 7500, ads: 1400, social: 1000, direct: 700 },
        { date: 'Sat', liftlio: 8500, ads: 1500, social: 1100, direct: 800 },
        { date: 'Sun', liftlio: 9300, ads: 1600, social: 1200, direct: 900 },
      ];

      // Traffic sources with Liftlio purple theme colors
      const sources = [
        { name: 'Liftlio', value: 45, color: '#8b5cf6' },
        { name: 'YouTube', value: 25, color: '#a855f7' },
        { name: 'Instagram', value: 15, color: '#c084fc' },
        { name: 'LinkedIn', value: 10, color: '#d8b4fe' },
        { name: 'Direct', value: 5, color: '#e9d5ff' },
      ];

      // Devices
      const devices = [
        { name: 'Desktop', users: 5800, sessions: 8200 },
        { name: 'Mobile', users: 4200, sessions: 5900 },
        { name: 'Tablet', users: 1000, sessions: 1400 },
      ];

      // Monthly growth
      const growth = [
        { month: 'Jan', crescimento: 12, meta: 10 },
        { month: 'Feb', crescimento: 18, meta: 15 },
        { month: 'Mar', crescimento: 25, meta: 20 },
        { month: 'Apr', crescimento: 32, meta: 25 },
        { month: 'May', crescimento: 41, meta: 30 },
        { month: 'Jun', crescimento: 48, meta: 35 },
      ];

      setTrafficData(traffic);
      setSourceData(sources);
      setDeviceData(devices);
      setGrowthData(growth);
    };
    
    fetchAnalyticsData();
  }, [period, currentProject, theme, chartColors.primary]);

  const metrics = [
    {
      title: 'Organic Traffic',
      value: '48.2K',
      change: '+32.5%',
      positive: true,
      description: 'vs. last month',
      icon: <IconComponent icon={FaIcons.FaSearch} />,
      color: '#22d3ee',
      trend: 'up' as const
    },
    {
      title: 'Unique Users',
      value: '12.8K',
      change: '+18.2%',
      positive: true,
      description: 'unique visitors',
      icon: <IconComponent icon={FaIcons.FaUsers} />,
      color: '#a855f7',
      trend: 'up' as const
    },
    {
      title: 'Conversion Rate',
      value: '4.8%',
      change: '+0.8%',
      positive: true,
      description: 'from organic traffic',
      icon: <IconComponent icon={FaIcons.FaRocket} />,
      color: '#8b5cf6',
      trend: 'up' as const
    },
    {
      title: 'Avg. Time',
      value: '3m 42s',
      change: '+15s',
      positive: true,
      description: 'on page',
      icon: <IconComponent icon={FaIcons.FaClock} />,
      color: '#10b981',
      trend: 'up' as const
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
      {/* Sistema de Notificações e Insights em Tempo Real */}
      <RealTimeInsights 
        projectId={Number(currentProject?.id) || 0} 
        supabase={supabase} 
      />
      
      <Header>
        <Title>
          <IconComponent icon={FaIcons.FaChartLine} />
          Organic Traffic Analytics
        </Title>
      </Header>

      {/* Globo 3D de visitantes online */}
      <GlobeVisualizationPro
        projectId={Number(currentProject?.id) || 0} 
        supabase={supabase} 
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
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 700,
                  color: '#8b5cf6'
                }}>
                  {Object.values(verifiedEvents).filter(v => v).length}/5
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: theme.colors.text.secondary,
                  opacity: 0.7,
                  marginTop: '2px'
                }}>
                  Events Verified
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
            Your organic traffic grew 48% this month! Content generated by Liftlio 
            is contributing 35% of this growth. Keep optimizing your videos 
            with our SEO suggestions to reach +60% by the end of the quarter.
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
                <MetricTitle>{metric.title}</MetricTitle>
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
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#c084fc" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorDirect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
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
              <span><strong>Liftlio Organic</strong> - 68% of total traffic (Google, Bing, etc.)</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#10b981" />
              <span><strong>Paid Ads</strong> - 15% from Google/Meta Ads</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#c084fc" />
              <span><strong>Social Media</strong> - 10% from social networks</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#ef4444" />
              <span><strong>Direct</strong> - 7% direct visits</span>
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

      <TagImplementation id="implementation-guide">
        <TagTitle 
          clickable={tagStatus.connected}
          onClick={() => tagStatus.connected && setImplementationCollapsed(!implementationCollapsed)}
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
          style={{ cursor: tagStatus.connected ? 'pointer' : 'default', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => tagStatus.connected && setAdvancedCollapsed(!advancedCollapsed)}
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
          {tagStatus.connected && (
            <CollapseIcon collapsed={advancedCollapsed}>
              <IconComponent icon={FaIcons.FaChevronDown} />
            </CollapseIcon>
          )}
        </AdvancedTitle>
        
        <CollapsibleContent collapsed={tagStatus.connected ? advancedCollapsed : false}>
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
          <VerifiedBadge $verified={verifiedEvents.add_to_cart}>
            <IconComponent icon={FaIcons.FaShoppingCart} />
            Add to Cart {verifiedEvents.add_to_cart ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.checkout_start}>
            <IconComponent icon={FaIcons.FaCreditCard} />
            Checkout {verifiedEvents.checkout_start ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.purchase}>
            <IconComponent icon={FaIcons.FaCheckCircle} />
            Purchase {verifiedEvents.purchase ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.product_view}>
            <IconComponent icon={FaIcons.FaEye} />
            Product View {verifiedEvents.product_view ? '✓' : '✗'}
          </VerifiedBadge>
          <VerifiedBadge $verified={verifiedEvents.form_submit}>
            <IconComponent icon={FaIcons.FaEnvelope} />
            Form Submit {verifiedEvents.form_submit ? '✓' : '✗'}
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
                      <VerifiedBadge $verified={verifiedEvents.add_to_cart}>
                        <IconComponent icon={verifiedEvents.add_to_cart ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.add_to_cart ? 'Verified' : 'Not Implemented'}
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
                      <VerifiedBadge $verified={verifiedEvents.checkout_start}>
                        <IconComponent icon={verifiedEvents.checkout_start ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.checkout_start ? 'Verified' : 'Not Implemented'}
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
                      <VerifiedBadge $verified={verifiedEvents.purchase}>
                        <IconComponent icon={verifiedEvents.purchase ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.purchase ? 'Verified' : 'Not Implemented'}
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
                      <VerifiedBadge $verified={verifiedEvents.form_submit}>
                        <IconComponent icon={verifiedEvents.form_submit ? FaIcons.FaCheck : FaIcons.FaTimes} />
                        {verifiedEvents.form_submit ? 'Verified' : 'Not Implemented'}
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
                          <VerifiedBadge $verified={verifiedEvents.product_view}>
                            <IconComponent icon={verifiedEvents.product_view ? FaIcons.FaCheck : FaIcons.FaTimes} />
                            {verifiedEvents.product_view ? 'Product View Verified' : 'Product View Not Detected'}
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

export default Analytics;