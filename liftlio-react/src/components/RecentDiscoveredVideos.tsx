import React, { useState } from 'react';
import styled from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import * as FaIcons from 'react-icons/fa';
import * as HiIcons from 'react-icons/hi';
import { IconComponent } from '../utils/IconHelper';
import Modal from './Modal';

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
  margin-bottom: 30px;
  position: relative;
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  background: rgba(255, 255, 255, 0.8);
  padding: 20px;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.8);
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid ${props => withOpacity(props.theme.colors.primary, 0.3)};
    animation: scanArea 4s linear infinite;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -10px;
    right: 30px;
    width: 20px;
    height: 20px;
    background: ${props => withOpacity(props.theme.colors.primary, 0.1)};
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
    z-index: -1;
  }
  
  @keyframes scanArea {
    0% { transform: scale(1) rotate(0deg); }
    100% { transform: scale(1) rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.5); opacity: 0.2; }
  }
`;

const DiscoveredVideosHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    width: 180px;
    height: 1px;
    background: linear-gradient(90deg, 
      ${props => withOpacity(props.theme.colors.primary, 0.7)}, 
      transparent
    );
  }
`;

const DiscoveredVideosTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  margin-right: 16px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 30px;
    width: 85%;
    height: 2px;
    background: linear-gradient(
      to right, 
      ${props => props.theme.colors.primary}, 
      ${props => props.theme.colors.secondary},
      transparent
    );
  }
  
  svg {
    margin-right: 10px;
    color: ${props => props.theme.colors.primary};
    animation: scan 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    font-size: 20px;
    position: relative;
  }
  
  @keyframes scan {
    0% { 
      transform: scale(1) rotate(0deg); 
      filter: drop-shadow(0 0 0px ${props => props.theme.colors.primary});
    }
    50% { 
      transform: scale(1.1) rotate(5deg); 
      filter: drop-shadow(0 0 5px ${props => props.theme.colors.primary});
    }
    100% { 
      transform: scale(1) rotate(0deg); 
      filter: drop-shadow(0 0 0px ${props => props.theme.colors.primary});
    }
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
  background: ${props => withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.md};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: linear-gradient(to bottom, ${props => props.theme.colors.primary}, ${props => props.theme.colors.secondary});
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100%;
    background: linear-gradient(to left, 
      ${props => withOpacity(props.theme.colors.background, 0.03)}, 
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
    background: linear-gradient(to right, ${props => props.theme.colors.primary}, ${props => props.theme.colors.secondary});
    color: white;
    font-weight: ${props => props.theme.fontWeights.bold};
    padding: 2px 8px;
    border-radius: 4px;
    margin: 0 4px;
    box-shadow: 0 2px 6px ${props => withOpacity(props.theme.colors.primary, 0.3)};
    
    svg {
      margin-right: 4px;
      font-size: 12px;
    }
  }
`;

const RadarScan = styled.div`
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${props => props.theme.colors.primary};
  top: 50%;
  left: 10px;
  transform: translate(-50%, -50%);
  
  &::before, &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid ${props => props.theme.colors.primary};
    transform: translate(-50%, -50%);
    animation: radar 2s cubic-bezier(0, 0.6, 0.8, 1) infinite;
    opacity: 0;
  }
  
  &::after {
    animation-delay: 0.5s;
  }
  
  @keyframes radar {
    0% {
      width: 100%;
      height: 100%;
      opacity: 0.8;
    }
    100% {
      width: 300%;
      height: 300%;
      opacity: 0;
    }
  }
`;

const RecentBadge = styled.div`
  background: linear-gradient(90deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.secondary});
  color: white;
  font-size: 10px;
  font-weight: ${props => props.theme.fontWeights.bold};
  padding: 3px 8px 3px 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  margin-left: 12px;
  box-shadow: 0 2px 10px ${props => withOpacity(props.theme.colors.primary, 0.2)};
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.1), 
      rgba(255, 255, 255, 0.2), 
      rgba(255, 255, 255, 0.1)
    );
    transform: translateX(-100%);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
  
  svg {
    margin-right: 4px;
    font-size: 7px;
    animation: blink 1.2s ease-in-out infinite;
  }
  
  @keyframes blink {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`;

const DiscoveredVideosList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 24px;
  overflow-x: auto;
  padding: 12px 0 4px 0;
  
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
  
  /* Add subtle shadow at the edges to indicate scrollable content */
  mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
`;

const DiscoveredVideoCard = styled.div`
  background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,245,255,0.85));
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.radius.xl};
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.4);
  flex: 0 0 320px;
  max-width: 320px;
  
  /* Enhanced tech grid pattern */
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 10px 10px, ${props => withOpacity(props.theme.colors.primary, 0.05)} 2px, transparent 2px),
      linear-gradient(${props => withOpacity(props.theme.colors.primary, 0.03)} 1px, transparent 1px),
      linear-gradient(90deg, ${props => withOpacity(props.theme.colors.primary, 0.03)} 1px, transparent 1px);
    background-size: 30px 30px, 15px 15px, 15px 15px;
    pointer-events: none;
    opacity: 0.5;
    z-index: 0;
  }
  
  /* Enhanced glow effect */
  &:after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    z-index: -1;
    background: linear-gradient(45deg, 
      ${props => withOpacity(props.theme.colors.primary, 0)}, 
      ${props => withOpacity(props.theme.colors.primary, 0.25)}, 
      ${props => withOpacity(props.theme.colors.primary, 0)});
    border-radius: ${props => props.theme.radius.xl};
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 30px ${props => withOpacity(props.theme.colors.primary, 0.18)};
    
    &:after {
      opacity: 1;
    }
  }
`;

const VideoHeader = styled.div`
  position: relative;
  height: 160px;
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
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  z-index: 2;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  svg {
    margin-right: 4px;
    color: #00E5FF;
    font-size: 11px;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 0.8; }
    50% { opacity: 1; }
    100% { opacity: 0.8; }
  }
`;

const TimeSince = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  svg {
    margin-right: 4px;
    color: #4CAF50;
    font-size: 9px;
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
  padding: 14px;
  position: relative;
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.2)};
`;

const ChannelImage = styled.div<{ image: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  margin-right: 10px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 6px rgba(89, 81, 249, 0.15);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 10px;
    background: linear-gradient(45deg, #5951F9, #4590FF);
    z-index: -1;
  }
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
  margin-bottom: 14px;
`;

const MetricItem = styled.div`
  text-align: center;
  position: relative;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: ${props => props.theme.radius.md};
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(89, 81, 249, 0.1);
    border-color: rgba(89, 81, 249, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, 
      ${props => props.theme.colors.primary}70, transparent);
  }
`;

const MetricValue = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 2px;
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
`;

const MetricLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
`;

const EngagementSection = styled.div`
  background: linear-gradient(135deg, 
    rgba(245, 247, 250, 0.7), 
    rgba(240, 245, 255, 0.7));
  border-radius: ${props => props.theme.radius.lg};
  padding: 12px;
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.03);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, 
      #5951F9,
      #4590FF
    );
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    right: 0;
    width: 40%;
    height: 1px;
    background: linear-gradient(90deg,
      transparent,
      rgba(89, 81, 249, 0.3)
    );
  }
`;

const EngagementHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  justify-content: space-between;
`;

const EngagementTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  
  svg {
    margin-right: 6px;
    color: #5951F9;
    font-size: 14px;
  }
`;

const EngagementLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  background: linear-gradient(90deg, #22c55e20, #22c55e10);
  color: #22c55e;
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  box-shadow: 0 1px 2px rgba(34, 197, 94, 0.1);
  
  svg {
    margin-right: 4px;
    font-size: 9px;
  }
`;

const EngagementMessage = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.4;
  position: relative;
  padding: 10px 12px;
  background: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  border: 1px solid ${props => withOpacity(props.theme.colors.tertiary, 0.1)};
  height: 65px;
  max-height: 65px;
  overflow-y: auto;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.03);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => withOpacity(props.theme.colors.primary, 0.2)};
    border-radius: 10px;
  }
  
  /* Modern quote styling */
  &::before {
    content: '"';
    position: absolute;
    top: 6px;
    left: 10px;
    font-size: 28px;
    line-height: 1;
    color: ${props => withOpacity(props.theme.colors.primary, 0.15)};
    font-family: Georgia, serif;
    pointer-events: none;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60%;
    height: 1px;
    background: linear-gradient(90deg, 
      rgba(89, 81, 249, 0.1), 
      transparent
    );
    pointer-events: none;
  }
  
  padding-left: 22px;
  margin-bottom: 6px;
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
  margin-top: 6px;
  justify-content: space-between;
`;

const CommentPosition = styled.div`
  background: linear-gradient(90deg, 
    rgba(89, 81, 249, 0.08),
    rgba(69, 144, 255, 0.05)
  );
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  color: #5951F9;
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: 10px;
  letter-spacing: 0.3px;
  
  svg {
    margin-right: 4px;
    font-size: 9px;
  }
`;

const ProjectedViews = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 10px;
  padding: 3px 0;
  
  svg {
    margin-right: 3px;
    color: ${props => props.theme.colors.warning};
    font-size: 9px;
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

// Styled components for the modal content
const VideoDetailContainer = styled.div`
  background: ${props => withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
`;

const VideoDetailHeader = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
  border-radius: ${props => props.theme.radius.lg} ${props => props.theme.radius.lg} 0 0;
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
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const VideoDetailMetaInfo = styled.div`
  display: flex;
  gap: 24px;
  padding: 24px;
  background: ${props => props.theme.colors.white};
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
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
  box-shadow: 0 2px 8px ${props => withOpacity(props.theme.colors.primary, 0.2)};
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
`;

const VideoTimeInfo = styled.div`
  display: flex;
  gap: 24px;
`;

const VideoTimeItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const VideoTimeLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const VideoTimeValue = styled.div`
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
  padding: 24px;
  background: ${props => props.theme.colors.white};
`;

const DetailMetricCard = styled.div`
  background: ${props => withOpacity(props.theme.colors.background, 0.03)};
  border-radius: ${props => props.theme.radius.lg};
  padding: 20px 16px;
  text-align: center;
  border: 1px solid ${props => withOpacity(props.theme.colors.lightGrey, 0.5)};
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
  padding: 24px;
  background: ${props => props.theme.colors.white};
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
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  color: ${props => props.theme.colors.text.primary};
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid ${props => withOpacity(props.theme.colors.lightGrey, 0.5)};
  
  &::before {
    content: '"';
    position: absolute;
    top: 12px;
    left: 16px;
    font-size: 60px;
    line-height: 1;
    color: ${props => withOpacity(props.theme.colors.primary, 0.1)};
    font-family: Georgia, serif;
  }
  
  padding-left: 40px;
`;

const DetailStatsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: ${props => props.theme.colors.white};
  border-top: 1px solid ${props => props.theme.colors.lightGrey};
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

// The main component
const RecentDiscoveredVideos: React.FC<RecentDiscoveredVideosProps> = ({ data }) => {
  // Use provided data or fallback to mock data
  const videosToDisplay = data || MOCK_DISCOVERED_VIDEOS;
  
  // State for modal
  const [selectedVideo, setSelectedVideo] = useState<DiscoveredVideo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
        
        <RecentBadge>
          <RadarScan />
          <IconComponent icon={FaIcons.FaCircle} />
          LIVE TRACKING
        </RecentBadge>
      </DiscoveredVideosHeader>
      
      <DiscoveredVideoSubtitle>
        Our AI-powered system <span>automatically identifies</span> and engages with fresh content, 
        securing prime positioning in the top {MOCK_DISCOVERED_VIDEOS[1].position_comment}-{MOCK_DISCOVERED_VIDEOS[0].position_comment} comments to maximize visibility and drive targeted engagement.
      </DiscoveredVideoSubtitle>
      
      <DiscoveredVideosList>
        {videosToDisplay.map(video => (
          <DiscoveredVideoCard 
            key={video.id} 
            onClick={() => openVideoDetails(video)}
            style={{ cursor: 'pointer' }}
          >
            <VideoHeader>
              <VideoThumbnail image={video.thumbnailUrl} />
              <VideoOverlay />
              <DiscoveryInfo>
                <IconComponent icon={HiIcons.HiOutlineLightBulb} />
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
            
            <VideoDetailMetaInfo>
              <ChannelDetailInfo>
                <ChannelDetailImage image={selectedVideo.channel_image} />
                <ChannelDetailText>
                  <ChannelDetailName>{selectedVideo.channel_name}</ChannelDetailName>
                  <ChannelDetailCategory>{selectedVideo.content_category}</ChannelDetailCategory>
                </ChannelDetailText>
              </ChannelDetailInfo>
              
              <VideoTimeInfo>
                <VideoTimeItem>
                  <VideoTimeLabel>Discovered</VideoTimeLabel>
                  <VideoTimeValue>
                    <IconComponent icon={FaIcons.FaSearchPlus} />
                    {formatTimeAgo(selectedVideo.discovered_at)}
                  </VideoTimeValue>
                </VideoTimeItem>
                
                <VideoTimeItem>
                  <VideoTimeLabel>Engaged</VideoTimeLabel>
                  <VideoTimeValue>
                    <IconComponent icon={FaIcons.FaReply} />
                    {formatTimeAgo(selectedVideo.engaged_at)}
                  </VideoTimeValue>
                </VideoTimeItem>
              </VideoTimeInfo>
            </VideoDetailMetaInfo>
            
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
          </VideoDetailContainer>
        </Modal>
      )}
    </DiscoveredVideosContainer>
  );
};

export default RecentDiscoveredVideos;