import React from 'react';
import styled from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import * as FaIcons from 'react-icons/fa';
import * as HiIcons from 'react-icons/hi';
import { IconComponent } from '../utils/IconHelper';

// Interface para definir a estrutura de dados dos vídeos descobertos recentemente
interface DiscoveredVideo {
  id: number;
  video_id_youtube: string;
  nome_do_video: string;
  thumbnailUrl: string;
  discovered_at: string; // Timestamp de quando o vídeo foi descoberto
  engaged_at: string;    // Timestamp de quando o comentário foi postado
  views: number;
  channel_id: number;
  channel_name: string;
  channel_image: string;
  engagement_message: string;
  content_category: string;
  relevance_score: number;
  position_comment: number;
  total_comments: number;
  projected_views: number;
}

// Props para o componente
interface RecentDiscoveredVideosProps {
  data?: DiscoveredVideo[];
}

// Dados estáticos de exemplo
const MOCK_DISCOVERED_VIDEOS: DiscoveredVideo[] = [
  {
    id: 101,
    video_id_youtube: 'dQw4w9WgXcQ',
    nome_do_video: 'Como aumentar o engagement do seu canal em 2025',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    discovered_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutos atrás
    engaged_at: new Date(Date.now() - 43 * 60 * 1000).toISOString(),    // 43 minutos atrás (2 min depois)
    views: 218,
    channel_id: 1,
    channel_name: 'Marketing Digital Insights',
    channel_image: 'https://via.placeholder.com/80',
    engagement_message: 'Excelente conteúdo sobre estratégias de engagement! Nós da Liftlio temos visto resultados incríveis com monitoramento integrado que ajuda a identificar tendências antes da concorrência. O vídeo aborda pontos importantes para 2025.',
    content_category: 'Marketing Digital',
    relevance_score: 0.92,
    position_comment: 3,
    total_comments: 47,
    projected_views: 8500
  },
  {
    id: 102,
    video_id_youtube: 'xvFZjo5PgG0',
    nome_do_video: 'INTELIGÊNCIA ARTIFICIAL: Como implementar na sua empresa',
    thumbnailUrl: 'https://img.youtube.com/vi/xvFZjo5PgG0/mqdefault.jpg',
    discovered_at: new Date(Date.now() - 97 * 60 * 1000).toISOString(), // 1h37min atrás
    engaged_at: new Date(Date.now() - 96 * 60 * 1000).toISOString(),    // 1h36min atrás (1 min depois)
    views: 456,
    channel_id: 2,
    channel_name: 'Tech Trends BR',
    channel_image: 'https://via.placeholder.com/80',
    engagement_message: 'Adorei a abordagem sobre IA! Vale destacar também que ferramentas como a Liftlio facilitam muito a implementação de tecnologias de monitoramento inteligente para empresas de qualquer porte. Grande vídeo!',
    content_category: 'Tecnologia',
    relevance_score: 0.87,
    position_comment: 1,
    total_comments: 112,
    projected_views: 12000
  },
  {
    id: 103,
    video_id_youtube: 'bTWWFg_SkPQ',
    nome_do_video: 'Transformação Digital: O que toda empresa precisa saber em 2025',
    thumbnailUrl: 'https://img.youtube.com/vi/bTWWFg_SkPQ/mqdefault.jpg',
    discovered_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 minutos atrás
    engaged_at: new Date(Date.now() - 17 * 60 * 1000).toISOString(),    // 17 minutos atrás (1 min depois)
    views: 87,
    channel_id: 3,
    channel_name: 'Transformação Digital',
    channel_image: 'https://via.placeholder.com/80',
    engagement_message: 'Conteúdo fundamental para quem quer se preparar para o futuro! Complementando o que foi falado, temos visto que sistemas de monitoramento como o Liftlio têm ajudado empresas a antecipar mudanças de mercado e otimizar suas estratégias digitais.',
    content_category: 'Negócios',
    relevance_score: 0.94,
    position_comment: 2,
    total_comments: 28,
    projected_views: 5200
  }
];

// Estilos para o componente de vídeos descobertos
const DiscoveredVideosContainer = styled.div`
  margin-bottom: 40px;
  position: relative;
  animation: fadeIn 0.8s ease-in-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const DiscoveredVideosHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    width: 200px;
    height: 1px;
    background: linear-gradient(90deg, 
      ${props => withOpacity(props.theme.colors.primary, 0.8)}, 
      transparent
    );
  }
`;

const DiscoveredVideosTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${COLORS.ACCENT};
  display: flex;
  align-items: center;
  margin-right: 24px;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const DiscoveredVideoSubtitle = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  max-width: 100%;
  white-space: normal;
  margin-bottom: 20px;
  line-height: 1.6;
  padding: 12px 18px;
  background: rgba(15, 23, 42, 0.03);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: linear-gradient(to bottom, #5951F9, #4590FF);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100%;
    background: linear-gradient(to left, 
      rgba(15, 23, 42, 0.03), 
      transparent
    );
  }
  
  span {
    font-weight: ${props => props.theme.fontWeights.semiBold};
    color: ${props => props.theme.colors.primary};
    position: relative;
    background: linear-gradient(to bottom, transparent 80%, ${props => withOpacity(props.theme.colors.primary, 0.15)} 80%);
  }
  
  .highlight-value {
    background: ${props => withOpacity(props.theme.colors.success, 0.12)};
    color: ${props => props.theme.colors.success};
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: ${props => props.theme.fontWeights.bold};
    display: inline-flex;
    align-items: center;
    margin: 0 4px;
    border: none;
  }
  
  .early-adopter {
    display: inline-flex;
    align-items: center;
    background: linear-gradient(to right, #5951F9, #4590FF);
    color: white;
    font-weight: ${props => props.theme.fontWeights.bold};
    padding: 2px 8px;
    border-radius: 4px;
    margin: 0 4px;
    box-shadow: 0 2px 6px rgba(73, 84, 244, 0.3);
    
    svg {
      margin-right: 4px;
      font-size: 12px;
    }
  }
`;

const RecentBadge = styled.div`
  background: linear-gradient(135deg, #FF512F, #DD2476);
  color: white;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.bold};
  padding: 4px 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  margin-left: 16px;
  box-shadow: 0 2px 8px rgba(221, 36, 118, 0.4);
  
  svg {
    margin-right: 6px;
    animation: blink 1.5s ease-in-out infinite;
  }
  
  @keyframes blink {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
`;

const DiscoveredVideosList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 24px;
  overflow-x: auto;
  padding: 12px 0;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => withOpacity(props.theme.colors.primary, 0.3)};
    border-radius: 10px;
  }
`;

const DiscoveredVideoCard = styled.div`
  background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,245,255,0.85));
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.radius.xl};
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.4);
  flex: 0 0 400px;
  max-width: 400px;
  
  /* Add tech grid pattern */
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(65, 88, 208, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(65, 88, 208, 0.02) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
    opacity: 0.4;
    z-index: 0;
  }
  
  /* Add glow effect */
  &:after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    z-index: -1;
    background: linear-gradient(45deg, 
      ${props => props.theme.colors.primary}00, 
      ${props => props.theme.colors.primary}30, 
      ${props => props.theme.colors.primary}00);
    border-radius: ${props => props.theme.radius.xl};
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
    
    &:after {
      opacity: 1;
    }
  }
`;

const VideoHeader = styled.div`
  position: relative;
  height: 220px;
  overflow: hidden;
`;

const VideoThumbnail = styled.div<{ image: string }>`
  width: 100%;
  height: 100%;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  transition: transform 0.5s ease;
  
  ${DiscoveredVideoCard}:hover & {
    transform: scale(1.05);
  }
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, 
    rgba(0, 0, 0, 0.8) 0%, 
    rgba(0, 0, 0, 0) 50%);
  z-index: 1;
`;

const DiscoveryInfo = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  padding: 6px 12px;
  color: white;
  font-size: ${props => props.theme.fontSizes.xs};
  display: flex;
  align-items: center;
  z-index: 2;
  
  svg {
    margin-right: 6px;
    color: #FF0000;
  }
`;

const TimeSince = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  padding: 6px 12px;
  color: white;
  font-size: ${props => props.theme.fontSizes.xs};
  z-index: 2;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
    color: #4CAF50;
  }
`;

const VideoTitle = styled.h3`
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  color: white;
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  line-height: 1.4;
  z-index: 2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const VideoContent = styled.div`
  padding: 20px;
  position: relative;
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.2)};
`;

const ChannelImage = styled.div<{ image: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  margin-right: 12px;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
`;

const ChannelName = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.fontSizes.sm};
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
`;

const MetricItem = styled.div`
  text-align: center;
  position: relative;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: ${props => props.theme.radius.md};
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateY(-2px);
  }
`;

const MetricValue = styled.div`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const MetricLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.secondary};
`;

const EngagementSection = styled.div`
  background: linear-gradient(135deg, 
    rgba(245, 247, 250, 0.7), 
    rgba(240, 245, 255, 0.7));
  border-radius: ${props => props.theme.radius.lg};
  padding: 16px;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, 
      ${props => props.theme.colors.primary},
      ${props => withOpacity(props.theme.colors.primary, 0.4)}
    );
  }
`;

const EngagementHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  justify-content: space-between;
`;

const EngagementTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
  }
`;

const EngagementLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  background: ${props => withOpacity(props.theme.colors.success, 0.1)};
  color: ${props => props.theme.colors.success};
  padding: 4px 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  border: 1px solid ${props => withOpacity(props.theme.colors.success, 0.2)};
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const EngagementMessage = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.5;
  position: relative;
  padding: 14px;
  background: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
  
  /* Add quote styling */
  &:before {
    content: '"';
    position: absolute;
    top: 8px;
    left: 12px;
    font-size: 40px;
    line-height: 1;
    color: ${props => withOpacity(props.theme.colors.primary, 0.1)};
    font-family: Georgia, serif;
  }
  
  padding-left: 30px;
`;

const ProductMention = styled.span`
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => withOpacity(props.theme.colors.primary, 0.2)};
  }
`;

const PositionIndicator = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.xs};
  margin-top: 12px;
  justify-content: space-between;
`;

const CommentPosition = styled.div`
  background: ${props => withOpacity(props.theme.colors.primary, 0.1)};
  padding: 4px 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.primary};
  
  svg {
    margin-right: 4px;
  }
`;

const ProjectedViews = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text.secondary};
  
  svg {
    margin-right: 4px;
    color: ${props => props.theme.colors.warning};
  }
`;

// Function to format relative time
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Function to highlight product mentions in text
const highlightProductMention = (text: string): React.ReactNode => {
  // Simple approach - in a real app would need more sophisticated parsing
  const parts = text.split(/(Liftlio)/g);
  
  return parts.map((part, i) => 
    part === 'Liftlio' ? <ProductMention key={i}>{part}</ProductMention> : part
  );
};

// The main component
const RecentDiscoveredVideos: React.FC<RecentDiscoveredVideosProps> = ({ data }) => {
  // Use provided data or fallback to mock data
  const videosToDisplay = data || MOCK_DISCOVERED_VIDEOS;
  
  return (
    <DiscoveredVideosContainer>
      <DiscoveredVideosHeader>
        <DiscoveredVideosTitle>
          <IconComponent icon={HiIcons.HiOutlineLightningBolt} />
          Recently Discovered Videos from Monitored Channels
        </DiscoveredVideosTitle>
        
        <RecentBadge>
          <IconComponent icon={FaIcons.FaCircle} />
          LIVE TRACKING
        </RecentBadge>
      </DiscoveredVideosHeader>
      
      <DiscoveredVideoSubtitle>
        Our AI-powered system <span>automatically identifies</span> and engages with fresh content, 
        securing <span className="early-adopter"><IconComponent icon={HiIcons.HiOutlineSparkles} />prime positioning</span> in the 
        <span className="highlight-value"><IconComponent icon={HiIcons.HiOutlineStar} /> top {MOCK_DISCOVERED_VIDEOS[1].position_comment}-{MOCK_DISCOVERED_VIDEOS[0].position_comment} comments</span> to maximize visibility and drive targeted engagement.
      </DiscoveredVideoSubtitle>
      
      <DiscoveredVideosList>
        {videosToDisplay.map(video => (
          <DiscoveredVideoCard key={video.id}>
            <VideoHeader>
              <VideoThumbnail image={video.thumbnailUrl} />
              <VideoOverlay />
              <DiscoveryInfo>
                <IconComponent icon={FaIcons.FaEye} />
                Discovered and Engaged
              </DiscoveryInfo>
              <TimeSince>
                <IconComponent icon={FaIcons.FaClock} />
                {formatTimeAgo(video.discovered_at)}
              </TimeSince>
              <VideoTitle>{video.nome_do_video}</VideoTitle>
            </VideoHeader>
            
            <VideoContent>
              <ChannelInfo>
                <ChannelImage image={video.channel_image} />
                <ChannelName>{video.channel_name}</ChannelName>
              </ChannelInfo>
              
              <MetricsRow>
                <MetricItem>
                  <MetricValue>{video.views}</MetricValue>
                  <MetricLabel>Current Views</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{video.position_comment}</MetricValue>
                  <MetricLabel>Comment Position</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{(video.relevance_score * 10).toFixed(1)}</MetricValue>
                  <MetricLabel>Relevance Score</MetricLabel>
                </MetricItem>
              </MetricsRow>
              
              <EngagementSection>
                <EngagementHeader>
                  <EngagementTitle>
                    <IconComponent icon={FaIcons.FaCommentDots} />
                    Auto-Generated Comment
                  </EngagementTitle>
                  <EngagementLabel>
                    <IconComponent icon={FaIcons.FaCheckCircle} />
                    Posted
                  </EngagementLabel>
                </EngagementHeader>
                
                <EngagementMessage>
                  {highlightProductMention(video.engagement_message)}
                </EngagementMessage>
                
                <PositionIndicator>
                  <CommentPosition>
                    <IconComponent icon={FaIcons.FaSort} />
                    Position: #{video.position_comment} of {video.total_comments}
                  </CommentPosition>
                  
                  <ProjectedViews>
                    <IconComponent icon={FaIcons.FaChartLine} />
                    Projected: {video.projected_views.toLocaleString()} views
                  </ProjectedViews>
                </PositionIndicator>
              </EngagementSection>
            </VideoContent>
          </DiscoveredVideoCard>
        ))}
      </DiscoveredVideosList>
    </DiscoveredVideosContainer>
  );
};

export default RecentDiscoveredVideos;