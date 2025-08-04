import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LazyPieChartProps {
  data: any[];
  colors: string[];
  theme: any;
}

const LazyPieChart: React.FC<LazyPieChartProps> = ({ data, colors, theme }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={5}
          dataKey="value"
          nameKey="name"
          strokeWidth={0}
          isAnimationActive={true}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`${value}`, 'Mentions']}
          contentStyle={{
            background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${theme.colors.border.primary}`,
            borderRadius: '8px',
            boxShadow: theme.shadows.md,
            color: theme.colors.text.primary
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default LazyPieChart;