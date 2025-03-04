import React from 'react';
import styled from 'styled-components';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
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

// Sample data
const performanceData = [
  { name: 'Jan', views: 4000, leads: 240, engagement: 1000 },
  { name: 'Feb', views: 3000, leads: 198, engagement: 800 },
  { name: 'Mar', views: 2000, leads: 320, engagement: 1200 },
  { name: 'Apr', views: 2780, leads: 390, engagement: 1500 },
  { name: 'May', views: 1890, leads: 480, engagement: 1700 },
  { name: 'Jun', views: 2390, leads: 380, engagement: 1400 },
  { name: 'Jul', views: 3490, leads: 430, engagement: 1800 }
];

const sentimentData = [
  { name: 'Positive', value: 65 },
  { name: 'Neutral', value: 25 },
  { name: 'Negative', value: 10 }
];

const audienceData = [
  { name: 'Affiliate Marketers', value: 45 },
  { name: 'Digital Entrepreneurs', value: 30 },
  { name: 'Content Creators', value: 15 },
  { name: 'Others', value: 10 }
];

const platformData = [
  { name: 'YouTube', comments: 120, views: 45000, platform: 'YouTube' },
  { name: 'Reddit', comments: 80, views: 12000, platform: 'Reddit' },
  { name: 'LinkedIn', comments: 45, views: 8000, platform: 'LinkedIn' },
  { name: 'Twitter', comments: 30, views: 5000, platform: 'Twitter' },
  { name: 'Facebook', comments: 25, views: 4000, platform: 'Facebook' }
];

const COLORS = ['#4caf50', '#ffc107', '#f44336', '#2196f3', '#9c27b0', '#ff9800'];

const Monitoring: React.FC = () => {
  return (
    <div>
      <PageTitle>Monitoring</PageTitle>
      
      <StatsGrid>
        <StatCard>
          <StatLabel>Total Views</StatLabel>
          <StatValue>120,038</StatValue>
          <StatChange positive={true}>+15.8%</StatChange>
        </StatCard>
        
        <StatCard>
          <StatLabel>Engagement</StatLabel>
          <StatValue>26,168</StatValue>
          <StatChange positive={true}>+20.2%</StatChange>
        </StatCard>
        
        <StatCard>
          <StatLabel>Leads</StatLabel>
          <StatValue>3,889</StatValue>
          <StatChange positive={true}>+12.4%</StatChange>
        </StatCard>
        
        <StatCard>
          <StatLabel>Conversion Rate</StatLabel>
          <StatValue>3.24%</StatValue>
          <StatChange positive={false}>-1.2%</StatChange>
        </StatCard>
      </StatsGrid>
      
      <ChartContainer>
        <Card>
          <ChartHeader>
            <ChartTitle>Performance Metrics</ChartTitle>
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
              <LineChart
                data={performanceData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#5e35b1" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="leads" stroke="#4caf50" />
                <Line type="monotone" dataKey="engagement" stroke="#ff9800" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </ChartContainer>
      
      <GridLayout>
        <Card>
          <ChartTitle>Sentiment Analysis</ChartTitle>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card>
          <ChartTitle>Audience Demographics</ChartTitle>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={audienceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {audienceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </GridLayout>
      
      <Card>
        <ChartTitle>Platform Performance</ChartTitle>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={platformData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#5e35b1" />
              <YAxis yAxisId="right" orientation="right" stroke="#ff9800" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="comments" name="Comments" fill="#5e35b1" />
              <Bar yAxisId="right" dataKey="views" name="Views" fill="#ff9800" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Monitoring;