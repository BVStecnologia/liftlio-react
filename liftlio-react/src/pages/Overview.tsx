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

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text};
  position: relative;
  display: inline-block;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 0;
    width: 40%;
    height: 4px;
    background: ${props => props.theme.colors.gradient.primary};
    border-radius: 2px;
  }
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.6s ease-out forwards;
`;

const StatDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  margin-bottom: 4px;
  letter-spacing: -0.5px;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const StatIcon = styled.div<{ bgColor: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: ${props => props.theme.radius.lg};
  background: ${props => props.bgColor};
  color: white;
  font-size: 1.5rem;
  box-shadow: ${props => props.theme.shadows.md};
`;

const KeywordTable = styled.div`
  margin-top: 30px;
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.md};
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
  
  const renderStatsIcon = (iconName: keyof typeof FaIcons, bgColor: string) => {
    return (
      <StatIcon bgColor={bgColor}>
        {React.createElement(FaIcons[iconName])}
      </StatIcon>
    );
  };
  
  return (
    <div>
      <PageTitle>Dashboard Overview</PageTitle>
      
      <StatsGrid>
        <Card elevation="medium" hoverEffect={true}>
          <StatDisplay>
            <StatContent>
              <StatLabel>Engagements posted</StatLabel>
              <StatValue>55</StatValue>
            </StatContent>
            {renderStatsIcon('FaComments', 'linear-gradient(135deg, #5e35b1 0%, #8561c5 100%)')}
          </StatDisplay>
        </Card>
        <Card elevation="medium" hoverEffect={true}>
          <StatDisplay>
            <StatContent>
              <StatLabel>LEDs Posted</StatLabel>
              <StatValue>0</StatValue>
            </StatContent>
            {renderStatsIcon('FaVideo', 'linear-gradient(135deg, #00A9DB 0%, #81d4fa 100%)')}
          </StatDisplay>
        </Card>
        <Card elevation="medium" hoverEffect={true}>
          <StatDisplay>
            <StatContent>
              <StatLabel>Total Views</StatLabel>
              <StatValue>281,615</StatValue>
            </StatContent>
            {renderStatsIcon('FaEye', 'linear-gradient(135deg, #00C781 0%, #82ffc9 100%)')}
          </StatDisplay>
        </Card>
      </StatsGrid>
      
      <Card 
        title="Performance Analytics" 
        icon="FaChartLine" 
        elevation="medium" 
        collapsible={true}
        headerAction={
          <ChartOptions>
            <ChartOption 
              active={chartType === 'area'} 
              onClick={() => setChartType('area')}
            >
              Area Chart
            </ChartOption>
            <ChartOption 
              active={chartType === 'line'} 
              onClick={() => setChartType('line')}
            >
              Line Chart
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
                    <stop offset="5%" stopColor="#5e35b1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#5e35b1" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8561c5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8561c5" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C781" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00C781" stopOpacity={0.2}/>
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
                  stroke="#5e35b1" 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engagement"
                  stroke="#8561c5" 
                  fillOpacity={1} 
                  fill="url(#colorEngagement)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#00C781" 
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
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
                  stroke="#5e35b1" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engagement"
                  stroke="#8561c5" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#00C781" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </Card>
      
      <Card title="Keyword Performance" icon="FaHashtag" elevation="medium">
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
      </Card>
    </div>
  );
};

export default Overview;