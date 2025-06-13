import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useDecliningTopics } from '../hooks/useDecliningTopics';
import { DecliningTopicModal } from './DecliningTopicModal';

interface TrendData {
  id: string;
  name: string;
  volume: string;
  decline: string;
  declinePercentage: number;
  data: number[];
  category?: string;
  description?: string;
  keywords?: string[];
  geographic_distribution?: Record<string, number>;
  age_demographics?: Record<string, number>;
  sentiment?: string;
  status?: string;
  // Store raw data for modal
  _rawData?: any;
}

const translations = {
  en: {
    title: 'Declining Topics',
    subtitle: 'Topics losing momentum in the',
    subtitleHighlight: 'last 30 days',
    subtitleEnd: 'on YouTube',
    volume: 'Volume',
    decline: 'Decline',
    declining: 'Declining',
    trends: [
      {
        id: '1',
        name: 'Fidget Spinners',
        category: 'Toys & Games',
        description: 'Stress relief toys that spin'
      },
      {
        id: '2',
        name: 'NFT Gaming',
        category: 'Blockchain Gaming',
        description: 'Play-to-earn blockchain games'
      },
      {
        id: '3',
        name: 'Metaverse Real Estate',
        category: 'Virtual Reality',
        description: 'Virtual land investments'
      },
      {
        id: '4',
        name: 'Ice Bucket Challenge',
        category: 'Social Media Trends',
        description: 'Viral charity challenge'
      },
      {
        id: '5',
        name: 'Wordle Clones',
        category: 'Mobile Games',
        description: 'Word puzzle game variations'
      }
    ]
  },
  pt: {
    title: 'Tópicos em Declínio',
    subtitle: 'Tópicos perdendo força nos',
    subtitleHighlight: 'últimos 30 dias',
    subtitleEnd: 'no YouTube',
    volume: 'Volume',
    decline: 'Declínio',
    declining: 'Em Declínio',
    trends: [
      {
        id: '1',
        name: 'Fidget Spinners',
        category: 'Brinquedos e Jogos',
        description: 'Brinquedos anti-stress giratórios'
      },
      {
        id: '2',
        name: 'Jogos NFT',
        category: 'Jogos Blockchain',
        description: 'Jogos play-to-earn blockchain'
      },
      {
        id: '3',
        name: 'Imóveis no Metaverso',
        category: 'Realidade Virtual',
        description: 'Investimentos em terrenos virtuais'
      },
      {
        id: '4',
        name: 'Desafio do Balde de Gelo',
        category: 'Tendências de Mídia Social',
        description: 'Desafio viral de caridade'
      },
      {
        id: '5',
        name: 'Clones do Wordle',
        category: 'Jogos Mobile',
        description: 'Variações de jogos de palavras'
      }
    ]
  }
};

const baseTrendData = [
  {
    volume: '245K',
    decline: '-72%',
    declinePercentage: -72,
    data: [198, 185, 172, 158, 145, 135, 122, 108, 95, 85, 75, 65, 58, 52, 48, 45]
  },
  {
    volume: '189K',
    decline: '-85%',
    declinePercentage: -85,
    data: [365, 342, 315, 285, 258, 225, 190, 162, 138, 118, 100, 85, 72, 60, 50, 42]
  },
  {
    volume: '312K',
    decline: '-68%',
    declinePercentage: -68,
    data: [120, 112, 105, 98, 92, 85, 78, 72, 65, 58, 52, 45, 38, 32, 28, 25]
  },
  {
    volume: '156K',
    decline: '-91%',
    declinePercentage: -91,
    data: [342, 315, 285, 258, 222, 190, 162, 138, 118, 100, 85, 72, 60, 50, 42, 35]
  },
  {
    volume: '421K',
    decline: '-63%',
    declinePercentage: -63,
    data: [198, 185, 175, 164, 154, 144, 135, 125, 115, 105, 95, 88, 82, 75, 70, 64]
  }
];

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  width: 100%;
  padding: 80px 20px;
  background: ${({ theme }) => theme.colors.bg.primary};
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }
`;

const Title = styled.h2`
  text-align: center;
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff 0%, #ef4444 100%);
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
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 60px;
  
  span {
    color: #ef4444;
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
  flex: 0 0 340px;
  height: 400px;
  background: ${({ theme }) => 
    theme.name === 'dark' 
      ? `linear-gradient(135deg, ${theme.colors.bg.secondary} 0%, ${theme.colors.bg.tertiary} 100%)`
      : `linear-gradient(135deg, ${theme.colors.bg.secondary} 0%, ${theme.colors.bg.tertiary} 100%)`
  };
  border-radius: 24px;
  padding: 32px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  
  ${({ isActive }) => isActive && css`
    transform: scale(1.03) translateY(-8px);
    border-color: #ef4444;
    box-shadow: 
      0 20px 40px rgba(239, 68, 68, 0.2),
      0 0 0 1px rgba(239, 68, 68, 0.3);
  `}
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: #ef4444;
    box-shadow: 
      0 20px 40px rgba(239, 68, 68, 0.15),
      0 0 0 1px rgba(239, 68, 68, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
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
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
`;

const TrendCategory = styled.p`
  font-size: 0.9rem;
  color: #ef4444;
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
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 4px;
`;

const MetricValue = styled.p<{ isDecline?: boolean }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ isDecline, theme }) => isDecline ? '#ef4444' : theme.colors.text.primary};
  
  ${({ isDecline }) => isDecline && css`
    position: relative;
  `}
`;

const ChartContainer = styled.div`
  height: 150px;
  position: relative;
  margin-bottom: 20px;
`;

const TrendDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 10px;
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
  stroke: url(#declineGradient);
  stroke-width: 3;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ${drawLine} 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  animation-delay: ${({ delay }) => delay || 0}ms;
  filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.6));
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const ChartArea = styled.path`
  opacity: 0.2;
`;

const DecliningTag = styled.div`
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.3) 100%);
  color: #ef4444;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  border: 1px solid rgba(239, 68, 68, 0.3);
  backdrop-filter: blur(8px);
  animation: ${pulse} 2s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '📉';
    font-size: 0.9rem;
  }
`;

const NavigationButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ direction }) => direction === 'left' ? 'left: 10px;' : 'right: 10px;'}
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
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
    background: rgba(239, 68, 68, 0.3);
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
  background: ${({ isActive }) => isActive ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.3s ease;
  cursor: pointer;
`;

const DecliningTopicsCarousel: React.FC = () => {
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { trends, loading, error, lastUpdated, refresh } = useDecliningTopics();
  const t = translations[language as keyof typeof translations];
  
  // Format volume number to K/M format
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(0)}K`;
    }
    return volume.toString();
  };
  
  // Map category names for consistent display
  const categoryMap: Record<string, string> = {
    'GAMING': language === 'pt' ? 'Jogos' : 'Gaming',
    'MUSIC': language === 'pt' ? 'Música' : 'Music',
    'NEWS': language === 'pt' ? 'Notícias' : 'News',
    'OTHER': language === 'pt' ? 'Outros' : 'Other',
    'TECHNOLOGY': language === 'pt' ? 'Tecnologia' : 'Technology',
    'ENTERTAINMENT': language === 'pt' ? 'Entretenimento' : 'Entertainment',
    'EDUCATION': language === 'pt' ? 'Educação' : 'Education',
    'LIFESTYLE': language === 'pt' ? 'Estilo de Vida' : 'Lifestyle'
  };
  
  // Memoize chart data to prevent regeneration on every render
  const chartDataCache = useRef<Map<string, number[]>>(new Map());
  
  // Generate declining data pattern with realistic oscillations
  const generateDecliningData = (trendId: string, growthPercentage: number): number[] => {
    // Return cached data if it exists
    if (chartDataCache.current.has(trendId)) {
      return chartDataCache.current.get(trendId)!;
    }
    
    const baseValue = 200;
    const endValue = baseValue * (1 + growthPercentage / 100); // negative growth
    const steps = 16;
    const data: number[] = [];
    
    // Calculate decline characteristics
    const declineMagnitude = Math.abs(growthPercentage);
    const declineRate = declineMagnitude / 100;
    
    // Use a seeded random for consistency
    const seed = trendId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (i: number) => {
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    };
    
    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      
      // Create more realistic decline curve
      let value: number;
      
      if (declineMagnitude > 80) {
        // Steep decline - sharp drop at beginning, then stabilizes
        const curve = Math.pow(progress, 0.4);
        value = baseValue + (endValue - baseValue) * curve;
      } else if (declineMagnitude > 50) {
        // Moderate decline - steady decrease
        value = baseValue + (endValue - baseValue) * progress;
      } else {
        // Gentle decline - slow start, accelerates later
        const curve = Math.pow(progress, 1.5);
        value = baseValue + (endValue - baseValue) * curve;
      }
      
      // Add small consistent variations (not random each render)
      const variation = Math.sin(i * 1.5 + seed * 0.1) * (5 + declineRate * 10);
      const microVariation = seededRandom(i) * 3;
      
      value += variation + microVariation;
      data.push(Math.max(20, value)); // Ensure minimum value
    }
    
    // Cache the generated data
    chartDataCache.current.set(trendId, data);
    return data;
  };
  
  // Transform API data to component format
  const decliningData: TrendData[] = trends.map((trend, index) => ({
    id: `trend-${trend.id}`,
    name: trend.topic,
    volume: formatVolume(trend.volume),
    decline: trend.growth + '%',
    declinePercentage: parseFloat(trend.growth),
    data: generateDecliningData(`trend-${trend.id}`, parseFloat(trend.growth)),
    category: categoryMap[trend.category] || trend.category,
    description: trend.insights.length > 0 
      ? trend.insights[0] 
      : `${trend.video_count} videos, ${trend.channel_count} channels`,
    keywords: trend.insights,
    sentiment: trend.sentiment_label,
    status: trend.status,
    // Store all raw data for the modal
    _rawData: trend
  }));

  useEffect(() => {
    if (isAutoPlaying && !isModalOpen) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % decliningData.length);
      }, 5000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, isModalOpen, decliningData.length]);

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
    const newIndex = direction === 'left' 
      ? (activeIndex - 1 + decliningData.length) % decliningData.length
      : (activeIndex + 1) % decliningData.length;
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

  if (loading && decliningData.length === 0) {
    return (
      <Container>
        <Title>{t.title}</Title>
        <Subtitle>
          {t.subtitle} <span>{t.subtitleHighlight}</span> {t.subtitleEnd}
        </Subtitle>
        <CarouselWrapper>
          <div style={{ textAlign: 'center', color: '#ef4444' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p>{language === 'pt' ? 'Carregando tendências em declínio...' : 'Loading declining trends...'}</p>
          </div>
        </CarouselWrapper>
      </Container>
    );
  }

  if (error && decliningData.length === 0) {
    return (
      <Container>
        <Title>{t.title}</Title>
        <Subtitle>
          {t.subtitle} <span>{t.subtitleHighlight}</span> {t.subtitleEnd}
        </Subtitle>
        <CarouselWrapper>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>
              {language === 'pt' ? 'Erro ao carregar tendências' : 'Error loading trends'}
            </p>
            <button
              onClick={refresh}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {language === 'pt' ? 'Tentar novamente' : 'Try again'}
            </button>
          </div>
        </CarouselWrapper>
      </Container>
    );
  }

  if (decliningData.length === 0) {
    return null; // Don't show the section if there are no declining trends
  }

  return (
    <Container>
      <Title>{t.title}</Title>
      <Subtitle>
        {t.subtitle} <span>{t.subtitleHighlight}</span> {t.subtitleEnd}
        {lastUpdated && (
          <span style={{ fontSize: '0.8rem', marginLeft: '16px', opacity: 0.7 }}>
            {language === 'pt' ? 'Atualizado: ' : 'Updated: '}
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </Subtitle>
      
      <CarouselWrapper
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <NavigationButton direction="left" onClick={() => handleNavigation('left')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </NavigationButton>
        
        <CardsContainer ref={containerRef}>
          {decliningData.map((trend, index) => (
            <TrendCard
              key={trend.id}
              isActive={index === activeIndex}
              onClick={() => {
                handleCardClick(index);
                setSelectedTopic(trend);
                setIsModalOpen(true);
              }}
              onMouseEnter={() => setHoveredCard(trend.id)}
              onMouseLeave={() => setHoveredCard(null)}
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
                  <MetricLabel>{t.decline}</MetricLabel>
                  <MetricValue isDecline>{trend.decline}</MetricValue>
                </Metric>
              </MetricsContainer>
              
              <ChartContainer>
                <SVGChart viewBox="0 0 260 150">
                  <defs>
                    <linearGradient id={`gradient-decline-${trend.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="declineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#dc2626" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f87171" />
                    </linearGradient>
                  </defs>
                  <ChartArea d={createAreaPath(trend.data)} style={{ fill: `url(#gradient-decline-${trend.id})` }} />
                  <ChartPath d={createChartPath(trend.data)} delay={index * 100} />
                  {/* Add dots for data points */}
                  {trend.data.map((value, i) => {
                    const width = 260;
                    const height = 150;
                    const padding = 10;
                    const max = Math.max(...trend.data);
                    const min = Math.min(...trend.data);
                    const xStep = (width - 2 * padding) / (trend.data.length - 1);
                    const yScale = (height - 2 * padding) / (max - min);
                    const x = padding + i * xStep;
                    const y = height - padding - (value - min) * yScale;
                    
                    return i === trend.data.length - 1 ? (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth="2"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                        }}
                      />
                    ) : null;
                  })}
                </SVGChart>
              </ChartContainer>
              
              <TrendDescription>
                {trend.description}
              </TrendDescription>
              
              <DecliningTag>{t.declining}</DecliningTag>
            </TrendCard>
          ))}
        </CardsContainer>
        
        <NavigationButton direction="right" onClick={() => handleNavigation('right')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </NavigationButton>
        
        <ProgressIndicator>
          {decliningData.map((_, index) => (
            <ProgressDot
              key={index}
              isActive={index === activeIndex}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </ProgressIndicator>
      </CarouselWrapper>
      
      {selectedTopic && (
        <DecliningTopicModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTopic(null);
          }}
          topic={selectedTopic}
        />
      )}
    </Container>
  );
};

export default DecliningTopicsCarousel;