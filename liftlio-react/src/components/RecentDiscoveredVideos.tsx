import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { withOpacity } from '../styles/colors';
import * as FaIcons from 'react-icons/fa';
import * as HiIcons from 'react-icons/hi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as BiIcons from 'react-icons/bi';
import { IconComponent } from '../utils/IconHelper';
import Modal from './Modal';
import { useMonitoredChannels } from '../hooks/useMonitoredChannels';

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

// Estilos atualizados para o componente
const DiscoveredVideosContainer = styled.div`
  margin-bottom: 30px;
  position: relative;
  animation: fadeIn 0.6s ease-out;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.03)' 
    : props.theme.colors.white};
  padding: 24px;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.name === 'dark' 
    ? '0 3px 10px rgba(0, 0, 0, 0.3)' 
    : '0 3px 10px rgba(0, 0, 0, 0.05)'};
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const DiscoveredVideosHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  border-bottom: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
  padding-bottom: 12px;
`;

const DiscoveredVideosTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
    font-size: 20px;
  }
`;

const LiveTrackingBadge = styled.div`
  background: ${props => withOpacity(props.theme.colors.info, 0.9)};
  color: white;
  font-size: 10px;
  font-weight: ${props => props.theme.fontWeights.bold};
  padding: 4px 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px ${props => withOpacity(props.theme.colors.info, 0.2)};
  
  svg {
    margin-right: 6px;
    font-size: 9px;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
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

const TechMonitoringBanner = styled.div`
  position: relative;
  background: linear-gradient(90deg, 
    ${props => withOpacity(props.theme.colors.primary, 0.05)} 0%,
    ${props => withOpacity(props.theme.colors.info, 0.1)} 50%,
    ${props => withOpacity(props.theme.colors.primary, 0.05)} 100%
  );
  border-radius: ${props => props.theme.radius.md};
  padding: 16px 16px;
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid ${props => withOpacity(props.theme.colors.primary, 0.1)};
  display: flex;
  align-items: center;
  min-height: 44px;
  
  // Tech pattern overlay
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle, ${props => withOpacity(props.theme.colors.primary, 0.1)} 1px, transparent 1px),
      linear-gradient(90deg, ${props => withOpacity(props.theme.colors.primary, 0.05)} 1px, transparent 1px);
    background-size: 20px 20px, 20px 20px;
    pointer-events: none;
    opacity: 0.4;
  }
  
  // Scan line animation
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, 
      transparent 0%, 
      ${props => withOpacity(props.theme.colors.info, 0.2)} 50%, 
      transparent 100%);
    opacity: 0.6;
    width: 50%;
    transform: skewX(-20deg);
    animation: scanAnimation 3s ease-in-out infinite;
  }
  
  @keyframes scanAnimation {
    0% { transform: translateX(-100%) skewX(-20deg); }
    100% { transform: translateX(200%) skewX(-20deg); }
  }
`;

const MonitoringStatusText = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text.primary};
  margin-left: 16px;
  position: relative;
  z-index: 1;
  
  span {
    color: ${props => props.theme.colors.primary};
    font-weight: ${props => props.theme.fontWeights.bold};
  }
`;

const DataMetricsRow = styled.div`
  position: absolute;
  bottom: 4px;
  right: 16px;
  display: flex;
  gap: 16px;
  z-index: 1;
  font-size: 10px;
  color: ${props => props.theme.colors.text.secondary};
`;

const DataMetric = styled.div`
  display: flex;
  align-items: center;
  
  span {
    font-family: 'Courier New', monospace;
    color: ${props => props.theme.colors.primary};
    margin-left: 4px;
    font-weight: ${props => props.theme.fontWeights.semiBold};
  }
  
  svg {
    color: ${props => props.theme.colors.info};
    font-size: 10px;
    margin-right: 4px;
  }
`;

const MonitoringIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => withOpacity(props.theme.colors.background, 0.9)};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 8px ${props => withOpacity(props.theme.colors.primary, 0.2)};
  
  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 16px;
    animation: rotateAnimation 4s linear infinite;
  }
  
  &:before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    border: 2px solid ${props => withOpacity(props.theme.colors.primary, 0.3)};
    animation: pulseRing 2s ease-out infinite;
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
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 24px;
  line-height: 1.6;
  padding: 12px 16px;
  background: ${props => withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.md};
  border-left: 3px solid ${props => props.theme.colors.primary};
  
  span {
    font-weight: ${props => props.theme.fontWeights.semiBold};
    color: ${props => props.theme.colors.primary};
  }
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

const VideoCardWrapper = styled.div`
  min-width: 350px;
  max-width: 350px;
  flex-shrink: 0;
`;

const VideoCard = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(45, 45, 55, 0.95)' 
    : props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
  box-shadow: ${props => props.theme.name === 'dark'
    ? '0 4px 12px rgba(0, 0, 0, 0.3)'
    : '0 4px 12px rgba(0, 0, 0, 0.05)'};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  position: relative;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : withOpacity(props.theme.colors.tertiary, 0.1)};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09);
  }
  
  /* Subtle tech pattern */
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: linear-gradient(90deg, 
      ${props => withOpacity(props.theme.colors.primary, 0.01)} 1px, 
      transparent 1px),
    linear-gradient(${props => withOpacity(props.theme.colors.primary, 0.01)} 1px, 
      transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
    opacity: 0.5;
  }
`;

const VideoHeader = styled.div`
  position: relative;
  height: 170px;
  overflow: hidden;
`;

const VideoThumbnail = styled.div<{ image: string }>`
  width: 100%;
  height: 100%;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  transition: transform 0.4s ease;
  
  ${VideoCard}:hover & {
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
    rgba(0, 0, 0, 0.3) 40%,
    rgba(0, 0, 0, 0.1) 70%);
  z-index: 1;
`;

const StatusBadge = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(25, 42, 70, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  svg {
    margin-right: 4px;
    color: ${props => props.theme.colors.info};
    font-size: 11px;
  }
`;

const TimeBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(25, 42, 70, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  svg {
    margin-right: 4px;
    color: ${props => props.theme.colors.success};
    font-size: 9px;
  }
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
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
`;

const ChannelImage = styled.div<{ image: string }>`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background-image: url(${props => props.image});
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

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
`;

const MetricItem = styled.div`
  text-align: center;
  padding: 8px 4px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : withOpacity(props.theme.colors.background, 0.05)};
  border-radius: ${props => props.theme.radius.md};
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : withOpacity(props.theme.colors.tertiary, 0.1)};
`;

const MetricValue = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const MetricLabel = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EngagementSection = styled.div`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.03)'
    : withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.md};
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : withOpacity(props.theme.colors.tertiary, 0.1)};
`;

const EngagementHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  justify-content: space-between;
`;

const EngagementTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: 11px;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  svg {
    margin-right: 6px;
    color: ${props => props.theme.colors.primary};
    font-size: 12px;
  }
`;

const EngagementLabel = styled.div`
  font-size: 10px;
  background: ${props => withOpacity(props.theme.colors.success, 0.1)};
  color: ${props => props.theme.colors.success};
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  
  svg {
    margin-right: 4px;
    font-size: 9px;
  }
`;

const EngagementMessage = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.5;
  padding: 10px;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(20, 20, 25, 0.95)' 
    : 'white'};
  border-radius: ${props => props.theme.radius.sm};
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.15)'
    : withOpacity(props.theme.colors.tertiary, 0.1)};
  height: 70px;
  overflow-y: auto;
  position: relative;
  padding-left: 18px;
  
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
  
  &::before {
    content: '"';
    position: absolute;
    top: 5px;
    left: 7px;
    font-size: 18px;
    line-height: 1;
    color: ${props => withOpacity(props.theme.colors.primary, 0.3)};
    font-family: Georgia, serif;
  }
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

const VideoDetailThumbnail = styled.div<{ image: string }>`
  width: 100%;
  height: 100%;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
`;

const VideoDetailOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, 
    rgba(0, 0, 0, 0.9) 0%, 
    rgba(0, 0, 0, 0.5) 40%,
    rgba(0, 0, 0, 0.2) 80%);
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
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TimeValue = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
    color: ${props => props.theme.colors.primary};
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
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
`;

const DetailEngagementSection = styled.div`
  margin-bottom: 24px;
`;

const DetailEngagementTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
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
  
  &::before {
    content: '"';
    position: absolute;
    top: 12px;
    left: 16px;
    font-size: 40px;
    line-height: 1;
    color: ${props => withOpacity(props.theme.colors.primary, 0.2)};
    font-family: Georgia, serif;
  }
  
  padding-left: 40px;
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
  hasNextPage = false,
  hasPrevPage = false,
  onNextPage,
  onPrevPage
}) => {
  // Use provided data or fallback to mock data
  const videosToDisplay = data || MOCK_DISCOVERED_VIDEOS;
  
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
    <DiscoveredVideosContainer>
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
      
      <TechMonitoringBanner>
        <MonitoringIcon>
          <IconComponent icon={monitoringStatus.activeIcon} />
        </MonitoringIcon>
        <MonitoringStatusText>
          <span>{monitoringStatus.activity}:</span> {monitoringStatus.message}
        </MonitoringStatusText>
        <DataMetricsRow>
          <DataMetric>
            <IconComponent icon={FaIcons.FaSatelliteDish} />
            CHANNELS: <span>{monitoringStatus.metrics.channels}</span>
          </DataMetric>
          <DataMetric>
            <IconComponent icon={FaIcons.FaSearch} />
            SCANS: <span>{monitoringStatus.metrics.scans}</span>
          </DataMetric>
          <DataMetric>
            <IconComponent icon={FaIcons.FaVideo} />
            VIDEOS: <span>{monitoringStatus.metrics.videos}</span>
          </DataMetric>
        </DataMetricsRow>
        <BinaryCodeBackground />
      </TechMonitoringBanner>
      
      <DiscoveredVideoSubtitle>
        Our AI-powered system <span>automatically identifies</span> and engages with fresh content, 
        securing prime positioning in the top {MOCK_DISCOVERED_VIDEOS[1].position_comment}-{MOCK_DISCOVERED_VIDEOS[0].position_comment} comments to maximize visibility and drive targeted engagement.
      </DiscoveredVideoSubtitle>
      
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
            {videosToDisplay.map(video => (
              <VideoCardWrapper key={video.id}>
                <VideoCard onClick={() => openVideoDetails(video)}>
            <VideoHeader>
              <VideoThumbnail image={video.thumbnailUrl} />
              <VideoOverlay />
              <StatusBadge>
                <IconComponent icon={HiIcons.HiOutlineLightBulb} />
                Discovered and Engaged
              </StatusBadge>
              <TimeBadge>
                <IconComponent icon={FaIcons.FaClock} />
                {formatTimeAgo(video.discovered_at)}
              </TimeBadge>
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
                  <MetricLabel>Comment Pos</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{(video.relevance_score * 10).toFixed(1)}</MetricValue>
                  <MetricLabel>Relevance</MetricLabel>
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
      
      {/* Pagination Controls */}
      {totalCount > 0 && (
        <PaginationContainer>
          <PaginationInfo>
            Showing <span>{Math.min((currentPage - 1) * 10 + 1, totalCount)}</span> to{' '}
            <span>{Math.min(currentPage * 10, totalCount)}</span> of <span>{totalCount}</span> discovered videos
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
              <VideoDetailThumbnail image={selectedVideo.thumbnailUrl} />
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
                      <IconComponent icon={FaIcons.FaSearchPlus} />
                      {formatTimeAgo(selectedVideo.discovered_at)}
                    </TimeValue>
                  </TimeInfo>
                  
                  <TimeInfo>
                    <TimeLabel>Engaged</TimeLabel>
                    <TimeValue>
                      <IconComponent icon={FaIcons.FaReply} />
                      {formatTimeAgo(selectedVideo.engaged_at)}
                    </TimeValue>
                  </TimeInfo>
                </TimeInfoWrapper>
              </DetailRow>
              
              <DetailMetricsGrid>
                <DetailMetricCard>
                  <DetailMetricValue>{selectedVideo.views}</DetailMetricValue>
                  <DetailMetricLabel>Current Views</DetailMetricLabel>
                </DetailMetricCard>
                
                <DetailMetricCard>
                  <DetailMetricValue>{selectedVideo.projected_views.toLocaleString()}</DetailMetricValue>
                  <DetailMetricLabel>Projected Views</DetailMetricLabel>
                </DetailMetricCard>
                
                <DetailMetricCard>
                  <DetailMetricValue>{(selectedVideo.relevance_score * 10).toFixed(1)}</DetailMetricValue>
                  <DetailMetricLabel>Relevance Score</DetailMetricLabel>
                </DetailMetricCard>
              </DetailMetricsGrid>
              
              <DetailEngagementSection>
                <DetailEngagementTitle>
                  <IconComponent icon={FaIcons.FaCommentDots} />
                  Auto-Generated Comment
                </DetailEngagementTitle>
                
                <DetailEngagementContent>
                  {highlightProductMention(selectedVideo.engagement_message)}
                </DetailEngagementContent>
              </DetailEngagementSection>
              
              <DetailStatsFooter>
                <DetailCommentPosition>
                  <IconComponent icon={FaIcons.FaSort} />
                  Comment Position: #{selectedVideo.position_comment} out of {selectedVideo.total_comments}
                </DetailCommentPosition>
                
                <DetailProjectedViews>
                  <IconComponent icon={FaIcons.FaChartLine} />
                  Engagement Ratio: {((selectedVideo.position_comment / selectedVideo.total_comments) * 100).toFixed(1)}%
                </DetailProjectedViews>
              </DetailStatsFooter>
            </VideoDetailContent>
          </VideoDetailContainer>
        </Modal>
      )}
    </DiscoveredVideosContainer>
  );
};

export default RecentDiscoveredVideos;