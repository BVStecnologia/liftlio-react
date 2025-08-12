import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter
} from 'recharts';
import * as FaIcons from 'react-icons/fa';
import { FaCode, FaCopy, FaCheck, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import GlobeVisualization from '../components/GlobeVisualization';
import RealTimeInsights from '../components/RealTimeInsights';

// Animações adicionais
const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const slideInFromRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const Container = styled.div`
  padding: 0;
  animation: fadeIn 0.5s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Header = styled.div`
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 1.5rem;
    color: ${props => props.theme.colors.primary};
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 10px 20px;
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.border};
  background: ${props => {
    if (props.active) {
      return props.theme.colors.primary;
    }
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
  }};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text.primary};
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled(motion.div)<{ trend?: 'up' | 'down' | 'neutral' }>`
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
  }
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const MetricTitle = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
  margin-bottom: 8px;
`;

const MetricIcon = styled.div<{ color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color || props.theme.colors.primary};
  
  svg {
    font-size: 24px;
    color: white;
  }
`;

const MetricValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 4px;
`;

const MetricChange = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};

  svg {
    font-size: 16px;
  }
`;

const MetricDescription = styled.div`
  color: ${props => props.theme.colors.text.muted};
  font-size: 13px;
  margin-top: 4px;
`;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
`;

const SecondaryChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
`;

const LegendDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const ChartCard = styled(motion.div)`
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border-radius: 16px;
  padding: 24px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const DemoIndicator = styled.span`
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(249, 115, 22, 0.2);
`;

const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const ChartOptions = styled.div`
  display: flex;
  gap: 8px;
`;

const ChartOption = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  background: ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.background};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.textSecondary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const InsightCard = styled(motion.div)`
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: pulse 3s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
`;

const InsightTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
`;

const InsightText = styled.p`
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.95;
  position: relative;
  z-index: 1;
`;

const TagImplementation = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? props.theme.colors.bg.secondary 
    : props.theme.colors.background};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : props.theme.colors.border};
  border-radius: 16px;
  padding: 32px;
  margin-top: 32px;
`;

const TagTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 24px;
  }
`;

const ImplementationSteps = styled.div`
  display: grid;
  gap: 24px;
  margin-bottom: 24px;
`;

const Step = styled.div`
  display: flex;
  gap: 16px;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.6;
`;

const CodeContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;

const CodeBlock = styled.pre`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(0, 0, 0, 0.5)' 
    : '#1e293b'};
  color: ${props => props.theme.name === 'dark' 
    ? '#a0aec0' 
    : '#e2e8f0'};
  padding: 20px;
  padding-right: 60px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'transparent'};
  overflow-x: auto;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 14px;
  }
`;

const SuccessMessage = styled.div`
  color: #10b981;
  font-size: 14px;
  font-weight: 600;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    font-size: 16px;
  }
`;

const NoDataAlert = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.1) 0%, 
    rgba(168, 85, 247, 0.1) 100%);
  border: 2px dashed ${props => props.theme.colors.primary};
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%);
  }
`;

const DemoDataBadge = styled.div`
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
  
  svg {
    font-size: 14px;
  }
`;

const AlertIcon = styled.div`
  font-size: 48px;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 16px;
`;

const AlertTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 12px;
`;

const AlertText = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 24px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
`;

const AlertButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
    transform: translateY(-2px);
  }

  svg {
    font-size: 18px;
  }
`;

const Analytics: React.FC = () => {
  const { currentProject } = useProject();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsScript, setAnalyticsScript] = useState<string>('');
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Cores dinâmicas baseadas no tema (usando paleta roxa do Liftlio)
  const chartColors = {
    primary: '#8b5cf6', // Roxo principal do Liftlio
    secondary: '#a855f7', // Roxo secundário
    accent: '#c084fc', // Roxo mais claro
    grid: theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
    text: theme.name === 'dark' ? '#9ca3af' : '#6b7280',
    tooltip: theme.name === 'dark' ? '#1f2937' : '#ffffff'
  };

  // Fetch analytics script from project
  useEffect(() => {
    const fetchProjectScript = async () => {
      if (!currentProject?.id) return;
      
      const { data, error } = await supabase
        .from('Projeto')
        .select('analytics_script')
        .eq('id', currentProject.id)
        .single();
      
      if (data?.analytics_script) {
        setAnalyticsScript(data.analytics_script);
      } else {
        // Generate default script if not exists
        const defaultScript = `<!-- Liftlio Analytics -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://analytics.liftlio.com/tag.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${currentProject.id}');
</script>`;
        setAnalyticsScript(defaultScript);
      }
    };
    
    fetchProjectScript();
  }, [currentProject]);
  
  // Fetch real analytics data from Supabase
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!currentProject?.id) return;
      
      setLoading(true);
      
      try {
        // Calculate date range based on period
        const now = new Date();
        const startDate = new Date();
        
        switch(period) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        }
        
        // Fetch analytics data
        const { data: analytics, error } = await supabase
          .from('analytics')
          .select('*')
          .eq('project_id', currentProject.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Process data for charts
        if (analytics && analytics.length > 0) {
          setHasData(true);
          processAnalyticsData(analytics);
        } else {
          setHasData(false);
          // Use mock data for demonstration
          loadMockData();
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        loadMockData();
      } finally {
        setLoading(false);
      }
    };
    
    const processAnalyticsData = (data: any[]) => {
      // Process real data here
      setAnalyticsData(data);
      // For now, still use mock data structure
      loadMockData();
    };
    
    const loadMockData = () => {
      // Traffic data over time - showing Liftlio dominating other sources
      const traffic = [
        { date: 'Mon', liftlio: 3500, organic: 1800, ads: 1200, social: 800, direct: 500 },
        { date: 'Tue', liftlio: 4200, organic: 1900, ads: 1100, social: 900, direct: 600 },
        { date: 'Wed', liftlio: 4800, organic: 2000, ads: 1300, social: 850, direct: 550 },
        { date: 'Thu', liftlio: 4600, organic: 1850, ads: 1150, social: 800, direct: 600 },
        { date: 'Fri', liftlio: 5400, organic: 2100, ads: 1400, social: 1000, direct: 700 },
        { date: 'Sat', liftlio: 6200, organic: 2300, ads: 1500, social: 1100, direct: 800 },
        { date: 'Sun', liftlio: 6800, organic: 2500, ads: 1600, social: 1200, direct: 900 },
      ];

      // Traffic sources with Liftlio purple theme colors
      const sources = [
        { name: 'Google', value: 45, color: '#8b5cf6' },
        { name: 'YouTube', value: 25, color: '#a855f7' },
        { name: 'Instagram', value: 15, color: '#c084fc' },
        { name: 'LinkedIn', value: 10, color: '#d8b4fe' },
        { name: 'Direct', value: 5, color: '#e9d5ff' },
      ];

      // Devices
      const devices = [
        { name: 'Desktop', users: 5800, sessions: 8200 },
        { name: 'Mobile', users: 4200, sessions: 5900 },
        { name: 'Tablet', users: 1000, sessions: 1400 },
      ];

      // Monthly growth
      const growth = [
        { month: 'Jan', crescimento: 12, meta: 10 },
        { month: 'Feb', crescimento: 18, meta: 15 },
        { month: 'Mar', crescimento: 25, meta: 20 },
        { month: 'Apr', crescimento: 32, meta: 25 },
        { month: 'May', crescimento: 41, meta: 30 },
        { month: 'Jun', crescimento: 48, meta: 35 },
      ];

      setTrafficData(traffic);
      setSourceData(sources);
      setDeviceData(devices);
      setGrowthData(growth);
    };
    
    fetchAnalyticsData();
  }, [period, currentProject, theme, chartColors.primary]);

  const metrics = [
    {
      title: 'Organic Traffic',
      value: '48.2K',
      change: '+32.5%',
      positive: true,
      description: 'vs. last month',
      icon: <IconComponent icon={FaIcons.FaSearch} />,
      color: '#22d3ee',
      trend: 'up' as const
    },
    {
      title: 'Unique Users',
      value: '12.8K',
      change: '+18.2%',
      positive: true,
      description: 'unique visitors',
      icon: <IconComponent icon={FaIcons.FaUsers} />,
      color: '#a855f7',
      trend: 'up' as const
    },
    {
      title: 'Conversion Rate',
      value: '4.8%',
      change: '+0.8%',
      positive: true,
      description: 'from organic traffic',
      icon: <IconComponent icon={FaIcons.FaRocket} />,
      color: '#f97316',
      trend: 'up' as const
    },
    {
      title: 'Avg. Time',
      value: '3m 42s',
      change: '+15s',
      positive: true,
      description: 'on page',
      icon: <IconComponent icon={FaIcons.FaClock} />,
      color: '#10b981',
      trend: 'up' as const
    }
  ];

  // Copy to clipboard function
  const handleCopyCode = () => {
    navigator.clipboard.writeText(analyticsScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Analytics script is now fetched from database above

  return (
    <Container>
      {/* Sistema de Notificações e Insights em Tempo Real */}
      <RealTimeInsights 
        projectId={currentProject?.id || 0} 
        supabase={supabase} 
      />
      
      <Header>
        <Title>
          <IconComponent icon={FaIcons.FaChartLine} />
          Organic Traffic Analytics
        </Title>
        <FilterGroup>
          <FilterButton active={period === '7d'} onClick={() => setPeriod('7d')}>
            7 days
          </FilterButton>
          <FilterButton active={period === '30d'} onClick={() => setPeriod('30d')}>
            30 days
          </FilterButton>
          <FilterButton active={period === '90d'} onClick={() => setPeriod('90d')}>
            90 days
          </FilterButton>
        </FilterGroup>
      </Header>

      {/* Globo 3D de visitantes online */}
      <GlobeVisualization 
        projectId={currentProject?.id || 0} 
        supabase={supabase} 
      />

      {!hasData && (
        <>
          <DemoDataBadge>
            <IconComponent icon={FaIcons.FaInfoCircle} />
            Demonstration Data - Install tracking tag to see real data
          </DemoDataBadge>
          
          <NoDataAlert
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AlertIcon>
              <IconComponent icon={FaIcons.FaChartLine} />
            </AlertIcon>
            <AlertTitle>Start Tracking Your Growth!</AlertTitle>
            <AlertText>
              Add the Liftlio tracking tag to your website to start measuring your organic traffic growth. 
              Once installed, you'll see real-time analytics about your visitors, traffic sources, and conversion rates.
            </AlertText>
            <AlertButton onClick={() => {
              const element = document.getElementById('implementation-guide');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <IconComponent icon={FaIcons.FaRocket} />
              Install Tracking Tag
            </AlertButton>
          </NoDataAlert>
        </>
      )}

      {hasData && (
        <InsightCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <InsightTitle>
            <IconComponent icon={FaIcons.FaGem} /> Liftlio Insight
          </InsightTitle>
          <InsightText>
            Your organic traffic grew 48% this month! Content generated by Liftlio 
            is contributing 35% of this growth. Keep optimizing your videos 
            with our SEO suggestions to reach +60% by the end of the quarter.
          </InsightText>
        </InsightCard>
      )}

      <MetricsGrid>
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            trend={metric.trend}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <MetricHeader>
              <div>
                <MetricTitle>{metric.title}</MetricTitle>
                <MetricValue>{metric.value}</MetricValue>
                <MetricChange positive={metric.positive}>
                  {metric.positive ? <IconComponent icon={FaIcons.FaArrowUp} /> : <IconComponent icon={FaIcons.FaArrowDown} />}
                  {metric.change}
                  <MetricDescription>{metric.description}</MetricDescription>
                </MetricChange>
              </div>
              <MetricIcon color={metric.color}>
                {metric.icon}
              </MetricIcon>
            </MetricHeader>
          </MetricCard>
        ))}
      </MetricsGrid>

      <ChartSection>
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartLine} /> Traffic Growth
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo Data</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trafficData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="colorLiftlio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.95}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0.15}/>
                </linearGradient>
                <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d8b4fe" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#d8b4fe" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorDirect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e9d5ff" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e9d5ff" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke={chartColors.text}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={chartColors.text}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
                formatter={(value: number) => [`${value.toLocaleString()} visits`, '']}
              />
              <Area 
                type="monotone" 
                dataKey="direct" 
                stackId="1"
                stroke="#e9d5ff" 
                fillOpacity={1} 
                fill="url(#colorDirect)" 
                strokeWidth={0}
                name="Direct"
              />
              <Area 
                type="monotone" 
                dataKey="social" 
                stackId="1"
                stroke="#d8b4fe" 
                fillOpacity={1} 
                fill="url(#colorSocial)" 
                strokeWidth={0}
                name="Social Media"
              />
              <Area 
                type="monotone" 
                dataKey="ads" 
                stackId="1"
                stroke="#c084fc" 
                fillOpacity={1} 
                fill="url(#colorAds)" 
                strokeWidth={0}
                name="Paid Ads"
              />
              <Area 
                type="monotone" 
                dataKey="organic" 
                stackId="1"
                stroke="#a855f7" 
                fillOpacity={1} 
                fill="url(#colorOrganic)" 
                strokeWidth={0}
                name="Organic Search"
              />
              <Area 
                type="monotone" 
                dataKey="liftlio" 
                stackId="1"
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorLiftlio)" 
                strokeWidth={3}
                name="Liftlio SEO"
              />
            </AreaChart>
          </ResponsiveContainer>
          <ChartLegend>
            <LegendItem>
              <LegendDot color="#8b5cf6" />
              <span><strong>Liftlio SEO</strong> - 45% of total traffic</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#a855f7" />
              <span><strong>Organic Search</strong> - 23% from Google/Bing</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#c084fc" />
              <span><strong>Paid Ads</strong> - 15% from Google/Meta Ads</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#d8b4fe" />
              <span><strong>Social Media</strong> - 10% from social networks</span>
            </LegendItem>
            <LegendItem>
              <LegendDot color="#e9d5ff" />
              <span><strong>Direct</strong> - 7% direct visits</span>
            </LegendItem>
          </ChartLegend>
        </ChartCard>
      </ChartSection>

      <SecondaryChartsGrid>
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartPie} /> Traffic Sources
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaChartBar} /> Growth vs Target
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
              />
              <Bar dataKey="crescimento" fill={chartColors.primary} name="Actual Growth" />
              <Line 
                type="monotone" 
                dataKey="meta" 
                stroke={chartColors.accent} 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaMobile} /> Devices
            </ChartTitle>
            {!hasData && <DemoIndicator>Demo</DemoIndicator>}
          </ChartHeader>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={chartColors.text}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.name === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${chartColors.primary}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  color: theme.colors.text.primary
                }}
              />
              <Bar dataKey="users" fill={chartColors.primary} name="Users" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sessions" fill={chartColors.accent} name="Sessions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SecondaryChartsGrid>

      <TagImplementation id="implementation-guide">
        <TagTitle>
          <IconComponent icon={FaIcons.FaCode} /> Implementation Guide
        </TagTitle>
        
        <ImplementationSteps>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <StepTitle>Copy the tracking code</StepTitle>
              <StepDescription>
                Click the "Copy Code" button below to copy your unique Liftlio tracking script to your clipboard.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <StepTitle>Open your website's HTML</StepTitle>
              <StepDescription>
                Access your website's HTML file or content management system. If you're using WordPress, 
                go to Appearance → Theme Editor → header.php. For other platforms, locate your main HTML template.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>3</StepNumber>
            <StepContent>
              <StepTitle>Paste before the closing &lt;/head&gt; tag</StepTitle>
              <StepDescription>
                Find the &lt;/head&gt; tag in your HTML and paste the tracking code right before it. 
                This ensures the script loads on every page of your website.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>4</StepNumber>
            <StepContent>
              <StepTitle>Save and verify</StepTitle>
              <StepDescription>
                Save your changes and visit your website. The tracking will start automatically within 5 minutes. 
                You can verify it's working by checking the Analytics dashboard for real-time data.
              </StepDescription>
            </StepContent>
          </Step>
        </ImplementationSteps>

        <CodeContainer>
          <CodeBlock>{analyticsScript || 'Loading...'}</CodeBlock>
          <CopyButton onClick={handleCopyCode}>
            {copied ? (
              <>
                <IconComponent icon={FaIcons.FaCheck} />
                Copied!
              </>
            ) : (
              <>
                <IconComponent icon={FaIcons.FaCopy} />
                Copy Code
              </>
            )}
          </CopyButton>
        </CodeContainer>
        
        {copied && (
          <SuccessMessage>
            <IconComponent icon={FaIcons.FaCheckCircle} />
            Code copied successfully! Now paste it into your website's HTML.
          </SuccessMessage>
        )}
      </TagImplementation>
    </Container>
  );
};

export default Analytics;