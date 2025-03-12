import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import Card from '../components/Card';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

// Shared styled components
const PageContainer = styled.div`
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 16px;
    color: #FF0000; /* YouTube red */
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
    background: ${props => props.theme.colors.lightGrey};
  }
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  position: relative;
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: ${props => props.theme.fontSizes.md};
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
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

const StatCard = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
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
  color: ${props => props.theme.colors.text};
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
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
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
  background: ${props => props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.pill};
  padding: 4px;
`;

const TimeOption = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? 'white' : 'transparent'};
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
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const ChannelList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
`;

const ChannelCard = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: ${props => props.theme.radius.lg};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey};
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active ? props.theme.shadows.md : props.theme.shadows.sm};
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${props => props.theme.colors.primary};
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  ${props => props.active && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: ${props.theme.colors.primary};
    }
  `}
`;

const ChannelBadge = styled.div<{ status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.xs};
  background: ${props => 
    props.status === 'active' ? props.theme.colors.successLight : 
    props.status === 'pending' ? props.theme.colors.warningLight : 
    props.theme.colors.lightGrey};
  color: ${props => 
    props.status === 'active' ? props.theme.colors.success : 
    props.status === 'pending' ? props.theme.colors.warning : 
    props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const ChannelIcon = styled.div`
  width: 56px;
  height: 56px;
  background: ${props => props.theme.colors.gradient.primary};
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  flex-shrink: 0;
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

const ChannelStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

const ChannelStatItem = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  
  svg {
    margin-right: 4px;
    font-size: 12px;
  }
`;

const EngagementPill = styled.div`
  background: ${props => props.theme.colors.primary}15;
  color: ${props => props.theme.colors.primary};
  padding: 4px 12px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-left: auto;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
  }
`;

// Video performance section
const VideoTable = styled.div`
  width: 100%;
  border-collapse: collapse;
`;

const VideoTableHeader = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.sm};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const VideoTableRow = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.colors.lightGrey}10;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const VideoTitle = styled.div`
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const VideoThumbnail = styled.div`
  width: 80px;
  height: 45px;
  border-radius: ${props => props.theme.radius.sm};
  background: #000;
  overflow: hidden;
  margin-right: 16px;
  position: relative;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-left: 14px solid white;
    border-bottom: 8px solid transparent;
    opacity: 0.8;
  }
`;

const VideoTitleText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VideoStat = styled.div`
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.md};
  text-align: center;
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
  background: ${props => props.active ? props.theme.colors.primary : 'white'};
  color: ${props => props.active ? 'white' : props.theme.colors.darkGrey};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey};
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

const ActionButton = styled.button<{ primary?: boolean }>`
  background: ${props => props.primary ? props.theme.colors.gradient.primary : 'white'};
  color: ${props => props.primary ? 'white' : props.theme.colors.darkGrey};
  border: ${props => props.primary ? 'none' : `1px solid ${props.theme.colors.grey}`};
  border-radius: ${props => props.theme.radius.md};
  padding: 12px 20px;
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.primary ? props.theme.shadows.md : props.theme.shadows.sm};
    background: ${props => props.primary ? props.theme.colors.gradient.accent : props.theme.colors.lightGrey};
  }
`;

// Sample data for YouTube channels
const channels = [
  { 
    id: 1,
    name: 'Tech Enthusiast',
    subscribers: '1.2M',
    views: '45M',
    category: 'Technology',
    status: 'active',
    lastVideo: '2 days ago',
    engagementRate: '8.2%'
  },
  { 
    id: 2,
    name: 'LED Master',
    subscribers: '850K',
    views: '32M',
    category: 'DIY & Crafts',
    status: 'active',
    lastVideo: '1 week ago',
    engagementRate: '6.5%'
  },
  { 
    id: 3,
    name: 'Light It Up',
    subscribers: '2.4M',
    views: '78M',
    category: 'Home Improvement',
    status: 'pending',
    lastVideo: '3 days ago',
    engagementRate: '9.1%'
  },
  { 
    id: 4,
    name: 'DIY Electronics',
    subscribers: '620K',
    views: '18M',
    category: 'Technology',
    status: 'active',
    lastVideo: '4 days ago',
    engagementRate: '7.3%'
  },
  { 
    id: 5,
    name: 'Smart Home Guide',
    subscribers: '1.8M',
    views: '56M',
    category: 'Tech Reviews',
    status: 'inactive',
    lastVideo: '2 weeks ago',
    engagementRate: '5.9%'
  }
];

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

// Component implementation
const YoutubeMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [timeframe, setTimeframe] = useState('month');
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
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
        <Tab active={activeTab === 'videos'} onClick={() => setActiveTab('videos')}>
          <TabIcon><IconComponent icon={FaIcons.FaVideo} /></TabIcon>
          Videos
        </Tab>
        <Tab active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
          <TabIcon><IconComponent icon={FaIcons.FaComment} /></TabIcon>
          Comments
        </Tab>
        <Tab active={activeTab === 'automation'} onClick={() => setActiveTab('automation')}>
          <TabIcon><IconComponent icon={FaIcons.FaRobot} /></TabIcon>
          Automation
        </Tab>
      </TabsContainer>
      
      {activeTab === 'overview' && (
        <>
          <StatsGrid>
            <StatCard>
              <StatCardHeader>
                <StatLabel>Total Views</StatLabel>
                <StatIconContainer color="#5856D6">
                  <IconComponent icon={FaIcons.FaEye} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>3.2M</StatValue>
              <StatChange positive={true}>
                <IconComponent icon={FaIcons.FaArrowUp} />
                18.5% from last month
              </StatChange>
              <StatLineSpacer />
              <MinimalTrendLine>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateTrendData(3.2, 0.05).map((value, index) => ({ name: index, value }))}>
                    <Line type="monotone" dataKey="value" stroke="#5856D6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </MinimalTrendLine>
            </StatCard>
            
            <StatCard>
              <StatCardHeader>
                <StatLabel>Total Likes</StatLabel>
                <StatIconContainer color="#FF9500">
                  <IconComponent icon={FaIcons.FaThumbsUp} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>284K</StatValue>
              <StatChange positive={true}>
                <IconComponent icon={FaIcons.FaArrowUp} />
                22.1% from last month
              </StatChange>
              <StatLineSpacer />
              <MinimalTrendLine>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateTrendData(284, 0.07).map((value, index) => ({ name: index, value }))}>
                    <Line type="monotone" dataKey="value" stroke="#FF9500" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </MinimalTrendLine>
            </StatCard>
            
            <StatCard>
              <StatCardHeader>
                <StatLabel>Comments Posted</StatLabel>
                <StatIconContainer color="#34C759">
                  <IconComponent icon={FaIcons.FaComment} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>1,845</StatValue>
              <StatChange positive={true}>
                <IconComponent icon={FaIcons.FaArrowUp} />
                15.4% from last month
              </StatChange>
              <StatLineSpacer />
              <MinimalTrendLine>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateTrendData(1845, 0.1).map((value, index) => ({ name: index, value }))}>
                    <Line type="monotone" dataKey="value" stroke="#34C759" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </MinimalTrendLine>
            </StatCard>
            
            <StatCard>
              <StatCardHeader>
                <StatLabel>Engagement Rate</StatLabel>
                <StatIconContainer color="#FF2D55">
                  <IconComponent icon={FaIcons.FaChartLine} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue>7.6%</StatValue>
              <StatChange positive={false}>
                <IconComponent icon={FaIcons.FaArrowDown} />
                0.8% from last month
              </StatChange>
              <StatLineSpacer />
              <MinimalTrendLine>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateTrendData(7.6, 0.06).map((value, index) => ({ name: index, value }))}>
                    <Line type="monotone" dataKey="value" stroke="#FF2D55" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </MinimalTrendLine>
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
                      <VideoStatLabel>Views</VideoStatLabel>
                    </VideoStat>
                    <VideoStat>
                      {(video.comments / 1000).toFixed(1)}K
                      <VideoStatLabel>Comments</VideoStatLabel>
                    </VideoStat>
                    <VideoStat>
                      {(video.likes / 1000).toFixed(1)}K
                      <VideoStatLabel>Likes</VideoStatLabel>
                    </VideoStat>
                    <VideoStat>
                      {video.retention}%
                      <VideoStatLabel>Retention</VideoStatLabel>
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
              <FilterButton active={channelFilter === 'pending'} onClick={() => setChannelFilter('pending')}>
                <IconComponent icon={FaIcons.FaClock} />
                Pending
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
              {channels
                .filter(channel => 
                  (channelFilter === 'all' || channel.status === channelFilter) &&
                  (searchTerm === '' || channel.name.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(channel => (
                <ChannelCard 
                  key={channel.id} 
                  active={selectedChannel === channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <ChannelBadge status={channel.status}>
                    {channel.status === 'active' && <IconComponent icon={FaIcons.FaCheck} />}
                    {channel.status === 'pending' && <IconComponent icon={FaIcons.FaClock} />}
                    {channel.status === 'inactive' && <IconComponent icon={FaIcons.FaPause} />}
                    {channel.status.charAt(0).toUpperCase() + channel.status.slice(1)}
                  </ChannelBadge>
                  
                  <ChannelIcon>
                    <IconComponent icon={FaIcons.FaYoutube} />
                  </ChannelIcon>
                  
                  <ChannelInfo>
                    <ChannelName>{channel.name}</ChannelName>
                    <ChannelStats>
                      <ChannelStatItem>
                        <IconComponent icon={FaIcons.FaUser} />
                        {channel.subscribers} subscribers
                      </ChannelStatItem>
                      <ChannelStatItem>
                        <IconComponent icon={FaIcons.FaEye} />
                        {channel.views} views
                      </ChannelStatItem>
                      <ChannelStatItem>
                        <IconComponent icon={FaIcons.FaClock} />
                        Last video: {channel.lastVideo}
                      </ChannelStatItem>
                    </ChannelStats>
                  </ChannelInfo>
                  
                  <EngagementPill>
                    <IconComponent icon={FaIcons.FaChartLine} />
                    {channel.engagementRate}
                  </EngagementPill>
                </ChannelCard>
              ))}
            </ChannelList>
            
            <ButtonRow>
              <ActionButton>
                <IconComponent icon={FaIcons.FaSync} />
                Refresh Data
              </ActionButton>
              <ActionButton primary>
                <IconComponent icon={FaIcons.FaPlus} />
                Add New Channel
              </ActionButton>
            </ButtonRow>
          </ChannelsContainer>
        </>
      )}
      
      {activeTab === 'videos' && (
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaVideo} />
              Videos Ready for Comment Automation
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
                  <VideoStatLabel>Views</VideoStatLabel>
                </VideoStat>
                <VideoStat>
                  {(video.comments / 1000).toFixed(1)}K
                  <VideoStatLabel>Comments</VideoStatLabel>
                </VideoStat>
                <VideoStat>
                  {(video.likes / 1000).toFixed(1)}K
                  <VideoStatLabel>Likes</VideoStatLabel>
                </VideoStat>
                <VideoStat>
                  {video.retention}%
                  <VideoStatLabel>Retention</VideoStatLabel>
                </VideoStat>
              </VideoTableRow>
            ))}
          </VideoTable>
          
          <ButtonRow>
            <ActionButton>
              <IconComponent icon={FaIcons.FaFileExport} />
              Export Data
            </ActionButton>
            <ActionButton primary>
              <IconComponent icon={FaIcons.FaMagic} />
              Setup Automation
            </ActionButton>
          </ButtonRow>
        </ChartContainer>
      )}
      
      {activeTab === 'comments' && (
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaComment} />
              Comment Templates & Automation
            </ChartTitle>
          </ChartHeader>
          
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
              <IconComponent icon={FaIcons.FaComments} />
            </div>
            <h3>No comment templates created yet</h3>
            <p>Create a comment template to automate your responses</p>
            <div style={{ marginTop: '24px' }}>
              <ActionButton primary>
                <IconComponent icon={FaIcons.FaPlus} />
                Create Template
              </ActionButton>
            </div>
          </div>
        </ChartContainer>
      )}
      
      {activeTab === 'automation' && (
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaRobot} />
              Automation Rules
            </ChartTitle>
          </ChartHeader>
          
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
              <IconComponent icon={FaIcons.FaCogs} />
            </div>
            <h3>No automation rules set up</h3>
            <p>Create rules to automate your YouTube engagement</p>
            <div style={{ marginTop: '24px' }}>
              <ActionButton primary>
                <IconComponent icon={FaIcons.FaPlus} />
                Create Rule
              </ActionButton>
            </div>
          </div>
        </ChartContainer>
      )}
    </PageContainer>
  );
};

export default YoutubeMonitoring;