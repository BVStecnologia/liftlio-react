import React, { useState } from 'react';
import styled from 'styled-components';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import { FaYoutube, FaCheck, FaBell, FaChartLine, FaFilter, FaInfoCircle, FaThumbsUp, FaComment, FaEye } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: #FF0000; /* YouTube red */
  }
`;

const ChartContainer = styled.div`
  margin-bottom: 30px;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
`;

const TimeframeSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  background-color: white;
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(Card)`
  padding: 20px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['3xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
  }
`;

const StatChange = styled.span<{ positive: boolean }>`
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.error};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-left: 10px;
`;

const GridLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChannelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
`;

const ChannelCard = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: ${props => props.theme.radius.md};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.grey};
  background: ${props => props.active ? props.theme.colors.primaryLight : 'white'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.active ? props.theme.colors.primaryLight : props.theme.colors.lightGrey};
  }
`;

const ChannelIcon = styled.div`
  width: 50px;
  height: 50px;
  background: #FF0000;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
`;

const ChannelStats = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-top: 4px;
`;

const ChannelStatus = styled.div<{ status: string }>`
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.sm};
  font-size: ${props => props.theme.fontSizes.xs};
  background: ${props => 
    props.status === 'active' ? props.theme.colors.successLight : 
    props.status === 'pending' ? props.theme.colors.warningLight : 
    props.theme.colors.lightGrey};
  color: ${props => 
    props.status === 'active' ? props.theme.colors.success : 
    props.status === 'pending' ? props.theme.colors.warning : 
    props.theme.colors.darkGrey};
  display: flex;
  align-items: center;
  width: fit-content;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const ActionButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.md};
  padding: 8px 16px;
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  margin-top: 20px;
  
  svg {
    margin-right: 8px;
  }
  
  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.grey};
  margin-bottom: 20px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const FilterButton = styled.button`
  padding: 8px 16px;
  background: white;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  display: flex;
  align-items: center;
  cursor: pointer;
  
  svg {
    margin-right: 8px;
  }
  
  &:hover {
    background: ${props => props.theme.colors.lightGrey};
  }
`;

const SearchInput = styled.input`
  padding: 8px 16px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  width: 250px;
`;

const InfoTooltip = styled.div`
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  color: ${props => props.theme.colors.darkGrey};
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
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

// Sample engagement data
const engagementData = [
  { date: 'Jan', comments: 145, likes: 1250, views: 25000 },
  { date: 'Feb', comments: 165, likes: 1560, views: 28000 },
  { date: 'Mar', comments: 180, likes: 1980, views: 32000 },
  { date: 'Apr', comments: 220, likes: 2150, views: 38000 },
  { date: 'May', comments: 310, likes: 2840, views: 45000 },
  { date: 'Jun', comments: 290, likes: 2650, views: 42000 },
  { date: 'Jul', comments: 350, likes: 3100, views: 50000 }
];

// Video performance data
const videoPerformanceData = [
  { name: 'LED Project Tutorial', views: 145000, comments: 1250, likes: 12500, retention: 68 },
  { name: 'RGB Light Setup Guide', views: 98000, comments: 820, likes: 8900, retention: 72 },
  { name: 'Best LEDs for 2024', views: 210000, comments: 1850, likes: 18200, retention: 65 },
  { name: 'Smart LED Installation', views: 85000, comments: 740, likes: 7600, retention: 70 },
  { name: 'LED Troubleshooting', views: 120000, comments: 1340, likes: 10800, retention: 63 }
];

const COLORS = ['#4caf50', '#ffc107', '#f44336', '#2196f3', '#9c27b0', '#ff9800'];

const YoutubeMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChannel, setSelectedChannel] = useState(1);
  
  return (
    <div>
      <PageTitle>
        <IconComponent icon={FaYoutube} />
        YouTube Monitoring
      </PageTitle>
      
      <TabsContainer>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</Tab>
        <Tab active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}>Channels</Tab>
        <Tab active={activeTab === 'videos'} onClick={() => setActiveTab('videos')}>Videos</Tab>
        <Tab active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>Comments</Tab>
        <Tab active={activeTab === 'automation'} onClick={() => setActiveTab('automation')}>Automation</Tab>
      </TabsContainer>
      
      {activeTab === 'overview' && (
        <>
          <StatsGrid>
            <StatCard>
              <StatLabel>
                <IconComponent icon={FaEye} />
                Total Views
              </StatLabel>
              <StatValue>3.2M</StatValue>
              <StatChange positive={true}>+18.5%</StatChange>
            </StatCard>
            
            <StatCard>
              <StatLabel>
                <IconComponent icon={FaThumbsUp} />
                Total Likes
              </StatLabel>
              <StatValue>284K</StatValue>
              <StatChange positive={true}>+22.1%</StatChange>
            </StatCard>
            
            <StatCard>
              <StatLabel>
                <IconComponent icon={FaComment} />
                Comments Posted
              </StatLabel>
              <StatValue>1,845</StatValue>
              <StatChange positive={true}>+15.4%</StatChange>
            </StatCard>
            
            <StatCard>
              <StatLabel>
                <IconComponent icon={FaChartLine} />
                Engagement Rate
              </StatLabel>
              <StatValue>7.6%</StatValue>
              <StatChange positive={false}>-0.8%</StatChange>
            </StatCard>
          </StatsGrid>
          
          <ChartContainer>
            <Card>
              <ChartHeader>
                <ChartTitle>Engagement Metrics</ChartTitle>
                <TimeframeSelect>
                  <option value="7days">Last 7 days</option>
                  <option value="1month">Last month</option>
                  <option value="3months" selected>Last 3 months</option>
                  <option value="6months">Last 6 months</option>
                  <option value="1year">Last year</option>
                </TimeframeSelect>
              </ChartHeader>
              
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={engagementData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#5e35b1" 
                      fill="rgba(94, 53, 177, 0.2)" 
                      name="Views" 
                      activeDot={{ r: 8 }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="likes" 
                      stroke="#4caf50" 
                      fill="rgba(76, 175, 80, 0.2)" 
                      name="Likes" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="comments" 
                      stroke="#ff9800" 
                      fill="rgba(255, 152, 0, 0.2)" 
                      name="Comments" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </ChartContainer>
          
          <ChartContainer>
            <Card>
              <ChartHeader>
                <ChartTitle>Video Performance</ChartTitle>
                <InfoTooltip>
                  <IconComponent icon={FaInfoCircle} />
                </InfoTooltip>
              </ChartHeader>
              
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={videoPerformanceData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="views" name="Views" fill="#5e35b1" />
                    <Bar dataKey="likes" name="Likes" fill="#4caf50" />
                    <Bar dataKey="comments" name="Comments" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </ChartContainer>
        </>
      )}
      
      {activeTab === 'channels' && (
        <>
          <FilterBar>
            <FilterGroup>
              <FilterButton>
                <IconComponent icon={FaFilter} />
                Filter
              </FilterButton>
              <FilterButton>
                Status
              </FilterButton>
              <FilterButton>
                Category
              </FilterButton>
            </FilterGroup>
            <SearchInput placeholder="Search channels..." />
          </FilterBar>
          
          <Card>
            <ChannelList>
              {channels.map(channel => (
                <ChannelCard 
                  key={channel.id} 
                  active={selectedChannel === channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <ChannelIcon>
                    <IconComponent icon={FaYoutube} />
                  </ChannelIcon>
                  <ChannelInfo>
                    <ChannelName>{channel.name}</ChannelName>
                    <ChannelStats>{channel.subscribers} subscribers • {channel.views} views</ChannelStats>
                    <ChannelStatus status={channel.status}>
                      {channel.status === 'active' && <IconComponent icon={FaCheck} />}
                      {channel.status === 'pending' && <IconComponent icon={FaBell} />}
                      {channel.status.charAt(0).toUpperCase() + channel.status.slice(1)}
                    </ChannelStatus>
                  </ChannelInfo>
                  <div>
                    <StatValue style={{ fontSize: '1.5rem' }}>{channel.engagementRate}</StatValue>
                    <StatLabel>Engagement</StatLabel>
                  </div>
                </ChannelCard>
              ))}
            </ChannelList>
            
            <ActionButton>
              <IconComponent icon={FaYoutube} />
              Add New Channel
            </ActionButton>
          </Card>
        </>
      )}
      
      {activeTab === 'videos' && (
        <div>
          <Card>
            <ChartTitle>Videos ready for comment automation</ChartTitle>
            {/* Video list would go here */}
          </Card>
        </div>
      )}
      
      {activeTab === 'comments' && (
        <div>
          <Card>
            <ChartTitle>Comment Templates & Automation</ChartTitle>
            {/* Comment management interface would go here */}
          </Card>
        </div>
      )}
      
      {activeTab === 'automation' && (
        <div>
          <Card>
            <ChartTitle>Automation Rules</ChartTitle>
            {/* Automation rules interface would go here */}
          </Card>
        </div>
      )}
    </div>
  );
};

export default YoutubeMonitoring;