import React from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

// Animation keyframes
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Sample data for charts
const samplePerformanceData = [
  { name: 'Jan', videos: 400, engagement: 240 },
  { name: 'Feb', videos: 300, engagement: 139 },
  { name: 'Mar', videos: 200, engagement: 980 },
  { name: 'Apr', videos: 278, engagement: 390 },
  { name: 'May', videos: 189, engagement: 480 },
  { name: 'Jun', videos: 239, engagement: 380 },
  { name: 'Jul', videos: 349, engagement: 430 },
];

const sampleTrafficData = [
  { name: 'YouTube', value: 400, color: '#FF0000' },
  { name: 'Twitter', value: 300, color: '#1DA1F2' },
  { name: 'LinkedIn', value: 300, color: '#0A66C2' },
  { name: 'Facebook', value: 200, color: '#1877F2' },
  { name: 'Instagram', value: 278, color: '#C13584' },
];

// Styled components
const LoadingAnimation = styled.div`
  width: 100%;
  height: 70vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  background: white;
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
  }
  
  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.7; }
    50% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.7; }
  }
  
  @keyframes glow {
    0% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
    50% { box-shadow: 0 0 40px rgba(33, 150, 243, 0.5); }
    100% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
  }
`;

const ShimmerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s linear infinite;
  z-index: 1;
`;

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const LoadingDataIndicator: React.FC = () => {
  return (
    <PageContainer>
      <LoadingAnimation style={{ 
        background: 'linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%)',
        boxShadow: '0 10px 50px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '12px'
        }}>
          {/* Left area chart */}
          <div style={{
            width: '48%',
            minWidth: '280px',
            height: '280px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            padding: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <ShimmerOverlay className="loading-shimmer" />
            
            <h3 style={{ marginBottom: '12px', color: '#1976D2', fontSize: '14px', position: 'relative', zIndex: 2 }}>Performance Overview</h3>
            
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={samplePerformanceData}>
                <defs>
                  <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#673AB7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#673AB7" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#666' }} />
                <YAxis tick={{ fill: '#666' }} />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="videos" 
                  stroke="#2196F3" 
                  fill="url(#colorVideos)" 
                  activeDot={{ r: 8 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#673AB7" 
                  fill="url(#colorEngagement)" 
                  activeDot={{ r: 8 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Right pie chart */}
          <div style={{
            width: '48%',
            minWidth: '280px',
            height: '280px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            padding: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <ShimmerOverlay className="loading-shimmer" />
            
            <h3 style={{ marginBottom: '12px', color: '#1976D2', fontSize: '14px', position: 'relative', zIndex: 2 }}>Traffic Sources</h3>
            
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={sampleTrafficData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sampleTrafficData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </LoadingAnimation>
    </PageContainer>
  );
};

export default LoadingDataIndicator;