import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LazyBarChartProps {
  data: any[];
  theme: any;
  dataKey?: string;
  color?: string;
}

const LazyBarChart: React.FC<LazyBarChartProps> = ({ 
  data, 
  theme, 
  dataKey = 'value', 
  color = '#00f5ff' 
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          vertical={false} 
          stroke={theme.colors.border.primary} 
        />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false}
          tick={{ fill: theme.colors.text.secondary }}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false}
          tick={{ fill: theme.colors.text.secondary }}
        />
        <Tooltip
          contentStyle={{
            background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${theme.colors.border.primary}`,
            borderRadius: '8px',
            boxShadow: theme.shadows.md,
            color: theme.colors.text.primary
          }}
        />
        <Bar 
          dataKey={dataKey} 
          fill={color}
          radius={[4, 4, 0, 0]}
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default LazyBarChart;