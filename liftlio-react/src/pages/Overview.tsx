import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import * as FaIcons from 'react-icons/fa';
import Card from '../components/Card';
import SentimentIndicator from '../components/SentimentIndicator';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost' }>`
  padding: ${props => props.variant === 'ghost' ? '8px 12px' : '10px 16px'};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  
  ${props => {
    if (props.variant === 'primary') {
      return `
        background: ${props.theme.colors.gradient.primary};
        color: white;
        border: none;
        box-shadow: ${props.theme.shadows.sm};
        
        &:hover {
          box-shadow: ${props.theme.shadows.md};
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'secondary') {
      return `
        background: ${props.theme.colors.gradient.secondary};
        color: white;
        border: none;
        box-shadow: ${props.theme.shadows.sm};
        
        &:hover {
          box-shadow: ${props.theme.shadows.md};
          transform: translateY(-2px);
        }
      `;
    } else {
      return `
        background: transparent;
        color: ${props.theme.colors.darkGrey};
        border: 1px solid ${props.theme.colors.grey};
        
        &:hover {
          background: ${props.theme.colors.lightGrey};
          border-color: ${props.theme.colors.darkGrey};
          color: ${props.theme.colors.text};
        }
      `;
    }
  }}
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(Card)`
  flex: 1;
`;

const StatsGrid = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.6s ease-out forwards;
`;

const StatDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['4xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  background: ${props => props.theme.colors.gradient.primary};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
`;

const StatGrowth = styled.div<{ positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.error};
  background-color: ${props => props.positive ? 'rgba(0, 201, 136, 0.1)' : 'rgba(255, 64, 87, 0.1)'};
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.pill};
  margin-left: 12px;
  
  svg {
    margin-right: 4px;
  }
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
`;

const StatIcon = styled.div<{ bgColor: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${props => props.theme.radius.lg};
  background: ${props => props.bgColor};
  color: white;
  font-size: 1.5rem;
  box-shadow: ${props => props.theme.shadows.md};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    background: linear-gradient(45deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 60%);
    z-index: 1;
    transform: translateX(-100%) rotate(45deg);
    animation: shine 3s infinite;
  }
  
  @keyframes shine {
    0% {
      transform: translateX(-100%) rotate(45deg);
    }
    20%, 100% {
      transform: translateX(100%) rotate(45deg);
    }
  }
`;

const GlassmorphicCard = styled.div`
  margin: 40px 0;
  padding: 30px;
  border-radius: ${props => props.theme.radius.xl};
  background: ${props => props.theme.colors.gradient.glass};
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: ${props => props.theme.shadows.glass};
  animation: ${fadeIn} 0.8s ease-out forwards;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
    opacity: 0.5;
  }
`;

const InsightTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin-bottom: 16px;
`;

const InsightText = styled.p`
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  color: ${props => props.theme.colors.text};
  margin-bottom: 24px;
`;

const QuickActionButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.theme.colors.gradient.accent};
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all ${props => props.theme.transitions.default};
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.glow};
  }
  
  svg {
    font-size: 1rem;
  }
`;

const KeywordTable = styled.div`
  margin-top: 30px;
  background: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.sm};
  overflow: hidden;
  animation: ${fadeIn} 0.8s ease-out forwards;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 2fr 1fr 1fr;
  padding: 16px 24px;
  background: ${props => props.theme.colors.background};
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.darkGrey};
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 2fr 1fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.lightGrey};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div`
  display: flex;
  align-items: center;
`;

const KeywordCell = styled(TableCell)`
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const NumericCell = styled(TableCell)`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.darkGrey};
`;

const VideoLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VideoLink = styled.a`
  color: ${props => props.theme.colors.primary};
  font-size: ${props => props.theme.fontSizes.sm};
  text-decoration: none;
  display: flex;
  align-items: center;
  
  &:hover {
    text-decoration: underline;
  }
  
  svg {
    margin-right: 6px;
    font-size: 0.8rem;
  }
`;

const CategoryTag = styled.span`
  background: ${props => props.theme.colors.gradient.primary};
  color: white;
  padding: 6px 12px;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: inline-block;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const AudienceTag = styled.span`
  background-color: ${props => props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.darkGrey};
  padding: 4px 10px;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const ChartContainer = styled.div`
  height: 350px;
  margin-top: 15px;
`;

const ChartOptions = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
`;

const ChartOption = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? props.theme.colors.gradient.primary : 'white'};
  color: ${props => props.active ? 'white' : props.theme.colors.darkGrey};
  border: 1px solid ${props => props.active ? 'transparent' : props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.active ? props.theme.shadows.sm : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

// Sample data
const chartData = [
  { name: 'Feb 24', views: 15000, engagement: 7000, leads: 1200 },
  { name: 'Feb 25', views: 13000, engagement: 6000, leads: 1000 },
  { name: 'Feb 26', views: 12000, engagement: 7500, leads: 1300 },
  { name: 'Feb 27', views: 13500, engagement: 8000, leads: 1400 },
  { name: 'Feb 28', views: 16000, engagement: 9500, leads: 1800 },
  { name: 'Mar 1', views: 19000, engagement: 11000, leads: 2100 },
  { name: 'Mar 2', views: 22000, engagement: 13000, leads: 2700 },
];

const keywordsData = [
  {
    id: 1,
    keyword: 'ai product reviews',
    sentiment: 82.5,
    views: 23221,
    videos: 4,
    likes: 97,
    comments: 8,
    topVideos: ['1° click to Video', '2° click to Video', '3° click to Video'],
    category: 'AI Content Creation',
    audience: 'Affiliate marketers'
  },
  {
    id: 2,
    keyword: 'ai affiliate marketing',
    sentiment: 83.75,
    views: 138917,
    videos: 4,
    likes: 1400,
    comments: 48,
    topVideos: ['1° click to Video', '2° click to Video', '3° click to Video'],
    category: 'AI-Powered Affiliate',
    audience: 'Affiliate marketers matching escritor\'s'
  },
  {
    id: 3,
    keyword: 'passive income with ai',
    sentiment: 68.75,
    views: 119477,
    videos: 4,
    likes: 1281,
    comments: 48,
    topVideos: ['1° click to Video', '2° click to Video', '3° click to Video'],
    category: 'AI Business Strategy',
    audience: 'Digital entrepreneur'
  }
];

type ChartType = 'area' | 'line';

const Overview: React.FC = () => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
  
  const renderStatsIcon = (iconName: keyof typeof FaIcons, bgColor: string) => {
    return (
      <StatIcon bgColor={bgColor}>
        {/* @ts-ignore - IconType typings issue */}
        {React.createElement(FaIcons[iconName])}
      </StatIcon>
    );
  };
  
  return (
    <div>
      <DashboardHeader>
        <PageTitle>Dashboard Overview</PageTitle>
      </DashboardHeader>
      
      <StatsGrid>
        <Card elevation="medium">
          <StatDisplay>
            <StatContent>
              <StatLabel>Engagements posted</StatLabel>
              <StatValue>55</StatValue>
            </StatContent>
            {renderStatsIcon('FaComments', 'linear-gradient(135deg, #673AB7 0%, #9575CD 100%)')}
          </StatDisplay>
        </Card>
        <Card elevation="medium">
          <StatDisplay>
            <StatContent>
              <StatLabel>LEDs Posted</StatLabel>
              <StatValue>0</StatValue>
            </StatContent>
            {renderStatsIcon('FaVideo', 'linear-gradient(135deg, #673AB7 0%, #9575CD 100%)')}
          </StatDisplay>
        </Card>
      </StatsGrid>
      
      <Card 
        title="Performance Analytics" 
        icon="FaChartLine" 
        elevation="medium" 
        headerAction={
          <ChartOptions>
            <ChartOption 
              active={timeframe === 'week'} 
              onClick={() => setTimeframe('week')}
            >
              Week
            </ChartOption>
            <ChartOption 
              active={timeframe === 'month'} 
              onClick={() => setTimeframe('month')}
            >
              Month
            </ChartOption>
            <ChartOption 
              active={timeframe === 'year'} 
              onClick={() => setTimeframe('year')}
            >
              Year
            </ChartOption>
          </ChartOptions>
        }
      >
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4E0EB3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4E0EB3" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7F3CEF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7F3CEF" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C988" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00C988" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  name="Views"
                  stroke="#4E0EB3" 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                  activeDot={{ r: 8, strokeWidth: 0, fill: "#4E0EB3" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engagement"
                  stroke="#7F3CEF" 
                  fillOpacity={1} 
                  fill="url(#colorEngagement)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#00C988" 
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  name="Views"
                  stroke="#4E0EB3" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: "#4E0EB3" }}
                  activeDot={{ r: 8, strokeWidth: 0, fill: "#4E0EB3" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engagement"
                  stroke="#7F3CEF" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: "#7F3CEF" }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#7F3CEF" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#00C988" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: "#00C988" }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#00C988" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </Card>
      
      {/* Glassmorph card removed to match the reference image */}
      
      <KeywordTable>
        <TableHeader>
          <TableCell>Keywords</TableCell>
          <TableCell>Sentiment</TableCell>
          <TableCell>Views</TableCell>
          <TableCell>Videos</TableCell>
          <TableCell>Likes</TableCell>
          <TableCell>Top Video</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Audience</TableCell>
        </TableHeader>
        
        {keywordsData.map(keyword => (
          <TableRow key={keyword.id}>
            <KeywordCell>{keyword.keyword}</KeywordCell>
            <TableCell>
              <SentimentIndicator 
                percentage={keyword.sentiment} 
                size="small"
                animated={true} 
                showIcon={true}
              />
            </TableCell>
            <NumericCell>{keyword.views.toLocaleString()}</NumericCell>
            <NumericCell>{keyword.videos}</NumericCell>
            <NumericCell>{keyword.likes}</NumericCell>
            <TableCell>
              <VideoLinks>
                {keyword.topVideos.map((video, index) => (
                  <VideoLink href="#" key={index}>
                    {/* @ts-ignore - IconType typings issue */}
                    {React.createElement(FaIcons.FaPlayCircle)}
                    {video}
                  </VideoLink>
                ))}
              </VideoLinks>
            </TableCell>
            <TableCell>
              <CategoryTag>{keyword.category}</CategoryTag>
            </TableCell>
            <TableCell>
              <AudienceTag>{keyword.audience}</AudienceTag>
            </TableCell>
          </TableRow>
        ))}
      </KeywordTable>
    </div>
  );
};

export default Overview;