import React from 'react';
import styled from 'styled-components';
import { X, TrendingDown, Users, Calendar, AlertCircle, BarChart3, Youtube } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DecliningTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: {
    id: string;
    name: string;
    volume: string;
    decline: string;
    declinePercentage: number;
    category: string;
    sentiment?: string;
    status?: string;
    keywords?: string[];
    description?: string;
    // Additional fields from RPC
    video_count?: number;
    channel_count?: number;
    engagement_rate?: string;
    quality_score?: string;
    sentiment_score?: string;
    sentiment_label?: string;
    velocity?: string;
    momentum?: string;
    top_channels?: Array<{
      id: string;
      name: string;
      videos: number;
      total_views: number;
      avg_engagement: number;
    }>;
    temporal_data?: {
      frequency: number;
      last_seen: string;
      peak_date: string;
      first_seen: string;
      days_trending: number;
      distribution: {
        older: number;
        last_24h: number;
        last_week: number;
        last_month: number;
      };
    };
    scores?: {
      risk: number;
      confidence: number;
      saturation: number;
      opportunity: number;
      sustainability: number;
    };
    insights?: string[];
  } | null;
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
  padding: 32px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.theme.colors.bg.secondary};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: #ef444420;
  color: #ef4444;
  margin-right: 8px;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  padding: 16px;
  border-radius: 12px;
  text-align: center;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const MetricValue = styled.div<{ color?: string }>`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.color || props.theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InsightsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const InsightItem = styled.li`
  padding: 8px 0;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:before {
    content: '•';
    color: #ef4444;
    font-weight: bold;
  }
`;

const ChannelsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChannelCard = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

const ChannelStats = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ChannelMetrics = styled.div`
  text-align: right;
`;

const ScoreBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const ScoreLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  min-width: 100px;
`;

const ScoreProgress = styled.div`
  flex: 1;
  height: 8px;
  background: ${props => props.theme.colors.bg.secondary};
  border-radius: 4px;
  overflow: hidden;
`;

const ScoreFill = styled.div<{ width: number; color?: string }>`
  width: ${props => props.width}%;
  height: 100%;
  background: ${props => props.color || '#ef4444'};
  border-radius: 4px;
`;

const ScoreValue = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.text};
  min-width: 30px;
  text-align: right;
`;

const TemporalInfo = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  border-radius: 12px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const TemporalItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
`;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

export const DecliningTopicModal: React.FC<DecliningTopicModalProps> = ({ isOpen, onClose, topic }) => {
  const { language } = useLanguage();

  if (!topic || !isOpen) return null;

  const translations = {
    pt: {
      volume: 'Volume',
      decline: 'Declínio',
      sentiment: 'Sentimento',
      engagement: 'Engajamento',
      quality: 'Qualidade',
      velocity: 'Velocidade',
      momentum: 'Momentum',
      videos: 'Vídeos',
      channels: 'Canais',
      insights: 'Insights',
      topChannels: 'Principais Canais',
      views: 'visualizações',
      avgEngagement: 'eng. médio',
      scores: 'Pontuações',
      risk: 'Risco',
      confidence: 'Confiança',
      saturation: 'Saturação',
      opportunity: 'Oportunidade',
      sustainability: 'Sustentabilidade',
      temporalData: 'Dados Temporais',
      firstSeen: 'Primeira vez visto',
      lastSeen: 'Última vez visto',
      peakDate: 'Data do pico',
      daysTrending: 'Dias em tendência',
      distribution: 'Distribuição',
      last24h: 'Últimas 24h',
      lastWeek: 'Última semana',
      lastMonth: 'Último mês',
      older: 'Mais antigo'
    },
    en: {
      volume: 'Volume',
      decline: 'Decline',
      sentiment: 'Sentiment',
      engagement: 'Engagement',
      quality: 'Quality',
      velocity: 'Velocity',
      momentum: 'Momentum',
      videos: 'Videos',
      channels: 'Channels',
      insights: 'Insights',
      topChannels: 'Top Channels',
      views: 'views',
      avgEngagement: 'avg engagement',
      scores: 'Scores',
      risk: 'Risk',
      confidence: 'Confidence',
      saturation: 'Saturation',
      opportunity: 'Opportunity',
      sustainability: 'Sustainability',
      temporalData: 'Temporal Data',
      firstSeen: 'First seen',
      lastSeen: 'Last seen',
      peakDate: 'Peak date',
      daysTrending: 'Days trending',
      distribution: 'Distribution',
      last24h: 'Last 24h',
      lastWeek: 'Last week',
      lastMonth: 'Last month',
      older: 'Older'
    }
  };

  const labels = translations[language as 'pt' | 'en'] || translations.en;

  // Get raw data from the topic (before formatting)
  const rawData = (topic as any)._rawData || {};

  return (
    <ModalOverlay isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>

        <Header>
          <Title>{topic.name}</Title>
          <CategoryBadge>{topic.category}</CategoryBadge>
          <CategoryBadge>{topic.status || 'DECLINING'}</CategoryBadge>
          {topic.sentiment_label && (
            <CategoryBadge>{topic.sentiment_label}</CategoryBadge>
          )}
        </Header>

        <MetricsGrid>
          <MetricCard>
            <MetricLabel>{labels.volume}</MetricLabel>
            <MetricValue>{topic.volume}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>{labels.decline}</MetricLabel>
            <MetricValue color="#ef4444">{topic.decline}</MetricValue>
          </MetricCard>
          {rawData.video_count !== undefined && (
            <MetricCard>
              <MetricLabel>{labels.videos}</MetricLabel>
              <MetricValue>{rawData.video_count}</MetricValue>
            </MetricCard>
          )}
          {rawData.channel_count !== undefined && (
            <MetricCard>
              <MetricLabel>{labels.channels}</MetricLabel>
              <MetricValue>{rawData.channel_count}</MetricValue>
            </MetricCard>
          )}
          {rawData.engagement_rate && (
            <MetricCard>
              <MetricLabel>{labels.engagement}</MetricLabel>
              <MetricValue>{(parseFloat(rawData.engagement_rate) * 100).toFixed(1)}%</MetricValue>
            </MetricCard>
          )}
          {rawData.quality_score && (
            <MetricCard>
              <MetricLabel>{labels.quality}</MetricLabel>
              <MetricValue>{(parseFloat(rawData.quality_score) * 100).toFixed(0)}%</MetricValue>
            </MetricCard>
          )}
        </MetricsGrid>

        {rawData.insights && rawData.insights.length > 0 && (
          <Section>
            <SectionTitle>
              <AlertCircle size={16} />
              {labels.insights}
            </SectionTitle>
            <InsightsList>
              {rawData.insights.map((insight: string, index: number) => (
                <InsightItem key={index}>{insight}</InsightItem>
              ))}
            </InsightsList>
          </Section>
        )}

        {rawData.top_channels && rawData.top_channels.length > 0 && (
          <Section>
            <SectionTitle>
              <Youtube size={16} />
              {labels.topChannels}
            </SectionTitle>
            <ChannelsList>
              {rawData.top_channels.map((channel: any) => (
                <ChannelCard key={channel.id}>
                  <ChannelInfo>
                    <ChannelName>{channel.name}</ChannelName>
                    <ChannelStats>
                      {channel.videos} {labels.videos} • {formatNumber(channel.total_views)} {labels.views}
                    </ChannelStats>
                  </ChannelInfo>
                  <ChannelMetrics>
                    <MetricValue>{(channel.avg_engagement * 100).toFixed(1)}%</MetricValue>
                    <MetricLabel>{labels.avgEngagement}</MetricLabel>
                  </ChannelMetrics>
                </ChannelCard>
              ))}
            </ChannelsList>
          </Section>
        )}

        {rawData.scores && (
          <Section>
            <SectionTitle>
              <BarChart3 size={16} />
              {labels.scores}
            </SectionTitle>
            <div>
              <ScoreBar>
                <ScoreLabel>{labels.risk}</ScoreLabel>
                <ScoreProgress>
                  <ScoreFill width={rawData.scores.risk * 100} color="#ef4444" />
                </ScoreProgress>
                <ScoreValue>{(rawData.scores.risk * 100).toFixed(0)}%</ScoreValue>
              </ScoreBar>
              <ScoreBar>
                <ScoreLabel>{labels.confidence}</ScoreLabel>
                <ScoreProgress>
                  <ScoreFill width={rawData.scores.confidence * 100} color="#3b82f6" />
                </ScoreProgress>
                <ScoreValue>{(rawData.scores.confidence * 100).toFixed(0)}%</ScoreValue>
              </ScoreBar>
              <ScoreBar>
                <ScoreLabel>{labels.saturation}</ScoreLabel>
                <ScoreProgress>
                  <ScoreFill width={rawData.scores.saturation * 100} color="#f59e0b" />
                </ScoreProgress>
                <ScoreValue>{(rawData.scores.saturation * 100).toFixed(0)}%</ScoreValue>
              </ScoreBar>
              <ScoreBar>
                <ScoreLabel>{labels.opportunity}</ScoreLabel>
                <ScoreProgress>
                  <ScoreFill width={rawData.scores.opportunity * 100} color="#10b981" />
                </ScoreProgress>
                <ScoreValue>{(rawData.scores.opportunity * 100).toFixed(0)}%</ScoreValue>
              </ScoreBar>
              <ScoreBar>
                <ScoreLabel>{labels.sustainability}</ScoreLabel>
                <ScoreProgress>
                  <ScoreFill width={rawData.scores.sustainability * 100} color="#8b5cf6" />
                </ScoreProgress>
                <ScoreValue>{(rawData.scores.sustainability * 100).toFixed(0)}%</ScoreValue>
              </ScoreBar>
            </div>
          </Section>
        )}

        {rawData.temporal_data && (
          <Section>
            <SectionTitle>
              <Calendar size={16} />
              {labels.temporalData}
            </SectionTitle>
            <TemporalInfo>
              <TemporalItem>
                <Calendar size={14} />
                {labels.firstSeen}: {formatDate(rawData.temporal_data.first_seen)}
              </TemporalItem>
              <TemporalItem>
                <Calendar size={14} />
                {labels.lastSeen}: {formatDate(rawData.temporal_data.last_seen)}
              </TemporalItem>
              <TemporalItem>
                <TrendingDown size={14} />
                {labels.peakDate}: {formatDate(rawData.temporal_data.peak_date)}
              </TemporalItem>
              <TemporalItem>
                <BarChart3 size={14} />
                {labels.daysTrending}: {rawData.temporal_data.days_trending}
              </TemporalItem>
            </TemporalInfo>
            {rawData.temporal_data.distribution && (
              <div style={{ marginTop: '16px' }}>
                <SectionTitle style={{ fontSize: '14px', marginBottom: '8px' }}>
                  {labels.distribution}
                </SectionTitle>
                <MetricsGrid>
                  <MetricCard>
                    <MetricLabel>{labels.last24h}</MetricLabel>
                    <MetricValue>{rawData.temporal_data.distribution.last_24h}</MetricValue>
                  </MetricCard>
                  <MetricCard>
                    <MetricLabel>{labels.lastWeek}</MetricLabel>
                    <MetricValue>{rawData.temporal_data.distribution.last_week}</MetricValue>
                  </MetricCard>
                  <MetricCard>
                    <MetricLabel>{labels.lastMonth}</MetricLabel>
                    <MetricValue>{rawData.temporal_data.distribution.last_month}</MetricValue>
                  </MetricCard>
                  <MetricCard>
                    <MetricLabel>{labels.older}</MetricLabel>
                    <MetricValue>{rawData.temporal_data.distribution.older}</MetricValue>
                  </MetricCard>
                </MetricsGrid>
              </div>
            )}
          </Section>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};