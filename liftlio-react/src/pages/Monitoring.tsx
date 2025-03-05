import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

// Container with modern styling
const PageContainer = styled.div`
  padding: 16px;
  max-width: 1600px;
  margin: 0 auto;
`;

// Alert notification for disconnected account
const AlertNotification = styled.div`
  display: flex;
  align-items: center;
  background: ${props => props.theme.colors.warningLight};
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: ${props => props.theme.radius.lg};
  padding: 12px 20px;
  margin-bottom: 20px;
  
  svg {
    color: ${props => props.theme.colors.warning};
    margin-right: 12px;
    font-size: 20px;
  }
`;

const AlertText = styled.div`
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.fontWeights.medium};
  flex: 1;
`;

const AlertButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.warning};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  cursor: pointer;
  margin-left: 16px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const PageTitle = styled.div`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: #FF0000; /* YouTube red */
    font-size: 28px;
  }
`;

// Grid of metric cards
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  padding: 20px;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background: ${props => props.color || props.theme.colors.primary};
  }
`;

const MetricIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${props => props.theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color ? `${props.color}20` : `${props.theme.colors.primary}20`};
  color: ${props => props.color || props.theme.colors.primary};
  margin-bottom: 12px;
`;

const MetricLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.darkGrey};
  margin-bottom: 8px;
`;

const MetricValue = styled.div`
  font-size: ${props => props.theme.fontSizes['3xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
`;

// Channels section styling
const ChannelsSection = styled.div`
  margin-top: 32px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const ChannelsList = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  overflow: hidden;
`;

const ChannelCard = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background: ${props => props.theme.colors.lightGrey}20;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const ChannelRank = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${props => props.theme.radius.circle};
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-right: 16px;
`;

const ChannelAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${props => props.theme.radius.circle};
  overflow: hidden;
  margin-right: 16px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 4px;
  color: ${props => props.theme.colors.text};
`;

const ChannelStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  
  svg {
    margin-right: 6px;
    font-size: 14px;
  }
`;

const ExpandButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px;
  border-radius: ${props => props.theme.radius.circle};
  
  &:hover {
    background: ${props => props.theme.colors.lightGrey};
    color: ${props => props.theme.colors.primary};
  }
`;

// Analytics Charts section
const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-top: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled(Card)`
  padding: 20px;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
    color: ${props => props.theme.colors.primary};
  }
`;

const TimeframeButtons = styled.div`
  display: flex;
  background: ${props => props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.pill};
  padding: 4px;
`;

const TimeButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'white' : 'transparent'};
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  padding: 6px 12px;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.active ? props.theme.shadows.sm : 'none'};
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

// Upcoming videos section
const UpcomingVideosSection = styled.div`
  margin-top: 24px;
`;

const VideoCard = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.sm};
  margin-bottom: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const VideoThumbnail = styled.div`
  position: relative;
  height: 180px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%);
  }
`;

const VideoInfo = styled.div`
  padding: 16px;
`;

const VideoTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text};
`;

const VideoDetails = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const VideoStats = styled.div`
  display: flex;
  gap: 12px;
`;

const VideoStat = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  
  svg {
    margin-right: 4px;
  }
`;

const PublishDate = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.darkGrey};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
  }
`;

// Sample data
const channelData = [
  {
    id: 1,
    rank: 1,
    name: "Chill Flow",
    avatar: "https://via.placeholder.com/48",
    videos: 15,
    comments: 35,
    engagement: 19
  },
  {
    id: 2,
    rank: 2,
    name: "Target Hit",
    avatar: "https://via.placeholder.com/48",
    videos: 13,
    comments: 32,
    engagement: 12
  },
  {
    id: 3,
    rank: 3,
    name: "Writing and wisdom",
    avatar: "https://via.placeholder.com/48",
    videos: 9,
    comments: 16,
    engagement: 9
  },
  {
    id: 4,
    rank: 4,
    name: "Tech Innovations",
    avatar: "https://via.placeholder.com/48",
    videos: 22,
    comments: 41,
    engagement: 15
  },
  {
    id: 5,
    rank: 5,
    name: "Future Insights",
    avatar: "https://via.placeholder.com/48",
    videos: 7,
    comments: 19,
    engagement: 8
  }
];

const videoData = [
  {
    id: 1,
    thumbnail: "https://via.placeholder.com/300x180",
    title: "How to Master YouTube Algorithm in 2025",
    views: 12450,
    likes: 1845,
    comments: 376,
    publishDate: "2025-02-15"
  },
  {
    id: 2,
    thumbnail: "https://via.placeholder.com/300x180",
    title: "10 Tips for Growing Your Channel Fast",
    views: 8750,
    likes: 1243,
    comments: 198,
    publishDate: "2025-03-01"
  },
  {
    id: 3,
    thumbnail: "https://via.placeholder.com/300x180",
    title: "Content Creation Secrets Nobody Shares",
    views: 15280,
    likes: 2341,
    comments: 412,
    publishDate: "2025-03-10"
  }
];

const engagementData = [
  { date: 'Jan', views: 25000, likes: 1250, comments: 145 },
  { date: 'Feb', views: 28000, likes: 1560, comments: 165 },
  { date: 'Mar', views: 32000, likes: 1980, comments: 180 },
  { date: 'Apr', views: 38000, likes: 2150, comments: 220 },
  { date: 'May', views: 45000, likes: 2840, comments: 310 },
  { date: 'Jun', views: 42000, likes: 2650, comments: 290 },
  { date: 'Jul', views: 50000, likes: 3100, comments: 350 }
];

const Monitoring: React.FC = () => {
  const [timeframe, setTimeframe] = useState("month");
  const [showAlert, setShowAlert] = useState(true);
  const [expandedChannel, setExpandedChannel] = useState<number | null>(null);
  
  const toggleExpand = (channelId: number) => {
    if (expandedChannel === channelId) {
      setExpandedChannel(null);
    } else {
      setExpandedChannel(channelId);
    }
  };
  
  return (
    <PageContainer>
      {showAlert && (
        <div>
          <AlertNotification>
            <IconComponent icon={FaIcons.FaExclamationTriangle} />
            <AlertText>
              YouTube account disconnected, please reauthorize in integrations
            </AlertText>
            <AlertButton onClick={() => setShowAlert(false)}>
              Dismiss
            </AlertButton>
          </AlertNotification>
        </div>
      )}
      
      <PageTitle>
        <IconComponent icon={FaIcons.FaYoutube} />
        Video post monitoring
      </PageTitle>
      
      <MetricsGrid>
        <MetricCard color="#673AB7">
          <MetricIcon color="#673AB7">
            <IconComponent icon={FaIcons.FaChartLine} />
          </MetricIcon>
          <MetricLabel>Channels</MetricLabel>
          <MetricValue>20/40</MetricValue>
        </MetricCard>
        
        <MetricCard color="#00C781">
          <MetricIcon color="#00C781">
            <IconComponent icon={FaIcons.FaVideo} />
          </MetricIcon>
          <MetricLabel>Videos</MetricLabel>
          <MetricValue>150</MetricValue>
        </MetricCard>
        
        <MetricCard color="#FF4081">
          <MetricIcon color="#FF4081">
            <IconComponent icon={FaIcons.FaHeart} />
          </MetricIcon>
          <MetricLabel>Reactions</MetricLabel>
          <MetricValue>150</MetricValue>
        </MetricCard>
        
        <MetricCard color="#2196F3">
          <MetricIcon color="#2196F3">
            <IconComponent icon={FaIcons.FaCommentAlt} />
          </MetricIcon>
          <MetricLabel>Comment today</MetricLabel>
          <MetricValue>150</MetricValue>
        </MetricCard>
      </MetricsGrid>
      
      <ChannelsSection>
        <SectionHeader>
          <SectionTitle>Channels</SectionTitle>
        </SectionHeader>
        
        <ChannelsList>
          {channelData.map((channel) => (
            <div key={channel.id}>
              <ChannelCard>
                <ChannelRank>{channel.rank}</ChannelRank>
                <ChannelAvatar>
                  <img src={channel.avatar} alt={channel.name} />
                </ChannelAvatar>
                <ChannelInfo>
                  <ChannelName>{channel.name}</ChannelName>
                  <ChannelStats>
                    <StatItem>
                      <IconComponent icon={FaIcons.FaVideo} />
                      {channel.videos} videos
                    </StatItem>
                    <StatItem>
                      <IconComponent icon={FaIcons.FaComment} />
                      {channel.comments} comments
                    </StatItem>
                    <StatItem>
                      <IconComponent icon={FaIcons.FaChartBar} />
                      {channel.engagement} engagement
                    </StatItem>
                  </ChannelStats>
                </ChannelInfo>
                <ExpandButton onClick={() => toggleExpand(channel.id)}>
                  <IconComponent icon={expandedChannel === channel.id ? FaIcons.FaChevronUp : FaIcons.FaChevronDown} />
                </ExpandButton>
              </ChannelCard>
              
              {expandedChannel === channel.id && (
                <div style={{ background: "#f9f9f9", padding: "16px" }}>
                  <div style={{ padding: "0 0 0 60px" }}>
                    <h4>Latest Activity</h4>
                    <p>This channel has posted 3 new videos in the last 7 days.</p>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <button>View Channel</button>
                      <button>See Analytics</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </ChannelsList>
      </ChannelsSection>
      
      <AnalyticsGrid>
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartArea} />
              Engagement Overview
            </ChartTitle>
            <TimeframeButtons>
              <TimeButton 
                active={timeframe === "week"} 
                onClick={() => setTimeframe("week")}
              >
                Week
              </TimeButton>
              <TimeButton 
                active={timeframe === "month"} 
                onClick={() => setTimeframe("month")}
              >
                Month
              </TimeButton>
              <TimeButton 
                active={timeframe === "quarter"} 
                onClick={() => setTimeframe("quarter")}
              >
                Quarter
              </TimeButton>
              <TimeButton 
                active={timeframe === "year"} 
                onClick={() => setTimeframe("year")}
              >
                Year
              </TimeButton>
            </TimeframeButtons>
          </ChartHeader>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={engagementData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#673AB7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#673AB7" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4081" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF4081" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C781" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00C781" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#673AB7" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)" 
                  name="Views"
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="likes" 
                  stroke="#FF4081" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLikes)" 
                  name="Likes"
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="comments" 
                  stroke="#00C781" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorComments)" 
                  name="Comments"
                  activeDot={{ r: 6 }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{
                    paddingBottom: '20px'
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
        
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartPie} />
              Content Distribution
            </ChartTitle>
          </ChartHeader>
          
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Tutorials', value: 45 },
                    { name: 'Reviews', value: 25 },
                    { name: 'Vlogs', value: 15 },
                    { name: 'Interviews', value: 15 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#673AB7" />
                  <Cell fill="#FF4081" />
                  <Cell fill="#00C781" />
                  <Cell fill="#2196F3" />
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </AnalyticsGrid>
      
      <UpcomingVideosSection>
        <SectionHeader>
          <SectionTitle>Upcoming Videos</SectionTitle>
        </SectionHeader>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {videoData.map(video => (
            <div key={video.id}>
              <VideoCard>
                <VideoThumbnail>
                  <img src={video.thumbnail} alt={video.title} />
                </VideoThumbnail>
                <VideoInfo>
                  <VideoTitle>{video.title}</VideoTitle>
                  <VideoDetails>
                    <VideoStats>
                      <VideoStat>
                        <IconComponent icon={FaIcons.FaEye} />
                        {video.views.toLocaleString()}
                      </VideoStat>
                      <VideoStat>
                        <IconComponent icon={FaIcons.FaThumbsUp} />
                        {video.likes.toLocaleString()}
                      </VideoStat>
                      <VideoStat>
                        <IconComponent icon={FaIcons.FaComment} />
                        {video.comments.toLocaleString()}
                      </VideoStat>
                    </VideoStats>
                  </VideoDetails>
                  <PublishDate>
                    <IconComponent icon={FaIcons.FaCalendarAlt} />
                    {new Date(video.publishDate).toLocaleDateString()}
                  </PublishDate>
                </VideoInfo>
              </VideoCard>
            </div>
          ))}
        </div>
      </UpcomingVideosSection>
    </PageContainer>
  );
};

export default Monitoring;