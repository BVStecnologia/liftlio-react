import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import Card from '../components/Card';
import ButtonUI from '../components/ui/Button';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { supabase, callRPC } from '../lib/supabaseClient';
import Spinner from '../components/ui/Spinner';

// Shared styled components
const PageContainer = styled.div`
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
  background-color: ${COLORS.DOMINANT}; /* Dominant color (60%) - Cinza médio */
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${COLORS.ACCENT}; /* Accent color (10%) - Azul naval escuro */
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 16px;
    color: #FF0000; /* YouTube red - keeping this as it's platform-specific */
    font-size: 32px;
  }
`;

// Enhanced tab navigation
const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 32px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: ${COLORS.BORDER.DEFAULT};
  }
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  position: relative;
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  color: ${props => props.active ? COLORS.ACCENT : COLORS.TEXT.SECONDARY};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: ${props => props.theme.fontSizes.md};
  
  &:hover {
    color: ${COLORS.ACCENT};
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.active ? COLORS.ACCENT : 'transparent'};
    z-index: 1;
    transition: all 0.3s ease;
  }
`;

const TabIcon = styled.span`
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

// Modern stats cards grid
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Using our Card component to have consistent styling
const StatCard = styled(Card)`
  padding: 24px;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const StatCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const StatIconContainer = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${props => props.theme.radius.md};
  background: ${props => `${props.color}15`};
  color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['3xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin: 12px 0 4px;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const StatChange = styled.div<{ positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.error};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-top: 8px;
`;

const StatLineSpacer = styled.div`
  height: 1px;
  background: ${props => props.theme.colors.lightGrey};
  margin: 16px 0;
`;

const MinimalTrendLine = styled.div`
  height: 40px;
  margin-top: 8px;
`;

// Chart sections styling
const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ChartBody = styled.div`
  padding: 20px 0;
`;

// Modern time selector
const TimeSelector = styled.div`
  display: flex;
  background: ${props => props.theme.colors.tertiary};
  border-radius: ${props => props.theme.radius.pill};
  padding: 4px;
`;

const TimeOption = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? props.theme.colors.secondary : 'transparent'}; /* White (30%) if active */
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.active ? props.theme.shadows.sm : 'none'};
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

// Channel list styling
const ChannelsContainer = styled.div`
  margin-bottom: 32px;
`;

const ChannelsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary};
  margin: 0;
`;

const ChannelList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 16px;
`;

// Create a wrapper div that can accept onClick and other interactive props
const ChannelCardWrapper = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.tertiary};
  box-shadow: ${props => props.active ? '0 8px 16px rgba(0,0,0,0.15)' : '0 4px 8px rgba(0,0,0,0.08)'};
  cursor: pointer;
  border-radius: ${props => props.theme.radius.lg};
  background-color: ${props => props.theme.colors.white};
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 10px 20px rgba(0,0,0,0.12);
  }
  
  ${props => props.active && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(to bottom, ${props.theme.colors.primary}, ${COLORS.ACCENT || props.theme.colors.primary}CC);
    }
  `}
`;

const ChannelBadge = styled.div<{ status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.xs};
  background: ${props => 
    props.status === 'active' ? 'linear-gradient(135deg, #34C759, #34C75999)' : 
    props.status === 'pending' ? 'linear-gradient(135deg, #FF9500, #FF950099)' : 
    'linear-gradient(135deg, #aaa, #aaa99)'};
  color: white;
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

// Melhorar o componente ChannelIcon com estilo mais profissional
const ChannelIcon = styled.div`
  width: 64px;
  height: 64px;
  background: ${props => props.theme.colors.gradient.primary};
  background-size: cover;
  background-position: center;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  flex-shrink: 0;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  overflow: hidden;
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: ${props => props.theme.fontWeights.bold};
  font-size: ${props => props.theme.fontSizes.lg};
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  
  svg {
    color: #FF0000; /* YouTube red */
    margin-left: 8px;
    font-size: 16px;
  }
`;

const ChannelStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
`;

// Define ChannelStatItem abaixo do estilo ChannelStats
const ChannelStatItem = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  
  svg {
    margin-right: 6px;
    font-size: 14px;
    color: ${props => props.theme.colors.primary};
  }
`;

const EngagementPill = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}22, ${props => props.theme.colors.primary}44);
  color: ${props => props.theme.colors.primary};
  padding: 6px 14px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-left: auto;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  
  svg {
    margin-right: 6px;
    font-size: 14px;
  }
`;

// Estilo para o popup de confirmação
const StatusPopup = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupContent = styled.div`
  background: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  width: 400px;
  max-width: 90%;
  box-shadow: ${props => props.theme.shadows.lg};
  text-align: center;
`;

const PopupTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  margin-bottom: 16px;
  color: ${props => props.theme.colors.primary};
`;

const PopupText = styled.p`
  margin-bottom: 24px;
  color: ${props => props.theme.colors.darkGrey};
`;

const PopupActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const StatusToggleButton = styled(ButtonUI)`
  min-width: 120px;
`;

// Video performance section
const VideoTable = styled.div`
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
`;

// Atualizar o grid para as colunas terem tamanhos mais adequados
const VideoTableHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 3fr) 100px 100px 150px 100px;
  padding: 16px 24px;
  background: ${props => props.theme.colors.lightGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
  color: ${props => props.theme.colors.primary};
  text-transform: uppercase;
  font-size: ${props => props.theme.fontSizes.sm};
  letter-spacing: 0.5px;
  
  > div {
    display: flex;
    align-items: center;
    
    &:first-child {
      justify-content: flex-start;
      padding-left: 8px;
    }
    
    &:not(:first-child) {
      justify-content: center;
      text-align: center;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: -12px;
        top: -16px;
        bottom: -16px;
        width: 1px;
        background-color: ${props => props.theme.colors.tertiary};
      }
    }
  }
`;

const VideoTitle = styled.div`
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const VideoThumbnail = styled.div`
  width: 120px;
  height: 67px; // Mantém a proporção 16:9
  border-radius: 8px;
  margin-right: 16px;
  flex-shrink: 0;
  overflow: hidden;
  
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease-in-out;
  }
`;

// Atualizar o grid para as linhas
const VideoTableRow = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 3fr) 100px 100px 150px 100px;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
  align-items: center;
  transition: all 0.2s ease;
  
  > div:not(:first-child) {
    position: relative;
    justify-content: center;
    text-align: center;
    
    &::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 0;
      bottom: 0;
      width: 1px;
      background-color: ${props => props.theme.colors.tertiary}80;
    }
  }
  
  &:hover {
    background: ${props => props.theme.colors.tertiary}20;
    
    ${VideoThumbnail} {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const VideoTitleText = styled.div`
  display: flex;
  flex-direction: column;
  color: ${props => props.theme.colors.primary};
`;

// Permitir que o título principal quebre mais linhas (atualizar a definição existente)
const VideoMainTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

// Ajustar o alinhamento das estatísticas
const VideoStat = styled.div`
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.md};
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const VideoStatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.regular};
  margin-top: 4px;
`;

// Filter and search components
const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 10px 16px;
  background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.secondary};
  color: ${props => props.active ? props.theme.colors.secondary : props.theme.colors.darkGrey};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.tertiary};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    margin-right: 8px;
  }
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey}20;
    border-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.primary};
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 350px;
`;

const SearchInput = styled.input`
  padding: 10px 16px 10px 42px;
  border: 1px solid ${props => props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.md};
  width: 100%;
  font-size: ${props => props.theme.fontSizes.sm};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.darkGrey};
  pointer-events: none;
`;

const VideoBadge = styled.span<{ type: string }>`
  display: inline-flex;
  padding: 2px 8px;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radius.pill};
  margin-left: 12px;
  background: ${props => 
    props.type === 'new' ? props.theme.colors.successLight : 
    props.type === 'trending' ? props.theme.colors.warningLight : 
    props.theme.colors.infoLight};
  color: ${props => 
    props.type === 'new' ? props.theme.colors.success : 
    props.type === 'trending' ? props.theme.colors.warning : 
    props.theme.colors.info};
`;

// Action buttons
const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

// Extend the Button component with some additional styling
const ActionButton = styled(ButtonUI)`
  /* Using leftIcon/rightIcon props for icon positioning */
`;

// Interface for channel details
interface ChannelDetails {
  id: number;
  name?: string;
  Nome?: string;               // Coluna real da tabela
  channel_name?: string;       // Vindo da RPC
  subscriber_count?: string | number;  // Coluna real da tabela e da RPC
  subscribers?: string;        // Para compatibilidade
  view_count?: string | number;       // Coluna real da tabela e da RPC
  views?: string;              // Para compatibilidade
  category?: string;
  status?: string;
  is_active?: boolean;         // Coluna real da tabela - controla o status
  last_video?: string;         // Da RPC
  lastVideo?: string;          // Para compatibilidade
  engagement_rate?: string | number;  // Coluna real da tabela e da RPC
  engagementRate?: string;     // Para compatibilidade
  project_id?: string | number;
  Projeto?: number;            // Coluna real da tabela
  channel_id?: string;         // Coluna real da tabela - YouTube channel ID
  
  // Novos campos da API atualizada
  imagem?: string;             // URL da imagem do canal
  raw_subscriber_count?: number; // Número bruto de inscritos (sem formatação)
  video_count?: number;        // Número de vídeos
  custom_url?: string;         // URL personalizada do canal
  description?: string;        // Descrição do canal
}

// Default empty array for channels
const defaultChannels: ChannelDetails[] = [];

// Enhanced engagement data
const engagementData = [
  { date: 'Jan', comments: 145, likes: 1250, views: 25000, subscribers: 250 },
  { date: 'Feb', comments: 165, likes: 1560, views: 28000, subscribers: 310 },
  { date: 'Mar', comments: 180, likes: 1980, views: 32000, subscribers: 370 },
  { date: 'Apr', comments: 220, likes: 2150, views: 38000, subscribers: 450 },
  { date: 'May', comments: 310, likes: 2840, views: 45000, subscribers: 620 },
  { date: 'Jun', comments: 290, likes: 2650, views: 42000, subscribers: 580 },
  { date: 'Jul', comments: 350, likes: 3100, views: 50000, subscribers: 800 }
];

// Video performance data with badges
const videoPerformanceData = [
  { 
    id: 1,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'LED Project Tutorial', 
    views: 145000, 
    comments: 1250, 
    likes: 12500, 
    retention: 68,
    badge: 'trending'
  },
  { 
    id: 2,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'RGB Light Setup Guide', 
    views: 98000, 
    comments: 820, 
    likes: 8900, 
    retention: 72,
    badge: null
  },
  { 
    id: 3,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'Best LEDs for 2025', 
    views: 210000, 
    comments: 1850, 
    likes: 18200, 
    retention: 65,
    badge: 'new'
  },
  { 
    id: 4,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'Smart LED Installation', 
    views: 85000, 
    comments: 740, 
    likes: 7600, 
    retention: 70,
    badge: null
  },
  { 
    id: 5,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'LED Troubleshooting', 
    views: 120000, 
    comments: 1340, 
    likes: 10800, 
    retention: 63,
    badge: null
  }
];

// Content distribution data
const contentDistributionData = [
  { name: 'Tutorials', value: 35 },
  { name: 'Reviews', value: 25 },
  { name: 'Vlogs', value: 15 },
  { name: 'Shorts', value: 15 },
  { name: 'Live Streams', value: 10 },
];

// Sample radar chart data
const performanceMetricsData = [
  {
    category: 'Watch Time',
    current: 75,
    benchmark: 60,
  },
  {
    category: 'Engagement',
    current: 85,
    benchmark: 70,
  },
  {
    category: 'CTR',
    current: 62,
    benchmark: 55,
  },
  {
    category: 'Audience Retention',
    current: 68,
    benchmark: 65,
  },
  {
    category: 'Subscriber Conversion',
    current: 55,
    benchmark: 50,
  },
];

// Add more styled components for the channel header
const ChannelHeaderSection = styled.div`
  margin-bottom: 24px;
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const ChannelHeaderBanner = styled.div`
  height: 140px;
  background: linear-gradient(120deg, ${COLORS.ACCENT}, ${withOpacity(COLORS.ACCENT, 0.6)});
  position: relative;
`;

const ChannelHeaderContent = styled.div`
  display: flex;
  padding: 0 24px 24px;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ChannelHeaderAvatar = styled.div<{ imageUrl: string }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid white;
  background-image: url(${props => props.imageUrl});
  background-size: cover;
  background-position: center;
  margin-top: -60px;
  box-shadow: ${props => props.theme.shadows.md};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    margin-bottom: 16px;
  }
`;

const ChannelHeaderInfo = styled.div`
  flex: 1;
  margin-left: 24px;
  
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const ChannelHeaderTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  
  svg {
    margin-left: 8px;
    color: #FF0000;
  }
`;

const ChannelHeaderMetrics = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const ChannelHeaderMetric = styled.div`
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
    color: ${COLORS.ACCENT};
  }
  
  span {
    font-weight: ${props => props.theme.fontWeights.medium};
  }
`;

const ChannelHeaderDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(transparent, white);
    pointer-events: none;
  }
`;

const ChannelHeaderUrl = styled.a`
  display: inline-flex;
  align-items: center;
  color: ${COLORS.ACCENT};
  font-size: ${props => props.theme.fontSizes.sm};
  text-decoration: none;
  margin-top: 12px;
  
  svg {
    margin-right: 6px;
  }
  
  &:hover {
    text-decoration: underline;
  }
`;

// Ajustar o estilo da descrição para ocupar menos espaço
const VideoDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  opacity: 0.9;
`;

// Ajustar o botão para ocupar menos espaço vertical
const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  padding: 2px 0;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-top: 4px;
  opacity: 0.8;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

// Adicionar um modal para visualizar detalhes completos do vídeo
const VideoDetailModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  width: 80%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.colors.darkGrey};
  padding: 0;
  margin: 0;
  line-height: 1;
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ModalTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin: 0 0 8px;
  color: ${props => props.theme.colors.primary};
`;

const ModalThumbnail = styled.div`
  width: 100%;
  position: relative;
  padding-top: 56.25%; /* Proporção 16:9 (9/16 = 0.5625 = 56.25%) */
  border-radius: ${props => props.theme.radius.md};
  overflow: hidden;
  margin-bottom: 24px;
  background-color: #000;
  
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain; /* Garante que a imagem mantenha a proporção sem cortes */
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    border-top: 16px solid transparent;
    border-left: 28px solid white;
    border-bottom: 16px solid transparent;
    opacity: 0.9;
    pointer-events: none;
  }
`;

const ModalDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  color: ${props => props.theme.colors.darkGrey};
  margin-bottom: 24px;
  padding: 16px;
  background: ${props => props.theme.colors.tertiary}20;
  border-radius: ${props => props.theme.radius.md};
  max-height: 200px;
  overflow-y: auto;
`;

const ModalStats = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const ModalStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ModalStatValue = styled.div`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
`;

const ModalStatLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  margin-top: 4px;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
`;

const ModalActionButton = styled(ButtonUI)`
  min-width: 120px;
`;

// Component implementation
const YoutubeMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState('month');
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [channels, setChannels] = useState<ChannelDetails[]>(defaultChannels);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [selectedChannelForToggle, setSelectedChannelForToggle] = useState<ChannelDetails | null>(null);
  const [isStatusPopupOpen, setIsStatusPopupOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [metricsData, setMetricsData] = useState<{ 
    total_views: number, 
    total_likes: number, 
    media: string, 
    posts: number 
  } | null>(null);
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [videoComments, setVideoComments] = useState<any[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [channelVideoCount, setChannelVideoCount] = useState<{[key: number]: number}>({});
  const [selectedChannelDetails, setSelectedChannelDetails] = useState<any>(null);
  const [isLoadingChannelDetails, setIsLoadingChannelDetails] = useState(false);
  const [selectedVideoForDetail, setSelectedVideoForDetail] = useState<any>(null);
  const { currentProject } = useProject();
  
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!currentProject?.id) return;
      
      const id_projeto = currentProject.id;
      try {
        const data = await callRPC('get_project_metrics', { id_projeto });
        
        if (data && data.length > 0) {
          setMetricsData(data[0]);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };
    
    const fetchChannelDetails = async () => {
      if (!currentProject?.id) return;
      
      setIsLoadingChannels(true);
      try {
        const data = await callRPC('get_channel_details', { 
          id_projeto: currentProject.id 
        });
        
        if (data && Array.isArray(data) && data.length > 0) {
          // Process channels to ensure all required fields are available
          const processedChannels = data.map(channel => {
            // Set status based on is_active if not already set
            if (channel.is_active !== undefined && channel.status === undefined) {
              channel.status = channel.is_active ? 'active' : 'inactive';
            }
            
            // Default to active if neither is defined
            if (channel.status === undefined && channel.is_active === undefined) {
              channel.status = 'active';
            }
            
            // Calculate engagement rate if not provided by RPC
            if (!channel.engagement_rate && !channel.engagementRate) {
              const subscriberCount = parseInt(channel.subscriber_count || channel.subscribers || '0', 10);
              const viewCount = parseInt(channel.view_count || channel.views || '0', 10);
              
              // Simple engagement calculation if we have both metrics
              if (subscriberCount > 0 && viewCount > 0) {
                const ratio = (viewCount / subscriberCount) * 100;
                channel.engagement_rate = ratio > 100 ? '100%' : `${ratio.toFixed(1)}%`;
              } else {
                channel.engagement_rate = '0%';
              }
            }
            
            return channel;
          });
          
          setChannels(processedChannels);
          
          // Fetch video counts for each channel
          processedChannels.forEach(channel => {
            fetchChannelVideoCount(channel.id);
          });
          
        } else {
          setChannels(defaultChannels);
        }
      } catch (error) {
        console.error('Error fetching channel details:', error);
        setChannels(defaultChannels);
      } finally {
        setIsLoadingChannels(false);
      }
    };
    
    fetchMetrics();
    fetchChannelDetails();
  }, [currentProject]);
  
  // Function to fetch and store video count for a channel
  const fetchChannelVideoCount = async (channelId: number) => {
    try {
      const data = await callRPC('get_videos_by_channel_id', {
        canal_id: channelId
      });
      
      if (data && Array.isArray(data)) {
        setChannelVideoCount(prev => ({
          ...prev,
          [channelId]: data.length
        }));
      }
    } catch (error) {
      console.error(`Error fetching video count for channel ${channelId}:`, error);
    }
  };
  
  // Função para alternar o status ativo/inativo de um canal usando o ID
  const toggleChannelStatus = async (channel: ChannelDetails, currentStatus: boolean) => {
    try {
      setIsUpdatingStatus(true);
      
      // Usando o ID do canal para a atualização (mais seguro e confiável)
      const channelId = channel.id;
      const channelName = channel.channel_name || channel.name || channel.Nome;
      
      if (!channelId) {
        console.error('Channel ID not found:', channel);
        alert('Channel ID not found. Cannot update status.');
        return null;
      }
      
      console.log('Updating channel:', channelName);
      console.log('Channel ID:', channelId);
      console.log('Current status:', currentStatus);
      console.log('New status will be:', !currentStatus);
      
      // Garantir que estamos trabalhando com um boolean para o campo is_active
      const newStatus = !currentStatus;
      
      // Atualizar pelo ID do canal (mais seguro)
      const { data, error } = await supabase
        .from('Canais do youtube')
        .update({ is_active: newStatus })
        .eq('id', channelId)
        .select();
      
      // Verificar o resultado
      if (error) {
        console.error('Error updating channel:', error.message);
        console.error('Error details:', error);
        alert(`Error updating channel: ${error.message}`);
      } else {
        console.log('Channel updated successfully:', data);
        
        // Atualiza a lista de canais após a mudança bem-sucedida
        if (currentProject?.id) {
          try {
            // Busca os dados atualizados usando a RPC
            const refreshedData = await callRPC('get_channel_details', { 
              id_projeto: currentProject.id 
            });
            
            if (refreshedData && Array.isArray(refreshedData)) {
              setChannels(refreshedData);
              console.log('Channel list updated successfully');
            }
          } catch (refreshError) {
            console.error('Error refreshing channel list:', refreshError);
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error during toggle operation:', error);
      alert('Failed to update channel status. Check console for details.');
      return null;
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusPopupOpen(false);
    }
  };
  
  // Generate random trend data for stats
  const generateTrendData = (baseline: number, variance: number = 0.1, points: number = 10) => {
    const data = [];
    let current = baseline;
    
    for (let i = 0; i < points; i++) {
      const change = baseline * variance * (Math.random() * 2 - 1);
      current += change;
      data.push(current);
    }
    
    return data;
  };
  
  // Function to fetch videos for a specific channel
  const fetchChannelVideos = async (channelId: number) => {
    if (!channelId || !currentProject?.id) return;
    
    setIsLoadingVideos(true);
    try {
      // Use the RPC helper function to call get_videos_by_channel_id
      const data = await callRPC('get_videos_by_channel_id', {
        canal_id: channelId
      });
      
      if (data && Array.isArray(data)) {
        console.log('Channel videos data:', JSON.stringify(data, null, 2));
        
        // Process data to ensure videos have thumbnail URLs
        const processedVideos = data.map(video => {
          // Identificar qual ID do vídeo usar (video_id_youtube ou video_id)
          const youtubeVideoId = video.video_id_youtube || video.video_id || video.id_video || '';
          
          if (youtubeVideoId) {
            console.log('Video YouTube ID encontrado:', youtubeVideoId);
            return {
              ...video,
              // Garantir que temos o ID do YouTube em um campo consistente
              video_id_youtube: youtubeVideoId,
              // Adicionar a URL da thumbnail
              thumbnailUrl: getYouTubeThumbnailUrl(youtubeVideoId)
            };
          } else {
            console.warn('Video sem ID do YouTube:', video);
            return {
              ...video,
              thumbnailUrl: getThumbnailUrl(video)
            };
          }
        });
        
        setChannelVideos(processedVideos);
      } else {
        console.error('Invalid data format received for channel videos');
        setChannelVideos([]);
      }
    } catch (error) {
      console.error('Error in channel videos fetch operation:', error);
      setChannelVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  };
  
  // Nova função para buscar comentários de um vídeo específico
  const fetchVideoComments = async (videoId: number) => {
    if (!videoId) return;
    
    setIsLoadingComments(true);
    try {
      // Simular a busca de comentários - no futuro, chamar a RPC real
      // const data = await callRPC('get_video_comments', { id_video: videoId });
      
      // Simulação de dados por enquanto
      const simulatedComments = [
        { id: 1, author: "João Silva", text: "Excelente vídeo, muito útil!", date: "2023-09-15", likes: 12 },
        { id: 2, author: "Maria Oliveira", text: "Gostei muito das dicas. Obrigada por compartilhar!", date: "2023-09-15", likes: 8 },
        { id: 3, author: "Pedro Santos", text: "Estou seguindo seu canal há meses, conteúdo fantástico!", date: "2023-09-16", likes: 15 },
        { id: 4, author: "Ana Pereira", text: "Poderia fazer um vídeo sobre configuração de LEDs RGB?", date: "2023-09-16", likes: 4 },
        { id: 5, author: "Carlos Mendes", text: "Salvou meu projeto! Muito obrigado.", date: "2023-09-17", likes: 10 }
      ];
      
      setTimeout(() => {
        setVideoComments(simulatedComments);
        setIsLoadingComments(false);
      }, 600);
      
    } catch (error) {
      console.error('Error fetching video comments:', error);
      setVideoComments([]);
      setIsLoadingComments(false);
    }
  };
  
  // Function to fetch detailed channel information
  const fetchChannelDetails = async (channelId: string) => {
    if (!channelId) {
      console.log('fetchChannelDetails: Channel ID não fornecido');
      return;
    }
    
    console.log('Iniciando fetchChannelDetails com channel_id:', channelId);
    setIsLoadingChannelDetails(true);
    try {
      const data = await callRPC('call_youtube_channel_details', {
        channel_id: channelId
      });
      
      console.log('Resposta detalhada da API de canal:', data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Primeiro item da resposta:', data[0]);
        if (data[0].call_youtube_channel_details) {
          console.log('Detalhes encontrados, atualizando selectedChannelDetails');
          setSelectedChannelDetails(data[0].call_youtube_channel_details);
        } else {
          console.error('Campo call_youtube_channel_details não encontrado no retorno da API');
          setSelectedChannelDetails(null);
        }
      } else {
        console.error('Formato de dados inválido ou vazio para detalhes do canal');
        setSelectedChannelDetails(null);
      }
    } catch (error) {
      console.error('Erro ao buscar informações detalhadas do canal:', error);
      setSelectedChannelDetails(null);
    } finally {
      setIsLoadingChannelDetails(false);
    }
  };

  // Function to handle channel selection - update to also fetch channel details
  const handleChannelSelect = (channelId: number) => {
    console.log('Canal selecionado, ID:', channelId);
    setSelectedChannel(channelId);
    setSelectedVideo(null); // Clear selected video
    fetchChannelVideos(channelId);
    
    // Get the channel data
    const selectedChannelData = channels.find(c => c.id === channelId);
    console.log('Dados do canal encontrado:', selectedChannelData);
    
    if (selectedChannelData) {
      // Verificar os dados disponíveis no console
      console.log('Subscriber count:', selectedChannelData.raw_subscriber_count);
      console.log('View count raw:', selectedChannelData.view_count);
      
      // Extrair valores numéricos das estatísticas formatadas
      let viewCount = '0';
      if (selectedChannelData.view_count) {
        if (typeof selectedChannelData.view_count === 'string') {
          // Extrair apenas o valor numérico (1.8M -> 1800000)
          if (selectedChannelData.view_count.includes('M')) {
            const numPart = parseFloat(selectedChannelData.view_count.replace(/[^0-9.]/g, ''));
            viewCount = (numPart * 1000000).toString();
          } else if (selectedChannelData.view_count.includes('K')) {
            const numPart = parseFloat(selectedChannelData.view_count.replace(/[^0-9.]/g, ''));
            viewCount = (numPart * 1000).toString();
          } else {
            viewCount = selectedChannelData.view_count.replace(/[^0-9]/g, '');
          }
        } else {
          viewCount = selectedChannelData.view_count.toString();
        }
      }
      
      // Usar diretamente os dados que já temos ao invés de fazer uma chamada adicional
      const channelDetails = {
        title: selectedChannelData.channel_name || 'YouTube Channel',
        description: selectedChannelData.description || '',
        statistics: {
          subscriberCount: selectedChannelData.raw_subscriber_count?.toString() || 
                          (typeof selectedChannelData.subscriber_count === 'string' ? 
                            selectedChannelData.subscriber_count.replace(/[^0-9]/g, '') : 
                            selectedChannelData.subscriber_count?.toString()) || 
                          '0',
          viewCount: viewCount,
          videoCount: selectedChannelData.video_count?.toString() || '0'
        },
        thumbnails: {
          high: { url: selectedChannelData.imagem || 'https://via.placeholder.com/150' },
          medium: { url: selectedChannelData.imagem || 'https://via.placeholder.com/150' },
          default: { url: selectedChannelData.imagem || 'https://via.placeholder.com/150' }
        },
        country: 'US', // Alterado para corresponder aos dados reais que mostram US
        customUrl: selectedChannelData.custom_url || null
      };
      
      console.log('Usando dados do canal para o cabeçalho:', channelDetails);
      setSelectedChannelDetails(channelDetails);
    }
    
    // If in Overview or Channels tab, switch to Videos tab
    if (activeTab === 'overview' || activeTab === 'channels') {
      setActiveTab('videos');
    }
  };
  
  // Function to select a video
  const handleVideoSelect = (videoId: number) => {
    setSelectedVideo(videoId);
    fetchVideoComments(videoId);
    
    // Switch to Comments tab
    setActiveTab('comments');
  };
  
  // Helper function to format numbers
  const formatNumber = (num: string | number | undefined): string => {
    if (!num) return '0';
    
    const numValue = typeof num === 'string' ? parseInt(num, 10) : num;
    
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    
    return numValue.toString();
  };
  
  // Função para gerar URL de thumbnail do YouTube
  const getYouTubeThumbnailUrl = (videoId: string) => {
    if (!videoId) return 'https://placehold.co/640x360/5F27CD/FFFFFF?text=No+Image';
    
    // Formato de alta qualidade (maxresdefault)
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  };
  
  // Adicionar esta função de utilidade para gerar URLs de thumbnail
  const getThumbnailUrl = (video: any) => {
    // Se temos o ID do vídeo do YouTube, usamos para gerar a URL da thumbnail
    if (video.video_id_youtube) {
      return `https://i.ytimg.com/vi/${video.video_id_youtube}/hqdefault.jpg`;
    }
    
    // Fallback para uma imagem estática com base na primeira letra do título
    const videoTitle = video.nome_do_video || video.title || "Untitled";
    const firstLetter = videoTitle.charAt(0).toUpperCase();
    
    // Geramos cores diferentes com base na primeira letra do título
    const colors = ['#5F27CD', '#2D98DA', '#FF9F43', '#EE5253', '#10AC84', '#222F3E', '#5F27CD'];
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    
    // Returna uma URL para uma imagem de placeholder personalizada
    return `https://placehold.co/640x360/${colors[colorIndex].replace('#', '')}/${firstLetter === videoTitle.charAt(0) ? 'FFFFFF' : '333333'}?text=${encodeURIComponent(firstLetter)}`;
  };
  
  return (
    <PageContainer>
      <PageTitle>
        <IconComponent icon={FaIcons.FaYoutube} />
        YouTube Monitoring
      </PageTitle>
      
      <TabsContainer>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          <TabIcon><IconComponent icon={FaIcons.FaChartLine} /></TabIcon>
          Overview
        </Tab>
        <Tab active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}>
          <TabIcon><IconComponent icon={FaIcons.FaYoutube} /></TabIcon>
          Channels
        </Tab>
        {selectedChannel !== null && (
          <Tab active={activeTab === 'videos'} onClick={() => setActiveTab('videos')}>
            <TabIcon><IconComponent icon={FaIcons.FaVideo} /></TabIcon>
            Videos
            <ChannelBadge 
              style={{ 
                marginLeft: '16px',
                display: 'inline-flex',
                justifyContent: 'center',
                minWidth: '24px'
              }} 
              status="active"
            >
              {channelVideos.length}
            </ChannelBadge>
          </Tab>
        )}
        {selectedVideo !== null && (
          <Tab active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
            <TabIcon><IconComponent icon={FaIcons.FaComment} /></TabIcon>
            Comments
            <ChannelBadge 
              style={{ 
                marginLeft: '16px',
                display: 'inline-flex',
                justifyContent: 'center',
                minWidth: '24px'
              }} 
              status="active"
            >
              {videoComments.length}
            </ChannelBadge>
          </Tab>
        )}
      </TabsContainer>
      
      {activeTab === 'overview' && (
        <>
          <StatsGrid>
            <StatCard>
              <StatCardHeader>
                <StatLabel>Total Views</StatLabel>
                <StatIconContainer color="#5856D6">
                  <IconComponent icon={FaIcons.FaChartBar} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>{metricsData ? (metricsData.total_views >= 1000000 ? `${(metricsData.total_views / 1000000).toFixed(1)}M` : `${(metricsData.total_views / 1000).toFixed(0)}K`) : '0'}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatCardHeader>
                <StatLabel>Total Likes</StatLabel>
                <StatIconContainer color="#FF9500">
                  <IconComponent icon={FaIcons.FaHeart} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>{metricsData ? (metricsData.total_likes >= 1000000 ? `${(metricsData.total_likes / 1000000).toFixed(1)}M` : `${(metricsData.total_likes / 1000).toFixed(0)}K`) : '0'}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatCardHeader>
                <StatLabel>Comments Posted</StatLabel>
                <StatIconContainer color="#34C759">
                  <IconComponent icon={FaIcons.FaComments} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>{metricsData?.posts.toLocaleString() || '0'}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatCardHeader>
                <StatLabel>Engagement Rate</StatLabel>
                <StatIconContainer color="#FF2D55">
                  <IconComponent icon={FaIcons.FaChartPie} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>{metricsData?.media ? `${parseFloat(metricsData.media).toFixed(1)}%` : '0%'}</StatValue>
            </StatCard>
          </StatsGrid>
          
          <ChartRow>
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaChartArea} />
                  Engagement Metrics
                </ChartTitle>
                <TimeSelector>
                  <TimeOption active={timeframe === 'week'} onClick={() => setTimeframe('week')}>Week</TimeOption>
                  <TimeOption active={timeframe === 'month'} onClick={() => setTimeframe('month')}>Month</TimeOption>
                  <TimeOption active={timeframe === 'quarter'} onClick={() => setTimeframe('quarter')}>Quarter</TimeOption>
                  <TimeOption active={timeframe === 'year'} onClick={() => setTimeframe('year')}>Year</TimeOption>
                </TimeSelector>
              </ChartHeader>
              
              <ChartBody>
                <div style={{ height: 300, width: '100%', padding: '0 16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={engagementData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5856D6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#5856D6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF9500" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#FF9500" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34C759" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#34C759" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF2D55" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#FF2D55" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        name="Views" 
                        stroke="#5856D6" 
                        fillOpacity={1}
                        fill="url(#colorViews)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="likes" 
                        name="Likes" 
                        stroke="#FF9500" 
                        fillOpacity={1}
                        fill="url(#colorLikes)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="comments" 
                        name="Comments" 
                        stroke="#34C759" 
                        fillOpacity={1}
                        fill="url(#colorComments)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="subscribers" 
                        name="New Subscribers" 
                        stroke="#FF2D55" 
                        fillOpacity={1}
                        fill="url(#colorSubscribers)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartBody>
            </ChartContainer>
            
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaChartPie} />
                  Content Distribution
                </ChartTitle>
              </ChartHeader>
              
              <ChartBody>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contentDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#5856D6" />
                        <Cell fill="#FF9500" />
                        <Cell fill="#34C759" />
                        <Cell fill="#FF2D55" />
                        <Cell fill="#007AFF" />
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Percentage']}
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartBody>
            </ChartContainer>
          </ChartRow>
          
          <ChartRow>
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaPlay} />
                  Top Performing Videos
                </ChartTitle>
              </ChartHeader>
              
              <VideoTable>
                <VideoTableHeader>
                  <div>Video</div>
                  <div>Views</div>
                  <div>Comments</div>
                  <div>Likes</div>
                  <div>Retention</div>
                </VideoTableHeader>
                
                {videoPerformanceData.map((video) => (
                  <VideoTableRow key={video.id}>
                    <VideoTitle>
                      <VideoThumbnail>
                        <img src={video.thumbnail} alt={video.name} />
                      </VideoThumbnail>
                      <VideoTitleText>
                        {video.name}
                        {video.badge && (
                          <VideoBadge type={video.badge}>
                            {video.badge === 'new' ? 'New' : 'Trending'}
                          </VideoBadge>
                        )}
                      </VideoTitleText>
                    </VideoTitle>
                    <VideoStat>
                      {(video.views / 1000).toFixed(0)}K
                    </VideoStat>
                    <VideoStat>
                      {(video.comments / 1000).toFixed(1)}K
                    </VideoStat>
                    <VideoStat>
                      {(video.likes / 1000).toFixed(1)}K
                    </VideoStat>
                    <VideoStat>
                      {video.retention}%
                    </VideoStat>
                  </VideoTableRow>
                ))}
              </VideoTable>
            </ChartContainer>
            
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaBullseye} />
                  Performance Metrics
                </ChartTitle>
              </ChartHeader>
              
              <ChartBody>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} width={500} height={300} data={performanceMetricsData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Your Channel" dataKey="current" stroke="#5856D6" fill="#5856D6" fillOpacity={0.5} />
                      <Radar name="Industry Benchmark" dataKey="benchmark" stroke="#FF9500" fill="#FF9500" fillOpacity={0.3} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </ChartBody>
            </ChartContainer>
          </ChartRow>
        </>
      )}
      
      {activeTab === 'channels' && (
        <>
          <FilterBar>
            <FilterGroup>
              <FilterButton active={channelFilter === 'all'} onClick={() => setChannelFilter('all')}>
                <IconComponent icon={FaIcons.FaListUl} />
                All Channels
              </FilterButton>
              <FilterButton active={channelFilter === 'active'} onClick={() => setChannelFilter('active')}>
                <IconComponent icon={FaIcons.FaCheck} />
                Active
              </FilterButton>
              <FilterButton active={channelFilter === 'inactive'} onClick={() => setChannelFilter('inactive')}>
                <IconComponent icon={FaIcons.FaPause} />
                Inactive
              </FilterButton>
            </FilterGroup>
            
            <SearchContainer>
              <SearchIcon>
                <IconComponent icon={FaIcons.FaSearch} />
              </SearchIcon>
              <SearchInput 
                placeholder="Search channels..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
          </FilterBar>
          
          <ChannelsContainer>
            <ChannelsHeader>
              <SectionTitle>Your Channels</SectionTitle>
            </ChannelsHeader>
            
            <ChannelList>
              {isLoadingChannels ? (
                // Loading state with 3 placeholder cards
                Array(3).fill(0).map((_, index) => (
                  <ChannelCardWrapper 
                    key={`loading-${index}`}
                    active={false}
                    onClick={() => {}}
                    style={{ opacity: 0.6 }}
                  >
                    <ChannelIcon>
                      <IconComponent icon={FaIcons.FaYoutube} />
                    </ChannelIcon>
                    
                    <ChannelInfo>
                      <ChannelName>Loading...</ChannelName>
                      <ChannelStats>
                        <ChannelStatItem>
                          <IconComponent icon={FaIcons.FaUser} />
                          Loading...
                        </ChannelStatItem>
                      </ChannelStats>
                    </ChannelInfo>
                  </ChannelCardWrapper>
                ))
              ) : channels.length === 0 ? (
                // Empty state
                <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
                    <IconComponent icon={FaIcons.FaYoutube} />
                  </div>
                  <h3>No YouTube channels found</h3>
                  <p>Add YouTube channels to your project to see them here</p>
                  <div style={{ marginTop: '24px' }}>
                    <ActionButton variant="primary" leftIcon={<IconComponent icon={FaIcons.FaPlus} />}>
                      Add Channel
                    </ActionButton>
                  </div>
                </div>
              ) : (
                // Actual channel data
                channels
                  .filter(channel => {
                    // Filtro por status baseado apenas no campo is_active
                    let statusMatch = false;
                    
                    if (channelFilter === 'all') {
                      statusMatch = true;
                    } else if (channelFilter === 'active') {
                      // Usar apenas o campo is_active
                      statusMatch = (channel.is_active === true);
                    } else if (channelFilter === 'inactive') {
                      // Usar apenas o campo is_active
                      statusMatch = (channel.is_active === false);
                    }
                    
                    // Filtro por nome com verificação de segurança
                    let nameMatch = searchTerm === '';
                    if (!nameMatch) {
                      const channelName = channel.channel_name || channel.name || '';
                      nameMatch = channelName.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                    
                    return statusMatch && nameMatch;
                  })
                  .map(channel => (
                  <ChannelCardWrapper 
                    key={channel.id} 
                    active={selectedChannel === channel.id}
                    onClick={() => handleChannelSelect(channel.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedChannelForToggle(channel);
                      setIsStatusPopupOpen(true);
                    }}
                  >
                    <ChannelBadge 
                      status={channel.is_active === true ? 'active' : 'inactive'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChannelForToggle(channel);
                        setIsStatusPopupOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {channel.is_active === true && <IconComponent icon={FaIcons.FaCheck} />}
                      {channel.is_active === false && <IconComponent icon={FaIcons.FaPause} />}
                      {channel.is_active === true ? 'Active' : 'Inactive'}
                    </ChannelBadge>
                    
                    <ChannelIcon style={channel.imagem ? {
                      backgroundImage: `url(${channel.imagem})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : {}}>
                      {!channel.imagem && <IconComponent icon={FaIcons.FaYoutube} />}
                    </ChannelIcon>
                    
                    <ChannelInfo>
                      <ChannelName>{channel.channel_name || channel.Nome || channel.name || 'Unnamed Channel'}</ChannelName>
                      <ChannelStats>
                        <ChannelStatItem>
                          <IconComponent icon={FaIcons.FaUser} />
                          {channel.subscriber_count}
                        </ChannelStatItem>
                        <ChannelStatItem>
                          <IconComponent icon={FaIcons.FaEye} />
                          {channel.view_count}
                        </ChannelStatItem>
                        <ChannelStatItem>
                          <IconComponent icon={FaIcons.FaClock} />
                          {channel.last_video}
                        </ChannelStatItem>
                        <ChannelStatItem>
                          <IconComponent icon={FaIcons.FaVideo} />
                          {channelVideoCount[channel.id] || 0} monitored videos
                        </ChannelStatItem>
                      </ChannelStats>
                      
                      {/* Mensagem de instrução */}
                      <ChannelStatItem style={{ 
                        marginTop: '12px', 
                        color: '#007bff', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center' 
                      }}>
                        <IconComponent icon={FaIcons.FaHandPointer} />
                        <span style={{ marginLeft: '4px' }}>Click to view channel videos</span>
                      </ChannelStatItem>
                    </ChannelInfo>
                    
                    <EngagementPill>
                      <IconComponent icon={FaIcons.FaChartLine} />
                      {channel.engagement_rate || channel.engagementRate || '0%'}
                    </EngagementPill>
                  </ChannelCardWrapper>
                ))
              )}
            </ChannelList>
            
            {/* Status Toggle Popup */}
            {isStatusPopupOpen && selectedChannelForToggle && (
              <StatusPopup onClick={() => setIsStatusPopupOpen(false)}>
                <PopupContent onClick={(e) => e.stopPropagation()}>
                  <PopupTitle>
                    {selectedChannelForToggle.is_active === true
                      ? 'Deactivate Channel?' 
                      : 'Activate Channel?'}
                  </PopupTitle>
                  <PopupText>
                    {selectedChannelForToggle.is_active === true
                      ? 'This channel will no longer be monitored. You can reactivate it later.'
                      : 'This channel will be monitored again. You can deactivate it any time.'}
                  </PopupText>
                  <PopupActions>
                    <StatusToggleButton 
                      variant="ghost" 
                      onClick={() => setIsStatusPopupOpen(false)}
                      disabled={isUpdatingStatus}
                    >
                      Cancel
                    </StatusToggleButton>
                    <StatusToggleButton 
                      variant={selectedChannelForToggle.is_active === true ? "error" : "success"}
                      onClick={() => toggleChannelStatus(
                        selectedChannelForToggle, 
                        !!selectedChannelForToggle.is_active // Converter para boolean
                      )}
                      disabled={isUpdatingStatus}
                      leftIcon={<IconComponent icon={
                        isUpdatingStatus 
                          ? FaIcons.FaSpinner 
                          : selectedChannelForToggle.is_active === true
                            ? FaIcons.FaPause 
                            : FaIcons.FaCheck
                      } />}
                    >
                      {isUpdatingStatus 
                        ? "Updating..." 
                        : selectedChannelForToggle.is_active === true
                          ? "Deactivate" 
                          : "Activate"}
                    </StatusToggleButton>
                  </PopupActions>
                </PopupContent>
              </StatusPopup>
            )}
            
            <ButtonRow>
              <ActionButton 
                variant="ghost" 
                leftIcon={<IconComponent icon={FaIcons.FaSync} />}
                onClick={() => {
                  if (currentProject?.id) {
                    setIsLoadingChannels(true);
                    callRPC('get_channel_details', { 
                      id_projeto: currentProject.id 
                    })
                    .then(data => {
                      if (data && Array.isArray(data) && data.length > 0) {
                        // Process channels to ensure all required fields are available
                        const processedChannels = data.map(channel => {
                          // Set status based on is_active if not already set
                          if (channel.is_active !== undefined && channel.status === undefined) {
                            channel.status = channel.is_active ? 'active' : 'inactive';
                          }
                          
                          // Default to active if neither is defined
                          if (channel.status === undefined && channel.is_active === undefined) {
                            channel.status = 'active';
                          }
                          
                          // Calculate engagement rate if not provided by RPC
                          if (!channel.engagement_rate && !channel.engagementRate) {
                            const subscriberCount = parseInt(channel.subscriber_count || channel.subscribers || '0', 10);
                            const viewCount = parseInt(channel.view_count || channel.views || '0', 10);
                            
                            // Simple engagement calculation if we have both metrics
                            if (subscriberCount > 0 && viewCount > 0) {
                              const ratio = (viewCount / subscriberCount) * 100;
                              channel.engagement_rate = ratio > 100 ? '100%' : `${ratio.toFixed(1)}%`;
                            } else {
                              channel.engagement_rate = '0%';
                            }
                          }
                          
                          return channel;
                        });
                        
                        setChannels(processedChannels);
                      } else {
                        setChannels(defaultChannels);
                      }
                    })
                    .catch(error => {
                      console.error('Error refreshing channel details:', error);
                      setChannels(defaultChannels);
                    })
                    .finally(() => {
                      setIsLoadingChannels(false);
                    });
                  }
                }}
                disabled={isLoadingChannels}
              >
                {isLoadingChannels ? 'Refreshing...' : 'Refresh Data'}
              </ActionButton>
              <ActionButton variant="primary" leftIcon={<IconComponent icon={FaIcons.FaPlus} />}>
                Add New Channel
              </ActionButton>
            </ButtonRow>
          </ChannelsContainer>
        </>
      )}
      
      {activeTab === 'videos' && (
        <ChartContainer>
          {/* Channel Header Section */}
          {isLoadingChannelDetails ? (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <IconComponent icon={FaIcons.FaSpinner} style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }} />
              <p>Loading channel details...</p>
            </div>
          ) : selectedChannelDetails ? (
            <ChannelHeaderSection>
              <ChannelHeaderBanner />
              <ChannelHeaderContent>
                <ChannelHeaderAvatar 
                  imageUrl={selectedChannelDetails.thumbnails?.high?.url || 
                           selectedChannelDetails.thumbnails?.medium?.url || 
                           selectedChannelDetails.thumbnails?.default?.url || 
                           'https://via.placeholder.com/150'} 
                />
                <ChannelHeaderInfo>
                  <ChannelHeaderTitle>
                    {selectedChannelDetails.title || selectedChannelDetails.channel_name || 'YouTube Channel'}
                    <IconComponent icon={FaIcons.FaYoutube} />
                  </ChannelHeaderTitle>
                  
                  <ChannelHeaderMetrics>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaUser} />
                      <span>{formatNumber(selectedChannelDetails.statistics?.subscriberCount)} subscribers</span>
                    </ChannelHeaderMetric>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaEye} />
                      <span>{formatNumber(selectedChannelDetails.statistics?.viewCount)} views</span>
                    </ChannelHeaderMetric>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaVideo} />
                      <span>{formatNumber(selectedChannelDetails.statistics?.videoCount)} videos</span>
                    </ChannelHeaderMetric>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaGlobe} />
                      <span>Country: {selectedChannelDetails.country || 'N/A'}</span>
                    </ChannelHeaderMetric>
                  </ChannelHeaderMetrics>
                  
                  {selectedChannelDetails.description && selectedChannelDetails.description.trim() !== '' && (
                    <ChannelHeaderDescription>
                      {selectedChannelDetails.description}
                    </ChannelHeaderDescription>
                  )}
                  
                  {selectedChannelDetails.customUrl && (
                    <ChannelHeaderUrl 
                      href={`https://youtube.com/${selectedChannelDetails.customUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <IconComponent icon={FaIcons.FaExternalLinkAlt} />
                      Visit channel
                    </ChannelHeaderUrl>
                  )}
                </ChannelHeaderInfo>
              </ChannelHeaderContent>
            </ChannelHeaderSection>
          ) : null}
          
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaVideo} />
              Monitored Videos of {channels.find(c => c.id === selectedChannel)?.channel_name || "Channel"}
            </ChartTitle>
            <FilterGroup>
              <FilterButton>
                <IconComponent icon={FaIcons.FaFilter} />
                Filter
              </FilterButton>
              <FilterButton>
                <IconComponent icon={FaIcons.FaSortAmountDown} />
                Sort
              </FilterButton>
            </FilterGroup>
          </ChartHeader>
          
          {isLoadingVideos ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#666', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaSpinner} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <p>Loading videos...</p>
            </div>
          ) : channelVideos.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaVideo} />
              </div>
              <h3>No videos found for this channel</h3>
              <p>This channel hasn't uploaded any videos yet or they're not indexed</p>
            </div>
          ) : (
            <div style={{ padding: '0 20px' }}>
              <VideoTable style={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <VideoTableHeader style={{ 
                  background: `${withOpacity(COLORS.ACCENT, 0.05)}`,
                  fontWeight: 'bold' 
                }}>
                  <div>Video</div>
                  <div>Views</div>
                  <div>Comments</div>
                  <div>Category</div>
                  <div>Relevance</div>
                </VideoTableHeader>
                
                {channelVideos.map((video: any) => {
                  const thumbnailUrl = getThumbnailUrl(video);
                  
                  return (
                    <VideoTableRow 
                      key={video.id}
                      onClick={() => handleVideoSelect(video.id)}
                      style={{ 
                        cursor: 'pointer', 
                        background: selectedVideo === video.id ? withOpacity(COLORS.ACCENT, 0.1) : 'inherit',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <VideoTitle>
                        <VideoThumbnail>
                          <img 
                            src={thumbnailUrl}
                            alt={video.nome_do_video || "Video thumbnail"}
                            onError={(e) => {
                              if ((e.target as HTMLImageElement).src.includes('ytimg.com')) {
                                const videoTitle = video.nome_do_video || video.title || "Untitled";
                                const firstLetter = videoTitle.charAt(0).toUpperCase();
                                (e.target as HTMLImageElement).src = `https://placehold.co/640x360/5F27CD/FFFFFF?text=${encodeURIComponent(firstLetter)}`;
                              }
                            }}
                            style={{ 
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </VideoThumbnail>
                        <VideoTitleText>
                          <VideoMainTitle>{video.nome_do_video || video.title || "Untitled Video"}</VideoMainTitle>
                          
                          {video.descricao && (
                            <VideoDescription>
                              {video.descricao.length > 80 
                                ? `${video.descricao.substring(0, 80)}...` 
                                : video.descricao}
                            </VideoDescription>
                          )}
                          
                          <ExpandButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVideoForDetail(video);
                            }}
                          >
                            <IconComponent icon={FaIcons.FaExpandAlt} />
                            View full details
                          </ExpandButton>
                        </VideoTitleText>
                      </VideoTitle>
                      <VideoStat>
                        {video.views ? (video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views) : '0'}
                      </VideoStat>
                      <VideoStat>
                        {video.commets || video.comments || '0'}
                      </VideoStat>
                      <VideoStat>
                        {video.content_category || video.category || "Uncategorized"}
                      </VideoStat>
                      <VideoStat>
                        {video.relevance_score ? `${(video.relevance_score * 100).toFixed(0)}%` : '0%'}
                      </VideoStat>
                    </VideoTableRow>
                  );
                })}
              </VideoTable>
            </div>
          )}
          
          <ButtonRow>
            <ActionButton variant="ghost" leftIcon={<IconComponent icon={FaIcons.FaArrowLeft} />} onClick={() => setActiveTab('channels')}>
              Back to Channels
            </ActionButton>
            <ActionButton variant="ghost" leftIcon={<IconComponent icon={FaIcons.FaFileExport} />}>
              Export Data
            </ActionButton>
          </ButtonRow>
        </ChartContainer>
      )}
      
      {activeTab === 'comments' && (
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaComment} />
              Comments for Video: {channelVideos.find(v => v.id === selectedVideo)?.name || "Selected Video"}
            </ChartTitle>
          </ChartHeader>
          
          {isLoadingComments ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#666', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaSpinner} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <p>Loading comments...</p>
            </div>
          ) : videoComments.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaComments} />
              </div>
              <h3>No comments found for this video</h3>
              <p>This video doesn't have any comments yet</p>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              {videoComments.map(comment => (
                <div 
                  key={comment.id} 
                  style={{ 
                    padding: '15px', 
                    borderBottom: '1px solid #eee', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 'bold' }}>{comment.author}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{comment.date}</div>
                  </div>
                  <div>{comment.text}</div>
                  <div style={{ fontSize: '0.9rem', color: '#666', display: 'flex', gap: '10px' }}>
                    <span><IconComponent icon={FaIcons.FaThumbsUp} /> {comment.likes}</span>
                    <span><IconComponent icon={FaIcons.FaReply} /> Reply</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <ButtonRow>
            <ActionButton variant="ghost" leftIcon={<IconComponent icon={FaIcons.FaArrowLeft} />} onClick={() => setActiveTab('videos')}>
              Back to Videos
            </ActionButton>
            <ActionButton variant="primary" leftIcon={<IconComponent icon={FaIcons.FaReply} />}>
              Reply to Comments
            </ActionButton>
          </ButtonRow>
        </ChartContainer>
      )}
      
      {/* Modal para exibir detalhes completos do vídeo */}
      {selectedVideoForDetail && (
        <VideoDetailModal onClick={() => setSelectedVideoForDetail(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedVideoForDetail.nome_do_video || selectedVideoForDetail.title || "Untitled Video"}</ModalTitle>
              <ModalClose onClick={() => setSelectedVideoForDetail(null)}>×</ModalClose>
            </ModalHeader>
            <ModalBody>
              <ModalThumbnail>
                <img 
                  src={getThumbnailUrl(selectedVideoForDetail)}
                  alt={selectedVideoForDetail.nome_do_video || "Video thumbnail"}
                  onError={(e) => {
                    const videoTitle = selectedVideoForDetail.nome_do_video || selectedVideoForDetail.title || "Untitled";
                    const firstLetter = videoTitle.charAt(0).toUpperCase();
                    (e.target as HTMLImageElement).src = `https://placehold.co/1280x720/5F27CD/FFFFFF?text=${encodeURIComponent(firstLetter)}`;
                  }}
                />
              </ModalThumbnail>
              
              {selectedVideoForDetail.descricao && (
                <ModalDescription>
                  {selectedVideoForDetail.descricao}
                </ModalDescription>
              )}
              
              <ModalStats>
                <ModalStatItem>
                  <ModalStatValue>
                    {selectedVideoForDetail.views 
                      ? (selectedVideoForDetail.views >= 1000 
                          ? `${(selectedVideoForDetail.views / 1000).toFixed(1)}K` 
                          : selectedVideoForDetail.views) 
                      : '0'}
                  </ModalStatValue>
                  <ModalStatLabel>Views</ModalStatLabel>
                </ModalStatItem>
                
                <ModalStatItem>
                  <ModalStatValue>
                    {selectedVideoForDetail.commets || selectedVideoForDetail.comments || '0'}
                  </ModalStatValue>
                  <ModalStatLabel>Comments</ModalStatLabel>
                </ModalStatItem>
                
                <ModalStatItem>
                  <ModalStatValue>
                    {selectedVideoForDetail.relevance_score 
                      ? `${(selectedVideoForDetail.relevance_score * 100).toFixed(0)}%` 
                      : '0%'}
                  </ModalStatValue>
                  <ModalStatLabel>Relevance</ModalStatLabel>
                </ModalStatItem>
              </ModalStats>
              
              {selectedVideoForDetail.target_audience && (
                <div>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px' }}>Target Audience</h4>
                  <p style={{ color: '#666', marginBottom: '16px' }}>{selectedVideoForDetail.target_audience}</p>
                </div>
              )}
              
              <ModalActions>
                <ModalActionButton 
                  variant="ghost" 
                  leftIcon={<IconComponent icon={FaIcons.FaTimes} />}
                  onClick={() => setSelectedVideoForDetail(null)}
                >
                  Close
                </ModalActionButton>
                
                {selectedVideoForDetail.video_id_youtube && (
                  <ModalActionButton 
                    variant="primary" 
                    leftIcon={<IconComponent icon={FaIcons.FaYoutube} />}
                    onClick={() => {
                      window.open(`https://www.youtube.com/watch?v=${selectedVideoForDetail.video_id_youtube}`, '_blank');
                    }}
                  >
                    Watch on YouTube
                  </ModalActionButton>
                )}
              </ModalActions>
            </ModalBody>
          </ModalContent>
        </VideoDetailModal>
      )}
    </PageContainer>
  );
};

export default YoutubeMonitoring;