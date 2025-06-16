import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTrendingTopics } from '../hooks/useTrendingTopics';
import { RisingTopicModal } from './RisingTopicModal';

interface TrendData {
  id: string;
  name: string;
  volume: string;
  growth: string;
  growthPercentage: number;
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
    title: 'Discover Trending Topics',
    subtitle: 'Real-time trends from the',
    subtitleHighlight: 'last 30 days',
    subtitleEnd: 'on YouTube',
    volume: 'Volume',
    growth: 'Growth',
    discovered: 'Exploding',
    trends: [
      {
        id: '1',
        name: 'YouTube Brand Mentions',
        category: 'Video Analytics',
        description: 'Track brand mentions across YouTube creators'
      },
      {
        id: '2',
        name: 'AI Video Intelligence',
        category: 'Artificial Intelligence',
        description: 'AI-powered video content analysis at scale'
      },
      {
        id: '3',
        name: 'Influencer Lead Gen',
        category: 'Marketing Automation',
        description: 'Convert video mentions into qualified leads'
      },
      {
        id: '4',
        name: 'Real-time Sentiment',
        category: 'Brand Monitoring',
        description: 'Monitor brand sentiment in video comments'
      },
      {
        id: '5',
        name: 'Creator Analytics API',
        category: 'Developer Tools',
        description: 'API for accessing creator performance data'
      }
    ]
  },
  pt: {
    title: 'Descubra Tópicos em Tendência',
    subtitle: 'Tendências em tempo real dos',
    subtitleHighlight: 'últimos 30 dias',
    subtitleEnd: 'no YouTube',
    volume: 'Volume',
    growth: 'Crescimento',
    discovered: 'Explodindo',
    trends: [
      {
        id: '1',
        name: 'Menções no YouTube',
        category: 'Análise de Vídeo',
        description: 'Rastreie menções da marca em criadores do YouTube'
      },
      {
        id: '2',
        name: 'IA Video Intelligence',
        category: 'Inteligência Artificial',
        description: 'Análise de conteúdo de vídeo com IA em escala'
      },
      {
        id: '3',
        name: 'Lead Gen de Influencers',
        category: 'Automação de Marketing',
        description: 'Converta menções em vídeo em leads qualificados'
      },
      {
        id: '4',
        name: 'Sentimento em Tempo Real',
        category: 'Monitoramento de Marca',
        description: 'Monitore sentimento da marca em comentários'
      },
      {
        id: '5',
        name: 'API Analytics Criadores',
        category: 'Ferramentas para Devs',
        description: 'API para dados de performance de criadores'
      }
    ]
  }
};

const baseTrendData = [
  {
    volume: '1.6M',
    growth: '+9700%',
    growthPercentage: 9700,
    data: [10, 12, 15, 18, 22, 28, 35, 45, 58, 72, 88, 108, 135, 165, 198, 235]
  },
  {
    volume: '2.3M',
    growth: '+12500%',
    growthPercentage: 12500,
    data: [15, 18, 22, 28, 35, 45, 58, 75, 95, 120, 150, 185, 225, 270, 315, 365]
  },
  {
    volume: '895K',
    growth: '+5200%',
    growthPercentage: 5200,
    data: [25, 28, 32, 38, 45, 52, 58, 65, 72, 78, 85, 92, 98, 105, 112, 120]
  },
  {
    volume: '3.4M',
    growth: '+8900%',
    growthPercentage: 8900,
    data: [30, 35, 42, 50, 60, 72, 85, 100, 118, 138, 162, 190, 222, 258, 298, 342]
  },
  {
    volume: '1.2M',
    growth: '+6800%',
    growthPercentage: 6800,
    data: [20, 23, 27, 32, 38, 45, 54, 64, 75, 88, 102, 118, 135, 154, 175, 198]
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
    background: radial-gradient(circle at 50% 0%, rgba(129, 140, 248, 0.08) 0%, transparent 50%);
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
  color: ${({ theme }) => theme.colors.text.secondary};
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
    border-color: #818cf8;
    box-shadow: 
      0 20px 40px rgba(129, 140, 248, 0.2),
      0 0 0 1px rgba(129, 140, 248, 0.3);
  `}
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: #818cf8;
    box-shadow: 
      0 20px 40px rgba(129, 140, 248, 0.15),
      0 0 0 1px rgba(129, 140, 248, 0.2);
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
  color: ${({ theme }) => theme.colors.text.primary};
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
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 4px;
`;

const MetricValue = styled.p<{ isGrowth?: boolean }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ isGrowth, theme }) => isGrowth ? '#10b981' : theme.colors.text.primary};
  
  ${({ isGrowth }) => isGrowth && css`
    position: relative;
    
    &::before {
      content: '+';
      position: absolute;
      left: -12px;
      font-size: 1.2rem;
      color: #10b981;
    }
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
  stroke: url(#lineGradient);
  stroke-width: 3;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ${drawLine} 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  animation-delay: ${({ delay }) => delay || 0}ms;
  filter: drop-shadow(0 0 12px rgba(129, 140, 248, 0.6));
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const ChartArea = styled.path`
  opacity: 0.2;
`;

const DiscoveredTag = styled.div`
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.2) 0%, rgba(129, 140, 248, 0.3) 100%);
  color: #818cf8;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  border: 1px solid rgba(129, 140, 248, 0.3);
  backdrop-filter: blur(8px);
  animation: ${pulse} 2s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '🔥';
    font-size: 0.9rem;
  }
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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { trends, loading, error, lastUpdated, refresh } = useTrendingTopics();
  const t = translations[language as keyof typeof translations];
  
  // Map category names for consistent display
  const categoryMap: Record<string, string> = {
    'TECHNOLOGY': language === 'pt' ? 'Tecnologia' : 'Technology',
    'GAMING': language === 'pt' ? 'Jogos' : 'Gaming',
    'MUSIC': language === 'pt' ? 'Música' : 'Music',
    'LIFESTYLE': language === 'pt' ? 'Estilo de Vida' : 'Lifestyle',
    'ENTERTAINMENT': language === 'pt' ? 'Entretenimento' : 'Entertainment',
    'EDUCATION': language === 'pt' ? 'Educação' : 'Education',
    'BUSINESS': language === 'pt' ? 'Negócios' : 'Business',
    'EMERGING TRENDS': language === 'pt' ? 'Tendências Emergentes' : 'Emerging Trends'
  };
  
  // Map sentiment values for translation
  const sentimentMap: Record<string, string> = {
    'Muito Positivo': language === 'pt' ? 'Muito Positivo' : 'Very Positive',
    'Positivo': language === 'pt' ? 'Positivo' : 'Positive',
    'Neutro': language === 'pt' ? 'Neutro' : 'Neutral',
    'Negativo': language === 'pt' ? 'Negativo' : 'Negative',
    'Muito Negativo': language === 'pt' ? 'Muito Negativo' : 'Very Negative',
    // English to Portuguese (in case API returns in English)
    'Very Positive': language === 'pt' ? 'Muito Positivo' : 'Very Positive',
    'Positive': language === 'pt' ? 'Positivo' : 'Positive',
    'Neutral': language === 'pt' ? 'Neutro' : 'Neutral',
    'Negative': language === 'pt' ? 'Negativo' : 'Negative',
    'Very Negative': language === 'pt' ? 'Muito Negativo' : 'Very Negative'
  };

  // Format volume number to K/M format
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(0)}K`;
    }
    return volume.toString();
  };

  // Transform API data to component format
  const trendingData: TrendData[] = trends.map((trend, index) => ({
    id: `trend-${trend.id}`,
    name: trend.topic,
    volume: formatVolume(trend.volume),
    growth: trend.growth + '%',
    growthPercentage: parseFloat(trend.growth),
    data: baseTrendData[index % baseTrendData.length].data,
    category: categoryMap[trend.category] || trend.category,
    description: trend.insights.length > 0 
      ? trend.insights[0] 
      : `${trend.video_count} videos, ${trend.channel_count} channels`,
    keywords: trend.insights,
    geographic_distribution: {},
    age_demographics: {},
    sentiment: sentimentMap[trend.sentiment_label] || trend.sentiment_label,
    status: trend.status,
    // Store all raw data for the modal
    _rawData: trend
  }));

  useEffect(() => {
    if (isAutoPlaying && !isModalOpen) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % trendingData.length);
      }, 5000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, isModalOpen, trendingData.length]);

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

  if (loading && trendingData.length === 0) {
    return (
      <Container>
        <Title>{t.title}</Title>
        <Subtitle>
          {t.subtitle} <span>{t.subtitleHighlight}</span> {t.subtitleEnd}
        </Subtitle>
        <CarouselWrapper>
          <div style={{ textAlign: 'center', color: '#818cf8' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p>{language === 'pt' ? 'Carregando tendências...' : 'Loading trends...'}</p>
          </div>
        </CarouselWrapper>
      </Container>
    );
  }

  if (error && trendingData.length === 0) {
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
                background: '#818cf8',
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
          {trendingData.map((trend, index) => (
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
                  <MetricLabel>{t.growth}</MetricLabel>
                  <MetricValue isGrowth>{trend.growth}</MetricValue>
                </Metric>
              </MetricsContainer>
              
              <ChartContainer>
                <SVGChart viewBox="0 0 260 150">
                  <defs>
                    <linearGradient id={`gradient-${trend.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <ChartArea d={createAreaPath(trend.data)} style={{ fill: `url(#gradient-${trend.id})` }} />
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
                        fill="#818cf8"
                        stroke="#fff"
                        strokeWidth="2"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.8))'
                        }}
                      />
                    ) : null;
                  })}
                </SVGChart>
              </ChartContainer>
              
              <TrendDescription>
                {trend.description}
              </TrendDescription>
              
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
      
      {selectedTopic && (
        <RisingTopicModal
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

export default TrendingTopicsCarousel;