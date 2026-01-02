import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { withOpacity } from '../styles/colors';
import * as FaIcons from 'react-icons/fa';
import * as HiIcons from 'react-icons/hi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as BiIcons from 'react-icons/bi';
import { IconComponent } from '../utils/IconHelper';
import Modal from './Modal';
import { useMonitoredChannels } from '../hooks/useMonitoredChannels';
import AgentActivityTimeline, { AgentActivityData } from './AgentActivityTimeline';

// Interface to define the data structure of recently discovered videos
interface DiscoveredVideo {
  id: number;
  video_id_youtube: string;
  nome_do_video: string; // video name
  thumbnailUrl: string;
  discovered_at: string; // Timestamp when video was discovered
  engaged_at: string;    // Timestamp when comment was posted
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
  sistema_tipo?: 'direct' | 'reply'; // Sistema 1 (direct) or Sistema 2 (reply)
  agentActivity?: AgentActivityData; // Agent Browser activity data
}

// Props for the component
interface RecentDiscoveredVideosProps {
  data?: DiscoveredVideo[];
  projectId?: string | number;
  loading?: boolean;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  itemsPerPage?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

// Example static data
const MOCK_DISCOVERED_VIDEOS: DiscoveredVideo[] = [
  {
    id: 101,
    video_id_youtube: 'dQw4w9WgXcQ',
    nome_do_video: 'How to increase your channel engagement in 2025',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    discovered_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    engaged_at: new Date(Date.now() - 43 * 60 * 1000).toISOString(),    // 43 minutes ago (2 min later)
    views: 218,
    channel_id: 1,
    channel_name: 'Marketing Digital Insights',
    channel_image: 'https://via.placeholder.com/80',
    engagement_message: 'Excellent content on engagement strategies! At Liftlio, we\'ve seen incredible results with integrated monitoring that helps identify trends ahead of the competition. The video covers key points for 2025.',
    content_category: 'Digital Marketing',
    relevance_score: 0.92,
    position_comment: 3,
    total_comments: 47,
    projected_views: 8500
  },
  {
    id: 102,
    video_id_youtube: 'xvFZjo5PgG0',
    nome_do_video: 'ARTIFICIAL INTELLIGENCE: How to implement it in your company',
    thumbnailUrl: 'https://img.youtube.com/vi/xvFZjo5PgG0/mqdefault.jpg',
    discovered_at: new Date(Date.now() - 97 * 60 * 1000).toISOString(), // 1h37min ago
    engaged_at: new Date(Date.now() - 96 * 60 * 1000).toISOString(),    // 1h36min ago (1 min later)
    views: 456,
    channel_id: 2,
    channel_name: 'Tech Trends BR',
    channel_image: 'https://via.placeholder.com/80',
    engagement_message: 'Loved the approach to AI! It\'s also worth noting that tools like Liftlio greatly facilitate the implementation of intelligent monitoring technologies for companies of any size. Great video!',
    content_category: 'Technology',
    relevance_score: 0.87,
    position_comment: 1,
    total_comments: 112,
    projected_views: 12000
  },
  {
    id: 103,
    video_id_youtube: 'bTWWFg_SkPQ',
    nome_do_video: 'Digital Transformation: What every company needs to know in 2025',
    thumbnailUrl: 'https://img.youtube.com/vi/bTWWFg_SkPQ/mqdefault.jpg',
    discovered_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 minutes ago
    engaged_at: new Date(Date.now() - 17 * 60 * 1000).toISOString(),    // 17 minutes ago (1 min later)
    views: 87,
    channel_id: 3,
    channel_name: 'Digital Transformation',
    channel_image: 'https://via.placeholder.com/80',
    engagement_message: 'Essential content for anyone looking to prepare for the future! Adding to what was mentioned, we\'ve seen that monitoring systems like Liftlio have helped companies anticipate market changes and optimize their digital strategies.',
    content_category: 'Business',
    relevance_score: 0.94,
    position_comment: 2,
    total_comments: 28,
    projected_views: 5200
  }
];

// Helper function to get YouTube video ID from thumbnail URL
const getVideoIdFromThumbnail = (url: string): string => {
  const match = url.match(/\/vi\/([^\/]+)\//);
  return match ? match[1] : '';
};

// Helper function to get thumbnail URLs in order of quality (highest to lowest)
const getThumbnailQualities = (url: string): string[] => {
  const videoId = getVideoIdFromThumbnail(url);
  if (!videoId) return [url];

  return [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  ];
};

// Component that tries to load thumbnail with fallback to lower qualities
const ThumbnailWithFallback: React.FC<{ url: string }> = ({ url }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [qualityIndex, setQualityIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const qualitiesRef = useRef<string[]>([]);
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    qualitiesRef.current = getThumbnailQualities(url);
    attemptedRef.current.clear();
    setQualityIndex(0);
    setCurrentUrl(qualitiesRef.current[0]);
    setIsLoading(true);
    setHasError(false);
    console.log('🔍 ThumbnailWithFallback: Starting with qualities:', qualitiesRef.current);
  }, [url]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const failedUrl = currentUrl;
    attemptedRef.current.add(failedUrl);
    const nextIndex = qualityIndex + 1;

    console.log(`❌ ThumbnailWithFallback: Failed quality ${qualityIndex} (${failedUrl.split('/').pop()})`);
    console.log(`   Attempting ${nextIndex}/${qualitiesRef.current.length - 1}`);

    if (nextIndex < qualitiesRef.current.length) {
      setQualityIndex(nextIndex);
      setCurrentUrl(qualitiesRef.current[nextIndex]);
      setIsLoading(true);
    } else {
      console.log('❌ ThumbnailWithFallback: All qualities exhausted');
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    // Check if image actually loaded (some 404 pages return HTML)
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      handleError(e);
      return;
    }

    console.log(`✅ ThumbnailWithFallback: Success at quality ${qualityIndex} (${currentUrl.split('/').pop()})`);
    setIsLoading(false);
    setHasError(false);
  };

  if (!currentUrl) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.2)',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {isLoading && !hasError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(30, 30, 35, 0.8)',
          zIndex: 1
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(139, 92, 246, 0.3)',
            borderTop: '3px solid #8B5CF6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}
      {hasError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(30, 30, 35, 0.8)',
          color: '#888',
          fontSize: '12px',
          zIndex: 1
        }}>
          No thumbnail available
        </div>
      )}
      <img
        key={currentUrl}
        src={currentUrl}
        alt="Video thumbnail"
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: hasError ? 'none' : 'block',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
    </>
  );
};

// Creative monitoring visualization component
const MonitoringVisualization = styled.div`
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
`;

const ScanningWave = styled(motion.div)`
  width: 60px;
  height: 30px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const WaveBar = styled(motion.div)<{ delay: number }>`
  width: 3px;
  background: ${props => props.theme.name === 'dark' ? '#00f5ff' : '#6b00cc'};
  border-radius: 2px;
  box-shadow: 0 0 10px ${props => props.theme.name === 'dark' ? '#00f5ff' : '#6b00cc'};
`;

const RadarContainer = styled.div`
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RadarSweep = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    ${props => props.theme.name === 'dark' ? 'rgba(0, 245, 255, 0.6)' : 'rgba(107, 0, 204, 0.6)'} 45deg,
    transparent 90deg
  );
  filter: blur(2px);
`;

const RadarRing = styled(motion.div)<{ size: number }>`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(0, 245, 255, 0.3)' 
    : 'rgba(107, 0, 204, 0.3)'};
  border-radius: 50%;
`;

const DataStream = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DataDot = styled(motion.div)<{ active: boolean }>`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${props => props.active 
    ? (props.theme.name === 'dark' ? '#00f5ff' : '#6b00cc')
    : (props.theme.name === 'dark' ? 'rgba(0, 245, 255, 0.2)' : 'rgba(107, 0, 204, 0.2)')};
  box-shadow: ${props => props.active 
    ? `0 0 6px ${props.theme.name === 'dark' ? '#00f5ff' : '#6b00cc'}`
    : 'none'};
`;

// Updated styles for the component with animations
const DiscoveredVideosContainer = styled(motion.div)`
  margin-bottom: 32px;
  position: relative;
  background: ${props => props.theme.name === 'dark' ? '#1A1A1A' : props.theme.colors.white};
  padding: 32px;
  border-radius: 8px;
  border: none;
`;

const DiscoveredVideosHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  border-bottom: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.08)'};
  padding-bottom: 16px;
`;

const DiscoveredVideosTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  letter-spacing: -0.3px;

  svg {
    margin-right: 12px;
    color: ${props => props.theme.name === 'dark' ? '#8B5CF6' : props.theme.colors.primary};
    font-size: 20px;
  }
`;

const LiveTrackingBadge = styled.div`
  background: transparent;
  color: ${props => props.theme.name === 'dark' ? 'rgba(139, 92, 246, 0.8)' : props.theme.colors.primary};
  border: none;
  font-size: 10px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  letter-spacing: 0.8px;

  svg {
    margin-right: 6px;
    font-size: 8px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

// Tech-style monitoring banner that shows active monitoring status
const BinaryCodeBackground = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  height: 100%;
  overflow: hidden;
  opacity: 0.1;
  font-family: monospace;
  font-size: 10px;
  color: ${props => props.theme.colors.primary};
  user-select: none;
  
  &:before {
    content: '01001100 01101001 01100110 01110100 01101100 01101001 01101111 00100000 01001101 01101111 01101110 01101001 01110100 01101111 01110010 01101001 01101110 01100111 00100000 01000001 01100011 01110100 01101001 01110110 01100101 00100000 01000001 01001001 00100000 01010000 01110010 01101111 01100011 01100101 01110011 01110011 01101001 01101110 01100111 00100000 01000100 01100001 01110100 01100001 00100000 01000001 01101110 01100001 01101100 01111001 01110011 01101001 01110011 00100000 01001001 01101110 00100000 01010000 01110010 01101111 01100111 01110010 01100101 01110011 01110011';
    position: absolute;
    top: 0;
    left: 0;
    width: 300%;
    opacity: 0.7;
    animation: scrollBinary 20s linear infinite;
  }
  
  @keyframes scrollBinary {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
`;

const TechMonitoringBanner = styled(motion.div)`
  position: relative;
  background: ${props => props.theme.name === 'dark'
    ? '#1A1A1A'
    : 'rgba(248, 248, 250, 1)'};
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 24px;
  overflow: hidden;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
`;

const MonitoringStatusText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#666'};
  position: relative;
  z-index: 1;
  line-height: 1.6;
  flex: 1;

  span {
    color: ${props => props.theme.colors.text.primary};
    font-weight: 500;
  }
`;

const DataMetricsRow = styled.div`
  display: flex;
  gap: 24px;
  z-index: 1;
  font-size: 11px;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.4)' : props.theme.colors.text.secondary};
`;

const DataMetric = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  span {
    font-family: 'SF Mono', 'Courier New', monospace;
    color: ${props => props.theme.colors.text.primary};
    font-weight: 400;
    font-size: 11px;
  }

  svg {
    color: ${props => props.theme.name === 'dark' ? 'rgba(139, 92, 246, 0.6)' : props.theme.colors.primary};
    font-size: 10px;
  }
`;

const MonitoringIcon = styled(motion.div)`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;

  svg {
    color: ${props => props.theme.name === 'dark' ? 'rgba(139, 92, 246, 0.8)' : props.theme.colors.primary};
    font-size: 14px;
  }
  
  @keyframes pulseRing {
    0% { transform: scale(0.8); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 0.4; }
    100% { transform: scale(0.8); opacity: 0.8; }
  }
  
  @keyframes rotateAnimation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const DiscoveredVideoSubtitle = styled.div`
  font-size: 13px;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.5)' : props.theme.colors.text.secondary};
  margin-bottom: 32px;
  line-height: 1.7;
  max-width: 800px;

  span {
    font-weight: 500;
    color: ${props => props.theme.colors.text.primary};
  }
`;

// Empty state components
const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 80px 40px;
  background: ${props => props.theme.name === 'dark'
    ? 'linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, transparent 100%)'
    : 'rgba(139, 92, 246, 0.03)'};
  border-radius: 12px;
  margin: 20px 0;
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.3;
  color: ${props => props.theme.colors.text.primary};

  svg {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.5; }
  }
`;

const EmptyStateTitle = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 12px;
`;

const EmptyStateDescription = styled.div`
  font-size: 14px;
  line-height: 1.7;
  color: ${props => props.theme.colors.text.secondary};
  max-width: 500px;
  margin: 0 auto;
`;

const EmptyStateFooter = styled.div`
  margin-top: 24px;
  font-size: 12px;
  color: rgba(139, 92, 246, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

// Horizontal scroll layout for videos
const VideosContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const VideosScrollWrapper = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => withOpacity(props.theme.colors.background, 0.1)};
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => withOpacity(props.theme.colors.primary, 0.3)};
    border-radius: 10px;
    
    &:hover {
      background: ${props => withOpacity(props.theme.colors.primary, 0.5)};
    }
  }
`;

const VideosGrid = styled.div`
  display: flex;
  gap: 24px;
  padding: 4px;
  min-width: min-content;
`;

const VideoCardWrapper = styled(motion.div)`
  min-width: 350px;
  max-width: 350px;
  flex-shrink: 0;
`;

const VideoCard = styled(motion.div)`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(30, 30, 35, 0.5)'
    : props.theme.colors.white};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: none;
  transition: all 0.25s ease;
  cursor: pointer;
  position: relative;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.08)'};

  &:hover {
    transform: translateY(-4px);
    border-color: ${props => props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.4)'
      : 'rgba(139, 92, 246, 0.3)'};
    box-shadow: ${props => props.theme.name === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.4)'
      : '0 8px 24px rgba(0, 0, 0, 0.08)'};
  }
`;

const VideoHeader = styled.div`
  position: relative;
  height: 170px;
  overflow: hidden;
`;

const VideoThumbnail = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.4s ease;
  overflow: hidden;

  ${VideoCard}:hover & {
    transform: scale(1.05);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
    rgba(0, 0, 0, 0.3) 40%,
    rgba(0, 0, 0, 0.1) 70%);
  z-index: 1;
`;

// StatusBadge removed for minimalist design

const TimeBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  padding: 4px 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 400;
  z-index: 2;
  display: flex;
  align-items: center;
  border: none;
`;

const VideoTitle = styled.h3`
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  color: white;
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  line-height: 1.4;
  z-index: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const VideoContent = styled.div`
  padding: 16px;
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
`;

const ChannelLeftInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const ChannelImage = styled.div<{ $image: string }>`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background-image: url(${props => props.$image});
  background-size: cover;
  background-position: center;
  margin-right: 12px;
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.2)};
`;

const ChannelName = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.fontSizes.sm};
`;

const VisitCommentButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 400;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;

  svg {
    font-size: 14px;
  }

  &:hover {
    background: ${props => props.theme.name === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'};
    color: ${props => props.theme.colors.primary};
    transform: none;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
`;

const MetricItem = styled.div`
  text-align: center;
  padding: 12px 8px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(25, 25, 30, 0.5)'
    : 'rgba(248, 248, 250, 1)'};
  border-radius: 10px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)'};
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 4px;
`;

const MetricLabel = styled.div`
  font-size: 10px;
  color: ${props => props.theme.name === 'dark' ? '#888' : '#666'};
  text-transform: capitalize;
  letter-spacing: 0px;
  font-weight: 400;
`;

const EngagementSection = styled.div`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(25, 25, 30, 0.4)'
    : 'rgba(248, 248, 250, 0.5)'};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)'};
`;

const EngagementHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  justify-content: space-between;
`;

const EngagementTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  align-items: center;
  text-transform: none;
  letter-spacing: 0px;

  svg {
    display: none;
  }
`;

const EngagementLabel = styled.div`
  font-size: 10px;
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  padding: 0;
  border-radius: 0;
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.normal};

  svg {
    display: none;
  }
`;

const EngagementMessage = styled.div`
  font-size: 12px;
  color: ${props => props.theme.name === 'dark' ? '#ccc' : '#444'};
  line-height: 1.6;
  padding: 12px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(20, 20, 25, 0.6)'
    : 'white'};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)'};
  height: 70px;
  overflow-y: auto;
  position: relative;
  padding-left: 12px;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => withOpacity(props.theme.colors.background, 0.1)};
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => withOpacity(props.theme.colors.primary, 0.2)};
    border-radius: 10px;
  }
  
  /* Removed decorative quotes for minimalism */
`;

const ProductMention = styled.span`
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
`;

const PositionIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
`;

const CommentPosition = styled.div`
  background: ${props => withOpacity(props.theme.colors.primary, 0.1)};
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: 10px;
  
  svg {
    margin-right: 4px;
    font-size: 8px;
  }
`;

const ProjectedViews = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 10px;
  
  svg {
    margin-right: 4px;
    color: ${props => props.theme.colors.warning};
    font-size: 9px;
  }
`;

// Styled components for the modal content
const VideoDetailContainer = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(30, 30, 30, 0.95)' 
    : 'white'};
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
`;

const VideoDetailHeader = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
`;

const VideoDetailThumbnail = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const VideoDetailOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 40%,
    rgba(0, 0, 0, 0.1) 80%);
  z-index: 1;
`;

const VideoDetailTitle = styled.h2`
  position: absolute;
  bottom: 20px;
  left: 24px;
  right: 24px;
  color: white;
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  z-index: 2;
`;

const VideoDetailContent = styled.div`
  padding: 24px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ChannelDetailInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const ChannelDetailImage = styled.div<{ image: string }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  margin-right: 16px;
  border: 2px solid white;
  box-shadow: 0 2px 8px ${props => withOpacity(props.theme.colors.primary, 0.1)};
`;

const ChannelDetailText = styled.div`
  display: flex;
  flex-direction: column;
`;

const ChannelDetailName = styled.div`
  font-weight: ${props => props.theme.fontWeights.bold};
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 4px;
`;

const ChannelDetailCategory = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  display: inline-block;
  padding: 3px 8px;
  background: ${props => withOpacity(props.theme.colors.background, 0.1)};
  border-radius: 4px;
`;

const TimeInfoWrapper = styled.div`
  display: flex;
  gap: 20px;
`;

const TimeInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const TimeLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 4px;
  text-transform: none;
  letter-spacing: 0px;
  font-weight: 400;
`;

const TimeValue = styled.div`
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  align-items: center;

  svg {
    display: none;
  }
`;

const DetailMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DetailMetricCard = styled.div`
  background: ${props => withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.md};
  padding: 20px 16px;
  text-align: center;
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
`;

const DetailMetricValue = styled.div`
  font-size: 28px;
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 8px;
`;

const DetailMetricLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: capitalize;
  font-weight: 400;
`;

const DetailEngagementSection = styled.div`
  margin-bottom: 24px;
`;

const DetailEngagementTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 12px;
  display: flex;
  align-items: center;

  svg {
    display: none;
  }
`;

const DetailEngagementContent = styled.div`
  background: ${props => withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.md};
  padding: 24px;
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  color: ${props => props.theme.colors.text.primary};
  position: relative;
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
  
  /* Removed decorative quotes for minimalism */

  padding-left: 24px;
`;

const DetailStatsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
`;

const DetailCommentPosition = styled.div`
  display: flex;
  align-items: center;
  background: ${props => withOpacity(props.theme.colors.primary, 0.1)};
  padding: 8px 16px;
  border-radius: ${props => props.theme.radius.md};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary};
  
  svg {
    margin-right: 8px;
  }
`;

const DetailProjectedViews = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  
  svg {
    margin-right: 8px;
    color: ${props => props.theme.colors.warning};
  }
`;

// Helper function to check if date is today
const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date.getDate() === now.getDate() &&
         date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
};

// Function to format relative time
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  // Check if it is today
  const today = isToday(dateString);

  if (diffMins < 1) return today ? 'Today' : 'Just now';
  if (diffMins < 60) return today ? `Today, ${diffMins}m ago` : `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return today ? `Today, ${diffHours}h ago` : `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Function to format "Posted" timestamp (more verbose)
const formatPostedTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Posted just now';
  if (diffMins < 60) {
    const minutes = diffMins;
    return minutes === 1 ? 'Posted 1 minute ago' : `Posted ${minutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? 'Posted 1 hour ago' : `Posted ${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return diffDays === 1 ? 'Posted 1 day ago' : `Posted ${diffDays} days ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'Posted 1 month ago' : `Posted ${diffMonths} months ago`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? 'Posted 1 year ago' : `Posted ${diffYears} years ago`;
};

// Function to highlight product mentions in text
const highlightProductMention = (text: string): React.ReactNode => {
  // Simple approach - in a real app would need more sophisticated parsing
  const parts = text.split(/(Liftlio)/g);
  
  return parts.map((part, i) => 
    part === 'Liftlio' ? <ProductMention key={i}>{part}</ProductMention> : part
  );
};

// Pagination styled components
const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 16px 0;
  border-top: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
`;

const PaginationInfo = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  align-items: center;
  
  span {
    font-weight: ${props => props.theme.fontWeights.semiBold};
    color: ${props => props.theme.colors.primary};
    margin: 0 4px;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: ${props => props.theme.radius.md};
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(40, 40, 40, 0.95)' 
    : props.theme.colors.white};
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.2)};
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  svg {
    font-size: 14px;
  }
  
  &:hover:not(:disabled) {
    background: ${props => withOpacity(props.theme.colors.primary, 0.05)};
    border-color: ${props => withOpacity(props.theme.colors.primary, 0.2)};
    color: ${props => props.theme.colors.primary};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${props => withOpacity(props.theme.colors.background, 0.1)};
  }
`;

const PageIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.radius.md};
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: ${props => props.theme.fontWeights.bold};
  font-size: ${props => props.theme.fontSizes.sm};
`;

// Horizontal scroll navigation buttons
const ScrollNavButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction}: -20px;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(40, 40, 40, 0.95)' 
    : props.theme.colors.white};
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.2)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 16px;
  }
  
  &:hover {
    background: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
    
    svg {
      color: white;
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: ${props => props.theme.name === 'dark' 
        ? 'rgba(40, 40, 40, 0.95)' 
        : props.theme.colors.white};
      
      svg {
        color: ${props => props.theme.colors.primary};
      }
    }
  }
`;

// The main component
const RecentDiscoveredVideos: React.FC<RecentDiscoveredVideosProps> = ({ 
  data, 
  projectId,
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  itemsPerPage = 10,
  hasNextPage = false,
  hasPrevPage = false,
  onNextPage,
  onPrevPage
}) => {
  // Use provided data or fallback to mock data
  // Show empty state only when data is explicitly an empty array (not undefined/null)
  const shouldShowEmptyState = data !== undefined && data.length === 0 && !loading;
  const videosToDisplay = (data && data.length > 0) ? data : MOCK_DISCOVERED_VIDEOS;
  
  // Fetch real channel count data
  const { count: channelCount, loading: channelLoading } = useMonitoredChannels(projectId);
  
  // State for modal
  const [selectedVideo, setSelectedVideo] = useState<DiscoveredVideo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for horizontal scroll
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // State for monitoring data display
  const [monitoringStatus, setMonitoringStatus] = useState({
    activeIcon: RiIcons.RiRadarLine,
    message: "MONITORING ACTIVE: Scanning YouTube channels for new relevant content",
    activity: "STANDBY",
    metrics: {
      channels: channelCount || 0,
      scans: 142,
      videos: 386
    }
  });
  
  // Update when channel count changes
  useEffect(() => {
    if (!channelLoading) {
      setMonitoringStatus(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          channels: channelCount
        }
      }));
    }
  }, [channelCount, channelLoading]);
  
  // Simulates changing monitoring status for a more dynamic feel
  useEffect(() => {
    let scanCount = 142;
    
    const statuses = [
      { 
        activeIcon: RiIcons.RiRadarLine, 
        message: "MONITORING ACTIVE: Scanning YouTube channels for new relevant content",
        activity: "STANDBY"
      },
      { 
        activeIcon: BiIcons.BiSearch, 
        message: "AI ANALYSIS: Evaluating content relevance and engagement opportunities",
        activity: "SCANNING"
      },
      { 
        activeIcon: IoIcons.IoAnalyticsSharp, 
        message: "OPPORTUNITY DETECTION: Identifying high-value engagement points",
        activity: "ANALYZING"
      }
    ];
    
    const interval = setInterval(() => {
      scanCount += 1;
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      setMonitoringStatus(prev => ({
        ...randomStatus,
        metrics: {
          ...prev.metrics,
          scans: scanCount,
        }
      }));
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Functions for horizontal scroll navigation
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  // Check scroll buttons when videos change
  useEffect(() => {
    checkScrollButtons();
  }, [videosToDisplay]);

  const openVideoDetails = (video: DiscoveredVideo) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  return (
    <DiscoveredVideosContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <DiscoveredVideosHeader>
        <DiscoveredVideosTitle>
          <IconComponent icon={HiIcons.HiOutlineGlobe} />
          Recently Discovered Videos from Monitored Channels
        </DiscoveredVideosTitle>
        
        <LiveTrackingBadge>
          <IconComponent icon={FaIcons.FaCircle} />
          LIVE TRACKING
        </LiveTrackingBadge>
      </DiscoveredVideosHeader>
      
      <TechMonitoringBanner
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <MonitoringIcon>
            <IconComponent icon={monitoringStatus.activeIcon} />
          </MonitoringIcon>
          <MonitoringStatusText>
            <span>{monitoringStatus.activity}:</span> {monitoringStatus.message}
          </MonitoringStatusText>
        </div>
      </TechMonitoringBanner>
      
      <DiscoveredVideoSubtitle>
        Our AI-powered system <span>automatically identifies</span> and engages with fresh content,
        securing prime positioning in the top {MOCK_DISCOVERED_VIDEOS[1].position_comment}-{MOCK_DISCOVERED_VIDEOS[0].position_comment} comments to maximize visibility and drive targeted engagement.
      </DiscoveredVideoSubtitle>

      {/* Empty state when no videos are discovered */}
      {shouldShowEmptyState && (
        <EmptyStateContainer>
          <EmptyStateIcon>
            <IconComponent icon={RiIcons.RiRadarLine} />
          </EmptyStateIcon>

          <EmptyStateTitle>
            Discovering Strategic Videos
          </EmptyStateTitle>

          <EmptyStateDescription>
            Your videos and generated messages will appear here. Liftlio's computer vision watches videos and analyzes them, only accepting those that are strategic for your audience.
          </EmptyStateDescription>

          <EmptyStateFooter>
            System Active • Monitoring {channelCount || 0} Channels
          </EmptyStateFooter>
        </EmptyStateContainer>
      )}

      {/* Videos container - only show when there are videos */}
      {!shouldShowEmptyState && (
        <VideosContainer>
        {/* Horizontal scroll navigation buttons */}
        <ScrollNavButton 
          direction="left" 
          onClick={scrollLeft}
          disabled={!canScrollLeft}
        >
          <IconComponent icon={FaIcons.FaChevronLeft} />
        </ScrollNavButton>
        
        <ScrollNavButton 
          direction="right" 
          onClick={scrollRight}
          disabled={!canScrollRight}
        >
          <IconComponent icon={FaIcons.FaChevronRight} />
        </ScrollNavButton>
        
        <VideosScrollWrapper 
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
        >
          <VideosGrid>
            {videosToDisplay.map((video, index) => (
              <VideoCardWrapper
                key={`video-${video.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
              >
                <VideoCard 
                  onClick={() => openVideoDetails(video)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  layoutId={`video-card-${video.id}`}
                >
                  <VideoHeader>
              <VideoThumbnail>
                <ThumbnailWithFallback url={video.thumbnailUrl} />
              </VideoThumbnail>
              <VideoOverlay />
              <TimeBadge>
                {formatTimeAgo(video.discovered_at)}
              </TimeBadge>
              <VideoTitle>{video.nome_do_video}</VideoTitle>
            </VideoHeader>
            
            <VideoContent>
              <ChannelInfo>
                <ChannelLeftInfo>
                  <ChannelImage $image={video.channel_image} />
                  <ChannelName>{video.channel_name}</ChannelName>
                </ChannelLeftInfo>
                <VisitCommentButton
                  href={`https://www.youtube.com/watch?v=${video.video_id_youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open video"
                >
                  <IconComponent icon={FaIcons.FaExternalLinkAlt} />
                </VisitCommentButton>
              </ChannelInfo>
              
              <MetricsRow>
                <MetricItem>
                  <MetricValue>{video.views.toLocaleString()}</MetricValue>
                  <MetricLabel>views</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{video.position_comment}</MetricValue>
                  <MetricLabel>comments</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{(video.relevance_score * 10).toFixed(1)}</MetricValue>
                  <MetricLabel>relevance</MetricLabel>
                </MetricItem>
              </MetricsRow>
              
              {/* Agent Activity Timeline - shown when agent data available */}
              {video.agentActivity && (
                <div style={{ marginBottom: '12px' }}>
                  <AgentActivityTimeline
                    activity={video.agentActivity}
                    variant="compact"
                  />
                </div>
              )}

              <EngagementSection>
                <EngagementHeader>
                  <EngagementTitle>
                    {formatTimeAgo(video.engaged_at)}
                  </EngagementTitle>
                  <EngagementLabel>
                  </EngagementLabel>
                </EngagementHeader>

                <EngagementMessage>
                  {highlightProductMention(video.engagement_message)}
                </EngagementMessage>

                <PositionIndicator>
                  <CommentPosition>
                    <IconComponent icon={FaIcons.FaSort} />
                    #{video.position_comment} of {video.total_comments}
                  </CommentPosition>

                  <ProjectedViews>
                    <IconComponent icon={FaIcons.FaChartLine} />
                    Projected: {video.projected_views.toLocaleString()} views
                  </ProjectedViews>
                </PositionIndicator>
              </EngagementSection>
            </VideoContent>
          </VideoCard>
        </VideoCardWrapper>
            ))}
          </VideosGrid>
        </VideosScrollWrapper>
      </VideosContainer>
      )}

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <PaginationContainer>
          <PaginationInfo>
            Showing <span>{Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}</span> to{' '}
            <span>{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span>{totalCount}</span> discovered videos
          </PaginationInfo>
          
          <PaginationControls>
            <PaginationButton 
              disabled={!hasPrevPage} 
              onClick={onPrevPage}
            >
              <IconComponent icon={FaIcons.FaChevronLeft} />
              Previous
            </PaginationButton>
            
            <PageIndicator>
              {currentPage}
            </PageIndicator>
            
            <PaginationButton 
              disabled={!hasNextPage} 
              onClick={onNextPage}
            >
              Next
              <IconComponent icon={FaIcons.FaChevronRight} />
            </PaginationButton>
          </PaginationControls>
        </PaginationContainer>
      )}
      
      {/* Modal for detailed view */}
      {selectedVideo && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          title="Discovered Video Details"
          size="large"
        >
          <VideoDetailContainer>
            <VideoDetailHeader>
              <VideoDetailThumbnail>
                <ThumbnailWithFallback url={selectedVideo.thumbnailUrl} />
              </VideoDetailThumbnail>
              <VideoDetailOverlay />
              <VideoDetailTitle>{selectedVideo.nome_do_video}</VideoDetailTitle>
            </VideoDetailHeader>
            
            <VideoDetailContent>
              <DetailRow>
                <ChannelDetailInfo>
                  <ChannelDetailImage image={selectedVideo.channel_image} />
                  <ChannelDetailText>
                    <ChannelDetailName>{selectedVideo.channel_name}</ChannelDetailName>
                    <ChannelDetailCategory>{selectedVideo.content_category}</ChannelDetailCategory>
                  </ChannelDetailText>
                </ChannelDetailInfo>
                
                <TimeInfoWrapper>
                  <TimeInfo>
                    <TimeLabel>Discovered</TimeLabel>
                    <TimeValue>
                      {formatTimeAgo(selectedVideo.discovered_at)}
                    </TimeValue>
                  </TimeInfo>

                  <TimeInfo>
                    <TimeLabel>Engaged</TimeLabel>
                    <TimeValue>
                      {formatTimeAgo(selectedVideo.engaged_at)}
                    </TimeValue>
                  </TimeInfo>
                </TimeInfoWrapper>
              </DetailRow>
              
              <DetailMetricsGrid>
                <DetailMetricCard>
                  <DetailMetricValue>{selectedVideo.views.toLocaleString()}</DetailMetricValue>
                  <DetailMetricLabel>Current views</DetailMetricLabel>
                </DetailMetricCard>

                <DetailMetricCard>
                  <DetailMetricValue>{selectedVideo.projected_views.toLocaleString()}</DetailMetricValue>
                  <DetailMetricLabel>Projected views</DetailMetricLabel>
                </DetailMetricCard>

                <DetailMetricCard>
                  <DetailMetricValue>{(selectedVideo.relevance_score * 10).toFixed(1)}</DetailMetricValue>
                  <DetailMetricLabel>Relevance</DetailMetricLabel>
                </DetailMetricCard>
              </DetailMetricsGrid>

              {/* Agent Activity Timeline - Full view in modal */}
              {selectedVideo.agentActivity && (
                <div style={{ marginBottom: '24px' }}>
                  <AgentActivityTimeline
                    activity={selectedVideo.agentActivity}
                    variant="full"
                  />
                </div>
              )}

              <DetailEngagementSection>
                <DetailEngagementTitle>
                  Comment
                </DetailEngagementTitle>
                
                <DetailEngagementContent>
                  {highlightProductMention(selectedVideo.engagement_message)}
                </DetailEngagementContent>
              </DetailEngagementSection>
              
              <DetailStatsFooter>
                <DetailCommentPosition>
                  <IconComponent icon={FaIcons.FaSort} />
                  #{selectedVideo.position_comment} of {selectedVideo.total_comments} comments
                </DetailCommentPosition>
              </DetailStatsFooter>
            </VideoDetailContent>
          </VideoDetailContainer>
        </Modal>
      )}
    </DiscoveredVideosContainer>
  );
};

export default RecentDiscoveredVideos;