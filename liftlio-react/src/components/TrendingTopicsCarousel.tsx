import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

interface TrendData {
  id: string;
  name: string;
  volume: string;
  growth: string;
  growthPercentage: number;
  data: number[];
  category?: string;
  description?: string;
}

const translations = {
  en: {
    title: 'Discover Trending Topics',
    subtitle: 'Find trends',
    subtitleHighlight: '12+ months before',
    subtitleEnd: 'everyone else',
    volume: 'Volume',
    growth: 'Growth',
    discovered: 'Discovered',
    trends: [
      {
        id: '1',
        name: 'Liftlio Analytics',
        category: 'Marketing Tech',
        description: 'Video mention analytics platform'
      },
      {
        id: '2',
        name: 'Video Intelligence',
        category: 'AI Technology',
        description: 'AI for video content analysis'
      },
      {
        id: '3',
        name: 'Brand Monitoring AI',
        category: 'Business Intelligence',
        description: 'Automatic brand monitoring'
      },
      {
        id: '4',
        name: 'Sentiment Analysis',
        category: 'Data Analytics',
        description: 'Real-time sentiment analysis'
      },
      {
        id: '5',
        name: 'Video Marketing ROI',
        category: 'Marketing Metrics',
        description: 'ROI metrics for videos'
      }
    ]
  },
  pt: {
    title: 'Descubra Tópicos em Tendência',
    subtitle: 'Encontre tendências',
    subtitleHighlight: '12+ meses antes',
    subtitleEnd: 'de todos',
    volume: 'Volume',
    growth: 'Crescimento',
    discovered: 'Descoberto',
    trends: [
      {
        id: '1',
        name: 'Liftlio Analytics',
        category: 'Marketing Tech',
        description: 'Plataforma de análise de menções em vídeos'
      },
      {
        id: '2',
        name: 'Video Intelligence',
        category: 'Tecnologia IA',
        description: 'IA para análise de conteúdo em vídeo'
      },
      {
        id: '3',
        name: 'Brand Monitoring AI',
        category: 'Business Intelligence',
        description: 'Monitoramento automático de marca'
      },
      {
        id: '4',
        name: 'Sentiment Analysis',
        category: 'Análise de Dados',
        description: 'Análise de sentimento em tempo real'
      },
      {
        id: '5',
        name: 'Video Marketing ROI',
        category: 'Métricas de Marketing',
        description: 'Métricas de ROI para vídeos'
      }
    ]
  }
};

const baseTrendData = [
  {
    volume: '165K',
    growth: '+9700%',
    growthPercentage: 9700,
    data: [10, 15, 12, 25, 30, 45, 40, 55, 60, 75, 85, 95, 110, 125, 140, 165]
  },
  {
    volume: '235K',
    growth: '+8400%',
    growthPercentage: 8400,
    data: [20, 22, 25, 30, 28, 35, 45, 60, 75, 90, 110, 130, 155, 180, 210, 235]
  },
  {
    volume: '89K',
    growth: '+5200%',
    growthPercentage: 5200,
    data: [5, 8, 10, 12, 15, 20, 25, 30, 35, 42, 50, 58, 65, 73, 80, 89]
  },
  {
    volume: '342K',
    growth: '+12000%',
    growthPercentage: 12000,
    data: [15, 20, 25, 35, 45, 60, 80, 100, 125, 150, 180, 220, 260, 290, 315, 342]
  },
  {
    volume: '127K',
    growth: '+6800%',
    growthPercentage: 6800,
    data: [8, 10, 12, 15, 20, 25, 32, 40, 50, 62, 75, 88, 95, 105, 115, 127]
  }
];

const Container = styled.div`
  width: 100%;
  padding: 60px 20px;
  background: ${({ theme }) => theme.background || '#0a0a0a'};
  overflow: hidden;
  position: relative;
`;

const Title = styled.h2`
  text-align: center;
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  text-align: center;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.textSecondary || '#666'};
  margin-bottom: 60px;
  
  span {
    color: #818cf8;
    font-weight: 600;
  }
`;

const CarouselWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardsContainer = styled.div`
  display: flex;
  gap: 30px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const TrendCard = styled(motion.div)<{ isActive?: boolean }>`
  flex: 0 0 320px;
  height: 380px;
  background: ${({ theme }) => theme.cardBackground || '#1a1a1a'};
  border-radius: 20px;
  padding: 30px;
  border: 1px solid ${({ theme }) => theme.borderColor || '#2a2a2a'};
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${({ isActive }) => isActive && css`
    transform: scale(1.05);
    border-color: #818cf8;
    box-shadow: 0 0 40px rgba(129, 140, 248, 0.3);
  `}
  
  &:hover {
    transform: translateY(-5px);
    border-color: #818cf8;
    box-shadow: 0 10px 40px rgba(129, 140, 248, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(129, 140, 248, 0.1) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const CardHeader = styled.div`
  margin-bottom: 30px;
`;

const TrendName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#fff'};
  margin-bottom: 8px;
`;

const TrendCategory = styled.p`
  font-size: 0.9rem;
  color: #818cf8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const MetricsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
`;

const Metric = styled.div`
  text-align: center;
`;

const MetricLabel = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.textSecondary || '#666'};
  margin-bottom: 4px;
`;

const MetricValue = styled.p<{ isGrowth?: boolean }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ isGrowth, theme }) => isGrowth ? '#10b981' : theme.text || '#fff'};
`;

const ChartContainer = styled.div`
  height: 150px;
  position: relative;
  margin-bottom: 20px;
`;

const SVGChart = styled.svg`
  width: 100%;
  height: 100%;
`;

const drawLine = keyframes`
  to {
    stroke-dashoffset: 0;
  }
`;

const ChartPath = styled.path<{ delay?: number }>`
  fill: none;
  stroke: #818cf8;
  stroke-width: 3;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ${drawLine} 2s ease-out forwards;
  animation-delay: ${({ delay }) => delay || 0}ms;
  filter: drop-shadow(0 0 8px rgba(129, 140, 248, 0.5));
`;

const ChartArea = styled.path`
  fill: url(#gradient);
  opacity: 0.2;
`;

const DiscoveredTag = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(129, 140, 248, 0.2);
  color: #818cf8;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const NavigationButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ direction }) => direction === 'left' ? 'left: 10px;' : 'right: 10px;'}
  background: rgba(129, 140, 248, 0.2);
  border: 1px solid rgba(129, 140, 248, 0.3);
  color: #818cf8;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  
  &:hover {
    background: rgba(129, 140, 248, 0.3);
    transform: translateY(-50%) scale(1.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const ProgressIndicator = styled.div`
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
`;

const ProgressDot = styled.div<{ isActive: boolean }>`
  width: ${({ isActive }) => isActive ? '24px' : '8px'};
  height: 8px;
  border-radius: 4px;
  background: ${({ isActive }) => isActive ? '#818cf8' : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.3s ease;
  cursor: pointer;
`;

const TrendingTopicsCarousel: React.FC = () => {
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const t = translations[language as keyof typeof translations];
  
  // Combine translations with base data
  const trendingData: TrendData[] = t.trends.map((trend, index) => ({
    ...trend,
    ...baseTrendData[index]
  }));

  useEffect(() => {
    if (isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % trendingData.length);
      }, 5000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, trendingData.length]);

  // Auto-scroll effect when activeIndex changes
  useEffect(() => {
    if (containerRef.current) {
      const cardWidth = 350;
      const scrollPosition = activeIndex * cardWidth;
      containerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
    // Mantém auto-playing ativo
    
    if (containerRef.current) {
      const cardWidth = 350;
      const scrollPosition = index * cardWidth;
      containerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleNavigation = (direction: 'left' | 'right') => {
    // Mantém auto-playing ativo
    const newIndex = direction === 'left' 
      ? (activeIndex - 1 + trendingData.length) % trendingData.length
      : (activeIndex + 1) % trendingData.length;
    setActiveIndex(newIndex);
    handleCardClick(newIndex);
  };

  const createChartPath = (data: number[]) => {
    const width = 260;
    const height = 150;
    const padding = 10;
    const max = Math.max(...data);
    const min = Math.min(...data);
    
    const xStep = (width - 2 * padding) / (data.length - 1);
    const yScale = (height - 2 * padding) / (max - min);
    
    const points = data.map((value, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (value - min) * yScale;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const createAreaPath = (data: number[]) => {
    const chartPath = createChartPath(data);
    const width = 260;
    const height = 150;
    const padding = 10;
    
    return `${chartPath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
  };

  return (
    <Container>
      <Title>{t.title}</Title>
      <Subtitle>
        {t.subtitle} <span>{t.subtitleHighlight}</span> {t.subtitleEnd}
      </Subtitle>
      
      <CarouselWrapper>
        <NavigationButton direction="left" onClick={() => handleNavigation('left')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </NavigationButton>
        
        <CardsContainer ref={containerRef}>
          {trendingData.map((trend, index) => (
            <TrendCard
              key={trend.id}
              isActive={index === activeIndex}
              onClick={() => handleCardClick(index)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CardHeader>
                <TrendName>{trend.name}</TrendName>
                <TrendCategory>{trend.category}</TrendCategory>
              </CardHeader>
              
              <MetricsContainer>
                <Metric>
                  <MetricLabel>{t.volume}</MetricLabel>
                  <MetricValue>{trend.volume}</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>{t.growth}</MetricLabel>
                  <MetricValue isGrowth>{trend.growth}</MetricValue>
                </Metric>
              </MetricsContainer>
              
              <ChartContainer>
                <SVGChart viewBox="0 0 260 150">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <ChartArea d={createAreaPath(trend.data)} />
                  <ChartPath d={createChartPath(trend.data)} delay={index * 100} />
                </SVGChart>
              </ChartContainer>
              
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                {trend.description}
              </p>
              
              <DiscoveredTag>{t.discovered}</DiscoveredTag>
            </TrendCard>
          ))}
        </CardsContainer>
        
        <NavigationButton direction="right" onClick={() => handleNavigation('right')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </NavigationButton>
        
        <ProgressIndicator>
          {trendingData.map((_, index) => (
            <ProgressDot
              key={index}
              isActive={index === activeIndex}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </ProgressIndicator>
      </CarouselWrapper>
    </Container>
  );
};

export default TrendingTopicsCarousel;