import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS, withOpacity } from '../styles/colors';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useMentionsData, TimeframeType, TabType, MentionData } from '../hooks/useMentionsData';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { HiPencil } from 'react-icons/hi';
import { useDashboardTheme } from '../styles/dashboardTheme';
import { formatDateLocale } from '../utils/dateUtils';
// Recharts imports removidos pois os gráficos foram removidos

// Função utilitária para formatar datas (usando parseUTCTimestamp para timezone correto)
const formatDate = (dateString: string | null, _isComment: boolean = false) => {
  if (!dateString) return '';
  return formatDateLocale(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }, 'pt-BR');
};

// Função utilitária para decodificar HTML entities (&#39; → ', &quot; → ", etc)
// E converter tags HTML (<br> → quebra de linha)
const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';

  try {
    // Criar elemento temporário para decodificar HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    let decodedText = textarea.value;

    // Substituir tags HTML por equivalentes de texto
    decodedText = decodedText.replace(/<br\s*\/?>/gi, '\n'); // <br> ou <br/> → quebra de linha

    return decodedText;
  } catch (error) {
    console.error('Error decoding HTML entities:', error);
    return text; // Em caso de erro, retorna o texto original
  }
};

// Animation keyframes
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Rotation animation for loading icon
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Spinner component with animation
const SpinnerIcon = styled.div`
  display: inline-block;
  animation: ${spin} 1s linear infinite;
`;

// Toast notification animation
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Page title with improved styling
const PageContainer = styled.div<{ isBlurred?: boolean }>`
  padding: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.contentPadding;
  }};
  animation: ${fadeIn} 0.6s ease-out forwards;
  /* background removido para herdar do App.tsx */
  transition: filter 0.3s ease;
  filter: ${props => props.isBlurred ? 'blur(5px)' : 'none'};
  
  @media (max-width: 768px) {
    padding: 20px;
  }
  
  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  position: relative;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.text.secondary};
    animation: ${pulse} 3s infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 60px;
    height: 3px;
    background: ${props => props.theme.colors.text.secondary};
    border-radius: 3px;
  }
  
  @media (max-width: 768px) {
    font-size: ${props => props.theme.fontSizes.xl};
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    font-size: ${props => props.theme.fontSizes.lg};
    margin-bottom: 16px;
  }
`;

const PageSubtitle = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 16px;
  line-height: 1.6;
  max-width: 700px;

  strong {
    color: #8B5CF6;
    font-weight: ${props => props.theme.fontWeights.semibold};
  }
`;

const ExplanationBox = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-left: 3px solid #8B5CF6;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 24px;
  max-width: 800px;
`;

const ExplanationHeader = styled.div<{ $isExpanded?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  .chevron-icon {
    color: #8B5CF6;
    font-size: 20px;
    transition: transform 0.2s ease;
    transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const ExplanationTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.fontWeights.medium};
  flex: 1;

  svg {
    color: #8B5CF6;
    font-size: 18px;
  }
`;

const ExplanationContent = styled(motion.div)`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.7;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.colors.borderLight};
`;

// Improved tab design
const TabContainer = styled.div`
  display: flex;
  margin-bottom: 30px;
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.tabs.containerBg;
  }};
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.pill;
  }};
  padding: 5px;
  width: fit-content;
  box-shadow: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.tabs.containerShadow;
  }};
  position: relative;
  animation: ${fadeIn} 0.8s ease-out forwards;
  white-space: nowrap;
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.tabs.containerBorder;
  }};
  
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    right: -5px;
    bottom: -5px;
    left: -5px;
    background: ${props => props.theme.name === 'dark' 
      ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))'
      : 'linear-gradient(90deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.02))'};
    border-radius: ${props => props.theme.radius.pill};
    z-index: -1;
    animation: ${shimmer} 3s infinite linear;
    background-size: 200% 100%;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 24px;
    width: 100%;
    max-width: 100%;
    justify-content: space-between;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 20px;
    padding: 4px;
  }
`;

const tabHoverEffect = css`
  &::after {
    transform: scaleX(1);
  }
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 10px 20px;
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return props.active ? dt.tabs.activeBg : dt.tabs.inactiveBg;
  }};
  border: none;
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.pill;
  }};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.normal};
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return props.active ? dt.tabs.activeText : dt.tabs.inactiveText;
  }};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: ${props => props.active ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none'};
  position: relative;
  overflow: hidden;
  z-index: 1;
  white-space: nowrap;
  flex: 1;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: ${props => props.active ? props.theme.colors.text.primary : 'transparent'};
    transition: background 0.3s ease;
    opacity: ${props => props.active ? 0.8 : 0};
  }
  
  ${props => props.active && tabHoverEffect}
  
  &:hover {
    background: ${props => {
      const dt = useDashboardTheme(props.theme.name);
      return props.active ? dt.tabs.activeBg : dt.tabs.hoverBg;
    }};
    color: ${props => props.theme.colors.text.primary};
    
    &::after {
      background: ${props => props.theme.colors.text.secondary};
      opacity: ${props => props.active ? 0.8 : 0.4};
    }
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: ${props => props.theme.fontSizes.sm};
  }
  
  @media (max-width: 480px) {
    padding: 6px 12px;
    font-size: ${props => props.theme.fontSizes.xs};
  }
`;

// Mentions container with modern design
const MentionsContainer = styled(Card)`
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.large;
  }};
  overflow: hidden;
  animation: ${fadeIn} 1s ease-out forwards;
  box-shadow: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.shadows.large;
  }};
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.borders.default;
  }};
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.containerBg;
  }};
  
  &:hover {
    box-shadow: ${props => {
      const dt = useDashboardTheme(props.theme.name);
      return dt.shadows.large;
    }};
    transition: box-shadow 0.3s ease;
  }
`;

const MentionsTable = styled.div`
  width: 100%;
  border-spacing: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const tableAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2.5fr 1fr 2.5fr 3fr 1fr;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.table.headerBorder;
  }};
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.table.headerText;
  }};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.table.headerBg;
  }};
  position: sticky;
  top: 0;
  z-index: 10;
  min-width: 1000px;
  
  div {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: 12px;
  }
`;

const TableRow = styled.div<{ index?: number, isFavorite?: boolean }>`
  display: grid;
  grid-template-columns: 2.5fr 1fr 2.5fr 3fr 1fr;
  padding: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.table.cellPadding;
  }};
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.table.rowBg;
  }};
  border-bottom: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.table.rowBorder;
  }};
  align-items: stretch;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  animation: ${tableAppear} 0.5s ease-out forwards;
  animation-delay: ${props => (props.index || 0) * 0.1}s;
  opacity: 0;
  min-width: 1000px;
  cursor: pointer;
  
  /* Destacar itens favoritos sem borda vermelha */
  border-left: 4px solid transparent;
  
  &:hover {
    background-color: ${props => {
      const dt = useDashboardTheme(props.theme.name);
      return dt.table.rowHoverBg;
    }};
    transform: translateY(-2px);
    box-shadow: ${props => {
      const dt = useDashboardTheme(props.theme.name);
      return dt.shadows.medium;
    }};
    z-index: 1;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 0;
    background: ${props => props.theme.colors.gradient.primary};
    opacity: 0.2;
    transition: width 0.3s ease;
  }
  
  &:hover::after {
    width: 4px;
  }
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const TableCell = styled.div`
  display: flex;
  align-items: flex-start;
`;

// Enhanced video section
const VideoCell = styled(TableCell)`
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

// Video thumbnail animations
const playButtonPulse = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.9;
  }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(128, 128, 128, 0.3);
  }
  50% {
    box-shadow: 0 0 15px rgba(128, 128, 128, 0.5), 0 0 30px rgba(128, 128, 128, 0.2);
  }
  100% {
    box-shadow: 0 0 5px rgba(128, 128, 128, 0.3);
  }
`;

const VideoThumbnailWrapper = styled.div`
  position: relative;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
  transform: perspective(800px) rotateY(0deg);
  transition: transform 0.5s ease;
  
  &:hover {
    transform: perspective(800px) rotateY(5deg);
  }
`;

const VideoThumbnail = styled.div`
  width: 210px;
  height: 120px;
  background-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  border-radius: ${props => props.theme.radius.md};
  overflow: hidden;
  position: relative;
  box-shadow: ${props => props.theme.shadows.md};
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  @media (max-width: 768px) {
    width: 180px;
    height: 100px;
  }
  
  @media (max-width: 480px) {
    width: 160px;
    height: 90px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      120deg,
      transparent 40%,
      ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} 50%,
      transparent 60%
    );
    z-index: 2;
    transform: translateX(-100%);
    transition: transform 0.8s ease;
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.lg};
    animation: ${glow} 2s infinite;
    
    &::before {
      transform: translateX(100%);
    }
    
    img {
      transform: scale(1.1);
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    border-top: 15px solid transparent;
    border-left: 30px solid ${props => props.theme.colors.secondary};
    border-bottom: 15px solid transparent;
    opacity: 0.9;
    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.6));
    transition: all 0.3s ease;
    z-index: 3;
  }
  
  &:hover::after {
    animation: ${playButtonPulse} 2s infinite;
  }
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: 210px;
  
  @media (max-width: 768px) {
    width: 180px;
  }
  
  @media (max-width: 480px) {
    width: 160px;
  }
`;

const VideoTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 8px;
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.text.primary;
  }};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  line-height: 1.4;
  
  // Add ellipsis for long titles
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: ${props => props.theme.fontSizes.sm};
    margin-bottom: 6px;
  }
  
  @media (max-width: 480px) {
    font-size: ${props => props.theme.fontSizes.xs};
    margin-bottom: 4px;
  }
`;

const VideoStats = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.text.secondary;
  }};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-top: 4px;
  
  svg {
    margin-right: 4px;
  }
`;

const VideoAction = styled.div`
  margin-top: 8px;
`;

const ViewDetailsButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.sm};
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.medium};
  
  &:hover {
    text-decoration: underline;
    color: ${props => props.theme.colors.text.primary};
  }
  
  svg {
    margin-left: 4px;
    font-size: 12px;
  }
`;

// Improved LED Score visualization
const TypeCell = styled(TableCell)`
  justify-content: center;
  align-items: center;
`;

const LedScoreWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const LedScoreLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 8px;
  font-weight: ${props => props.theme.fontWeights.medium};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background: ${props => props.theme.colors.text.secondary};
    transition: width 0.3s ease;
  }
  
  ${LedScoreWrapper}:hover &::after {
    width: 80%;
  }
`;

// LED Score animations
const scoreGlow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(0, 199, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(0, 199, 129, 0.5);
  }
  100% {
    box-shadow: 0 0 5px rgba(0, 199, 129, 0.3);
  }
`;

const scorePulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

// Animação mais sutil para o medidor de score
const subtleFill = keyframes`
  from { width: 0; }
  to { width: var(--fill-width); }
`;

// Componente clean para o score (minimalista)
const ScoreCardContainer = styled.div`
  width: 120px;
  background: transparent;
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.small;
  }};
  padding: 12px;
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.borders.light;
  }};
  transition: all 0.2s ease;
`;

const ScoreLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TypeBadge = styled.span<{ type: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.small;
  }};
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (props.type === 'BRAND') return dt.badges.brand.bg;
    if (props.type === 'MENTION') return dt.badges.brand.bg;
    if (props.type === 'QUALITY') return dt.badges.quality.bg;
    return dt.borders.light;
  }};
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (props.type === 'BRAND') return dt.badges.brand.text;
    if (props.type === 'MENTION') return dt.badges.brand.text;
    if (props.type === 'QUALITY') return dt.badges.quality.text;
    return dt.text.secondary;
  }};
  font-weight: 600;
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (props.type === 'BRAND') return dt.badges.brand.border;
    if (props.type === 'MENTION') return dt.badges.brand.border;
    if (props.type === 'QUALITY') return dt.badges.quality.border;
    return 'transparent';
  }};
`;

const ScoreValueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const ScoreValue = styled.div<{ score: number }>`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
`;

const ScoreQualityBadge = styled.div<{ score: number }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: ${props => props.theme.radius.sm};
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.05)'};
  color: ${props => props.theme.colors.text.secondary};
`;

const ScoreMeterContainer = styled.div`
  width: 100%;
  height: 4px;
  background: ${props => props.theme.colors.dominant_light};
  border-radius: ${props => props.theme.radius.sm};
  overflow: hidden;
  margin-top: 4px;
`;

const ScoreMeterFill = styled.div<{ score: number }>`
  height: 100%;
  width: var(--fill-width);
  background: #8b5cf6;
  border-radius: 2px;
  animation: ${subtleFill} 0.6s ease-out;
`;

// Enhanced comment section
const CommentCell = styled(TableCell)`
  flex-direction: column;
  position: relative;
  padding-right: 16px;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

const CommentInfo = styled.div`
  display: flex;
  flex-direction: column;
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.comment.bg;
  }};
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.medium;
  }};
  padding: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.comment.padding;
  }};
  width: 90%;
  position: relative;
  box-shadow: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.comment.shadow;
  }};
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.comment.border;
  }};
  border-left: 4px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.comment.borderLeft;
  }};
  
  &::after {
    content: '';
    position: absolute;
    left: 20px;
    bottom: -10px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid ${props => {
      const dt = useDashboardTheme(props.theme.name);
      return dt.cards.comment.bg;
    }};
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const CommentAuthorSection = styled.div``;

const CommentAuthor = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.text.primary;
  }};
  margin-bottom: 4px;
  display: flex;
  align-items: center;

  svg {
    margin-right: 6px;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const CommentDate = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textLight};
  margin-left: 12px;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const CommentEngagement = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const EngagementBadge = styled.div`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.05)'};
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.xs};
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.pill};
  display: flex;
  align-items: center;

  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const CommentText = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.5;
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.text.primary;
  }};
  margin-bottom: 8px;
  position: relative;
  height: 65px; /* Altura fixa para manter consistência */
  overflow: hidden;
  white-space: pre-wrap; /* Preservar quebras de linha convertidas de <br> */
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* Limitar a 3 linhas */
  -webkit-box-orient: vertical;
  
  &::before {
    content: '\\201C';
    font-size: 1.5rem;
    color: ${props => props.theme.colors.text.secondary};
    opacity: 0.3;
    position: absolute;
    left: -10px;
    top: -5px;
  }

  &::after {
    content: '\\201D';
    font-size: 1.5rem;
    color: ${props => props.theme.colors.text.secondary};
    opacity: 0.3;
    position: absolute;
    right: -10px;
    bottom: -20px;
  }
`;

// Enhanced response section
const ResponseCell = styled(TableCell)`
  flex-direction: column;
  position: relative;
  padding-right: 15px;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

const ResponseInfo = styled.div<{ status?: string }>`
  display: flex;
  flex-direction: column;
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.response.bg;
  }};
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.medium;
  }};
  padding: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.response.padding;
  }};
  width: 90%;
  position: relative;
  box-shadow: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.response.shadow;
  }};
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.cards.response.border;
  }};
  border-left: 4px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (!props.status || props.status === 'scheduled') {
      return dt.cards.response.borderLeftScheduled;
    }
    if (props.status === 'posted' || props.status === 'published') {
      return dt.cards.response.borderLeftPublished;
    }
    return dt.cards.response.borderLeftDefault;
  }};
`;

const ResponseStatusBadge = styled.div<{ status?: string }>`
  position: absolute;
  top: -10px;
  right: 15px;
  padding: 4px 12px;
  border-radius: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.layout.borderRadius.small;
  }};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (!props.status || props.status === 'scheduled') {
      return dt.badges.scheduled.text;
    }
    if (props.status === 'posted' || props.status === 'published') {
      return dt.badges.published.text;
    }
    return dt.accent.primary;
  }};
  background: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (!props.status || props.status === 'scheduled') {
      return dt.badges.scheduled.bg;
    }
    if (props.status === 'posted' || props.status === 'published') {
      return dt.badges.published.bg;
    }
    return dt.borders.light;
  }};
  border: 1px solid ${props => {
    const dt = useDashboardTheme(props.theme.name);
    if (!props.status || props.status === 'scheduled') {
      return dt.badges.scheduled.border;
    }
    if (props.status === 'posted' || props.status === 'published') {
      return dt.badges.published.border;
    }
    return dt.borders.default;
  }};
  box-shadow: none;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const ResponseText = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.5;
  color: ${props => {
    const dt = useDashboardTheme(props.theme.name);
    return dt.text.primary;
  }};
  margin-bottom: 12px;
  height: 65px; /* Altura fixa para manter consistência */
  
  // Add ellipsis for long text
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Components for the detail popup
const DetailPopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndices.modal || 1000};
  animation: ${fadeIn} 0.3s ease-out;
`;

const DetailPopupContent = styled.div`
  background: ${props => props.theme.components.card.bg};
  border-radius: ${props => props.theme.radius.lg};
  padding: 30px;
  width: 80%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.xl};
  position: relative;
  border: 1px solid ${props => props.theme.colors.border.primary};
  
  @keyframes modalZoom {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  animation: modalZoom 0.3s ease-out;
  
  /* Estilização da barra de rolagem para mantê-la discreta */
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.colors.text.secondary} transparent;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.text.secondary};
    border-radius: 20px;
    border: 2px solid transparent;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background-color: ${props => props.theme.colors.text.primary};
  }
`;

const DetailPopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
`;

const DetailPopupTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  font-weight: 600;
`;

const DetailPopupCloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 28px;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
  }
`;

const DetailPopupVideoSection = styled.div`
  display: flex;
  margin-bottom: 30px;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const DetailPopupThumbnail = styled.div`
  width: 300px;
  height: 170px;
  border-radius: ${props => props.theme.radius.md};
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.md};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    height: 200px;
  }
`;

const DetailPopupVideoInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const DetailPopupVideoTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  margin-bottom: 10px;
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
`;

const DetailPopupGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DetailPopupSection = styled.div`
  margin-bottom: 20px;
`;

const DetailPopupSectionTitle = styled.h4`
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 10px;
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const DetailPopupComment = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.03)'};
  border-radius: ${props => props.theme.radius.md};
  padding: 20px;
  box-shadow: ${props => props.theme.shadows.sm};
  margin-bottom: 20px;
  border: 1px solid ${props => props.theme.colors.border.primary};
`;

const DetailPopupResponse = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(0, 0, 0, 0.05)'};
  border-radius: ${props => props.theme.radius.md};
  padding: 20px;
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border.primary};
`;

const FavoriteIndicator = styled.div<{ isFavorite: boolean }>`
  position: absolute;
  top: 30px;
  right: 80px;
  color: ${props => props.isFavorite ? props.theme.colors.error : props.theme.colors.darkGrey};
  font-size: 24px;
`;

const ResponseDate = styled.div<{ status?: string }>`
  font-size: 12px;
  color: ${props => props.theme.colors.textLight};
  display: flex;
  align-items: center;
  margin-top: 8px;
  background: ${props => 
    !props.status || props.status === 'scheduled' 
      ? withOpacity(props.theme.colors.warning, 0.1) 
      : withOpacity(props.theme.colors.success, 0.1)};
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.pill};
  font-weight: 500;
  width: fit-content;
  
  svg {
    margin-right: 6px;
    font-size: 10px;
    color: ${props => 
      !props.status || props.status === 'scheduled' 
        ? props.theme.colors.warning
        : props.theme.colors.success};
  }
`;

const SeeMoreLink = styled.a`
  color: #8b5cf6;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  
  &:hover {
    text-decoration: underline;
  }
  
  svg {
    margin-left: 4px;
    font-size: 12px;
  }
`;

// Enhanced action buttons
const ActionsCell = styled(TableCell)`
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 12px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'favorite' }>`
  background: ${props => 
    props.variant === 'primary' ? (props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)') : 
    props.variant === 'favorite' ? withOpacity(props.theme.colors.error, 0.1) : 
    withOpacity(props.theme.colors.text.secondary, 0.1)};
  border: ${props => 
    props.variant === 'primary' ? `1px solid ${props.theme.colors.border.primary}` : 'none'};
  color: ${props => 
    props.variant === 'favorite' ? props.theme.colors.error : 
    props.theme.colors.text.secondary};
  cursor: pointer;
  padding: 8px;
  width: 38px;
  height: 38px;
  border-radius: ${props => props.theme.radius.md};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${props => props.variant === 'primary' ? props.theme.shadows.sm : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
    background: ${props => 
      props.variant === 'favorite' ? withOpacity(props.theme.colors.error, 0.2) : 
      props.variant === 'primary' ? (props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)') : 
      withOpacity(props.theme.colors.text.secondary, 0.2)};
    color: ${props => 
      props.variant === 'favorite' ? props.theme.colors.error : 
      props.theme.colors.text.primary};
  }
  
  svg {
    font-size: 16px;
  }
`;

const ActionButtonsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ActionLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 4px;
  text-align: center;
`;

// Edit Response Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndices.modal || 1000};
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.components.card.bg};
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.xl};
  position: relative;
  animation: ${fadeIn} 0.4s ease-out;
  transform: scale(1);
  
  @keyframes modalZoom {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  animation: modalZoom 0.3s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
`;

const ModalTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.accent.primary};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.colors.text.secondary};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.text.primary};
  }
`;

const ResponseForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  background: ${props => props.theme.colors.bg.secondary};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.text.secondary};
    box-shadow: 0 0 0 2px ${props => withOpacity(props.theme.colors.text.secondary, 0.2)};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  
  background: ${props => props.variant === 'primary' 
    ? props.theme.colors.text.primary 
    : 'transparent'};
  color: ${props => props.variant === 'primary' 
    ? props.theme.colors.bg.primary 
    : props.theme.colors.text.secondary};
  border: ${props => props.variant === 'primary' 
    ? 'none' 
    : `1px solid ${props.theme.colors.border.primary}`};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'primary' 
      ? props.theme.shadows.md 
      : 'none'};
    background: ${props => props.variant === 'primary' 
      ? props.theme.colors.text.secondary 
      : props.theme.colors.bg.tertiary};
  }
`;

const SpecialInstructionsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.theme.colors.text.primary};
  color: ${props => props.theme.colors.bg.primary};
  border: none;
  border-radius: ${props => props.theme.radius.md};
  padding: 10px 16px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.theme.shadows.sm};
  
  &:hover {
    background: ${props => props.theme.colors.text.secondary};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  svg {
    font-size: 16px;
  }
`;

// YouTube API key
const YOUTUBE_API_KEY = 'AIzaSyD9PWLCoomqo4CyvzlqLBiYWyWflQXd8U0';

// Sample data with enhanced structure
const mentionsData = [
  {
    id: 1,
    video: {
      id: 'dQw4w9WgXcQ',
      thumbnail: 'https://via.placeholder.com/210x120',
      title: 'Get Paid $847 Per Day With Google Books Using AI (Passive Income)',
      views: 30602,
      likes: 1788
    },
    type: 'Led Score',
    score: 70,
    comment: {
      author: '@yuliaklymenko4390',
      date: '27/11/2024 21:01',
      text: "Just when I thought I knew everything about AI, Aliest comes in with methods that blew my mind. Seriously, check them out if you haven't yet.",
      likes: 12
    },
    response: {
      text: "Speaking of AI tools, I've been using Humanlike Writer for my affiliate content and it's been a game changer. Their AI actually writes like a real person. You can try it free at humanlikewriter.com",
      date: '28/11/2024 09:25',
      status: 'posted'
    },
    favorite: true
  },
  {
    id: 2,
    video: {
      id: 'xvFZjo5PgG0',
      thumbnail: 'https://via.placeholder.com/210x120',
      title: 'How I Make $21,972/Month With AI Affiliate Marketing (Full Tutorial)',
      views: 73495,
      likes: 3548
    },
    type: 'Led Score',
    score: 90,
    comment: {
      author: '@bcpl2111',
      date: '25/11/2024 17:49',
      text: "Hey Sara! There are two courses you share, which is the best to start with? What are the difference between both? Thank you!",
      likes: 3
    },
    response: {
      text: "While looking for good content tools, I discovered Humanlike Writer which has been amazing for creating genuine-sounding affiliate content. You can try it free at humanlikewriter.com and see the difference yourself!",
      date: '27/11/2024 14:30',
      status: 'scheduled'
    },
    favorite: false
  },
  {
    id: 3,
    video: {
      id: '8ybW48rKBME',
      thumbnail: 'https://via.placeholder.com/210x120',
      title: 'The Ultimate Guide to YouTube SEO in 2025 - Double Your Views',
      views: 45218,
      likes: 2781
    },
    type: 'Engagement',
    score: 85,
    comment: {
      author: '@marketingguru444',
      date: '24/11/2024 08:22',
      text: "This is exactly what I needed! Your tips about keyword research changed my whole strategy. Do you recommend any tools for finding trending topics?",
      likes: 8
    },
    response: {
      text: "Thanks for the kind words! For trending topics, I would recommend combining TubeBuddy with Humanlike Writer content research tool. The AI content assistant from Humanlike has been a lifesaver for creating scripts.",
      date: '24/11/2024 15:40',
      status: 'posted'
    },
    favorite: true
  }
];

// Dados do gráfico serão obtidos de performanceData

// Analytics section styles
const AnalyticsSection = styled.div`
  margin-top: 30px;
  padding: 24px;
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 0.4s;
  opacity: 0;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, 
      ${props => withOpacity(props.theme.colors.tertiary, 0.03)} 0%, 
      ${props => withOpacity(props.theme.colors.secondary, 0)} 50%, 
      ${props => withOpacity(props.theme.colors.primary, 0.03)} 100%);
    z-index: 0;
  }
  
  & > * {
    position: relative;
    z-index: 1;
  }
  
  @media (max-width: 768px) {
    margin-top: 24px;
    padding: 20px;
    border-radius: ${props => props.theme.radius.md};
  }
  
  @media (max-width: 480px) {
    margin-top: 20px;
    padding: 16px;
    border-radius: ${props => props.theme.radius.sm};
  }
`;

// AnalyticsHeader e AnalyticsTitle removidos pois não são mais necessários

// TimeframeSelector e TimeframeButton removidos pois não são mais necessários

const TopStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const BottomStatsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  
  & > div {
    max-width: 300px;
    width: 100%;
  }
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.gradient.glass};
  border-radius: ${props => props.theme.radius.md};
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: ${props => props.theme.shadows.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.color || props.theme.colors.gradient.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: white;
  font-size: 24px;
  box-shadow: ${props => props.theme.shadows.md};
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
`;

const StatTrend = styled.div<{ increasing?: boolean }>`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.increasing ? props.theme.colors.success : props.theme.colors.error};
  margin-top: 8px;
  
  svg {
    margin-right: 4px;
  }
`;

// Componentes de paginação
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  margin-bottom: 24px;
  padding: 8px;
  gap: 12px;
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 0.3s;
  opacity: 0;
`;

// Custom toast notification
const Toast = styled.div<{ visible: boolean, success?: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  background: ${props => props.success ? props.theme.colors.success : props.theme.colors.error};
  color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: 9999;
  display: ${props => props.visible ? 'flex' : 'none'};
  align-items: center;
  gap: 10px;
  animation: ${props => props.visible ? slideIn : slideOut} 0.3s ease forwards;
  
  svg {
    font-size: 18px;
  }
`;

const PageInfo = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 12px;
`;

const PageButton = styled.button<{ active?: boolean; disabled?: boolean }>`
  background: ${props => {
    if (props.active) return '#8b5cf6';
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white';
  }};
  color: ${props => {
    if (props.active) return 'white';
    if (props.disabled) return props.theme.colors.text.secondary;
    return '#8b5cf6';
  }};
  border: 1px solid ${props => {
    if (props.active) return '#8b5cf6';
    return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(139, 92, 246, 0.3)';
  }};
  border-radius: ${props => props.theme.radius.md};
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover {
    background: ${props => {
      if (props.disabled) return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white';
      if (props.active) return '#7c3aed';
      return props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#f0f0f5';
    }};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : props.theme.shadows.sm};
  }
  
  svg {
    font-size: 14px;
  }
`;

const PageNumbers = styled.div`
  display: flex;
  gap: 8px;
`;

// ChartSection component removido

// ChartLabels component removido

// ChartLabel component removido

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mention: MentionData | null;
  onSave: (id: number, newText: string, responseType?: string | null) => void;
}

const EditResponseModal: React.FC<EditModalProps> = ({ isOpen, onClose, mention, onSave }) => {
  const [responseText, setResponseText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'engagement' | 'product' | 'auto' | null>(null);
  const [responseTypeToSave, setResponseTypeToSave] = useState<string | null>(null); // Novo state para guardar o tipo
  const theme = useTheme();

  React.useEffect(() => {
    if (mention) {
      setResponseText(mention.response.text);
      setResponseTypeToSave(null); // Resetar o tipo quando abrir o modal
    }
  }, [mention]);

  if (!isOpen || !mention) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(mention.id, responseText, responseTypeToSave);
    onClose();
  };

  // Função para regenerar resposta
  const handleRegenerate = async (type: 'engagement' | 'product' | 'auto') => {
    if (!mention) return;

    setIsGenerating(true);
    setGenerationType(type);

    try {
      console.log(`Regenerando resposta tipo: ${type} para comentário ID: ${mention.id}`);

      // Chamar a função RPC do Supabase
      const { data, error } = await supabase.rpc('regenerate_single_comment_response', {
        p_comment_cp_id: mention.id,
        p_response_type: type,
        p_custom_instruction: null
      });

      if (error) {
        console.error('Erro ao regenerar resposta:', error);
        alert('Error generating response. Please try again.');
        return;
      }

      if (data && data.response) {
        console.log('Resposta gerada:', data);
        setResponseText(data.response);

        // Guardar o tipo de resposta para usar ao salvar
        if (data.tipo_resposta) {
          setResponseTypeToSave(data.tipo_resposta);
        }

        // Mostrar tipo de resposta gerada
        const typeMessage = data.tipo_resposta === 'produto'
          ? ' (with product mention)'
          : ' (engagement only)';
        console.log(`Generated ${data.tipo_resposta} response${typeMessage}`);
      } else if (data && data.error) {
        console.error('Erro do servidor:', data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao chamar função:', error);
      alert('Unexpected error. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };
  
  return (
    <ModalOverlay>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            <IconComponent icon={FaIcons.FaPencilAlt} />
            Edit Response
          </ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>
        
        <ResponseForm onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Video Title</Label>
            <div>{mention.video.title}</div>
          </FormGroup>
          
          <FormGroup>
            <Label>Comment From</Label>
            <div>{mention.comment.author}</div>
          </FormGroup>
          
          <FormGroup>
            <Label>Comment</Label>
            <div style={{ 
              padding: '10px', 
              background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f9f8fc', 
              borderRadius: '8px',
              color: theme.colors.text.primary
            }}>
              {decodeHtmlEntities(mention.comment.text)}
            </div>
          </FormGroup>
          
          <FormGroup>
            <Label>Your Response</Label>
            <TextArea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Enter your response..."
              disabled={isGenerating}
              style={{
                opacity: isGenerating ? 0.7 : 1,
                cursor: isGenerating ? 'not-allowed' : 'text'
              }}
            />

            {/* Botões de Regeneração */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '12px',
              flexWrap: 'wrap'
            }}>
              <Button
                type="button"
                onClick={() => handleRegenerate('engagement')}
                disabled={isGenerating}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  background: isGenerating && generationType === 'engagement'
                    ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                    : 'transparent',
                  border: theme.name === 'dark'
                    ? '1px solid rgba(139, 92, 246, 0.3)'
                    : '1px solid rgba(139, 92, 246, 0.2)',
                  color: isGenerating && generationType === 'engagement'
                    ? '#fff'
                    : theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  fontSize: '13px',
                  padding: '8px 12px',
                  opacity: isGenerating && generationType !== 'engagement' ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  borderRadius: '6px'
                }}
              >
                {isGenerating && generationType === 'engagement' ? (
                  <>⏳ Generating...</>
                ) : (
                  <>🤝 Generate Engagement</>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => handleRegenerate('product')}
                disabled={isGenerating}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  background: isGenerating && generationType === 'product'
                    ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                    : 'transparent',
                  border: '1px solid #8b5cf6',
                  color: isGenerating && generationType === 'product'
                    ? '#fff'
                    : '#8b5cf6',
                  fontSize: '13px',
                  padding: '8px 12px',
                  opacity: isGenerating && generationType !== 'product' ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  borderRadius: '6px'
                }}
              >
                {isGenerating && generationType === 'product' ? (
                  <>⏳ Generating...</>
                ) : (
                  <>📢 Generate Mention</>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => handleRegenerate('auto')}
                disabled={isGenerating}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  background: isGenerating && generationType === 'auto'
                    ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                    : 'transparent',
                  border: theme.name === 'dark'
                    ? '1px solid rgba(168, 85, 247, 0.3)'
                    : '1px solid rgba(168, 85, 247, 0.2)',
                  color: isGenerating && generationType === 'auto'
                    ? '#fff'
                    : theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  fontSize: '13px',
                  padding: '8px 12px',
                  opacity: isGenerating && generationType !== 'auto' ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  borderRadius: '6px'
                }}
              >
                {isGenerating && generationType === 'auto' ? (
                  <>⏳ Generating...</>
                ) : (
                  <>🎲 Auto Generate</>
                )}
              </Button>
            </div>
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={onClose} disabled={isGenerating}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Save Response'}
            </Button>
          </ButtonGroup>
        </ResponseForm>
      </ModalContent>
    </ModalOverlay>
  );
};

const Mentions: React.FC = () => {
  // Obter o projeto atual do contexto (será usado em vários lugares no componente)
  const { currentProject } = useProject();
  const { t } = useLanguage();
  const theme = useTheme();
  const dashTheme = useDashboardTheme(theme.name);
  
  const [activeTab, setActiveTab] = useState<TabType>('scheduled');
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);

  // Hook para verificar se a aba 'scheduled' está vazia e mudar para 'posted'
  useEffect(() => {
    if (activeTab === 'scheduled') {
      // Buscar dados da aba 'scheduled' para verificar se está vazia
      const checkScheduledTab = async () => {
        if (!currentProject?.id) return;
        
        try {
          const { data, error } = await supabase
            .from('mentions_overview')
            .select('comment_id')
            .eq('scanner_project_id', currentProject.id)
            .eq('status_das_postagens', 'pending')
            .limit(1);
            
          if (error) {
            console.error('Erro ao verificar aba scheduled:', error);
            return;
          }
          
          // Se a aba 'scheduled' estiver vazia, mudar para 'posted'
          if (!data || data.length === 0) {
            console.log('Aba scheduled vazia, mudando para posted');
            setActiveTab('posted');
          }
        } catch (err) {
          console.error('Erro ao verificar aba scheduled:', err);
        }
      };
      
      checkScheduledTab();
    }
  }, [currentProject]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentMention, setCurrentMention] = useState<MentionData | null>(null);
  // Estado timeframe removido, pois o seletor de timeframe foi removido
  const [toast, setToast] = useState({ visible: false, message: '', success: true });
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [instructionsText, setInstructionsText] = useState('');
  
  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);
  
  // Usar o hook para obter dados dinâmicos baseados na aba ativa
  const {
    loading,
    error,
    mentionsData: data,
    toggleFavorite: toggleFavoriteMention,
    refetch, // Adicionar função de refetch
    pagination // Obter informações e funções de paginação
  } = useMentionsData(activeTab);
  
  // Obter estatísticas gerais independentes da aba selecionada,
  // mas filtradas apenas para o projeto atual
  const {
    mentionStats
  } = useMentionsData('all');
  
  // Usamos o currentProject que foi declarado no início do componente
  
  // Função para abrir o modal de instruções especiais
  const handleSpecialInstructionsClick = () => {
    // Buscar as instruções atuais do projeto se existirem
    if (currentProject?.id) {
      fetchProjectInstructions(currentProject.id);
    }
    setInstructionsModalOpen(true);
  };
  
  // Função para buscar as instruções do projeto
  const fetchProjectInstructions = async (projectId: string | number) => {
    try {
      const { data, error } = await supabase
        .from('Projeto')
        .select('prompt_user')
        .eq('id', projectId)
        .single();
        
      if (error) {
        console.error('Erro ao buscar instruções do projeto:', error);
        return;
      }
      
      setInstructionsText(data?.prompt_user || '');
    } catch (err) {
      console.error('Erro ao processar instruções do projeto:', err);
    }
  };
  
  // Função para salvar as instruções do projeto
  const saveProjectInstructions = async () => {
    if (!currentProject?.id) return;
    
    try {
      const { error } = await supabase
        .from('Projeto')
        .update({ prompt_user: instructionsText })
        .eq('id', currentProject.id);
        
      if (error) {
        console.error('Erro ao salvar instruções do projeto:', error);
        setToast({
          visible: true,
          message: 'Erro ao salvar instruções',
          success: false
        });
        return;
      }
      
      setInstructionsModalOpen(false);
      setToast({
        visible: true,
        message: 'Instruções salvas com sucesso',
        success: true
      });
    } catch (err) {
      console.error('Erro ao processar salvamento de instruções:', err);
      setToast({
        visible: true,
        message: 'Erro ao salvar instruções',
        success: false
      });
    }
  };

  // Estado para armazenar dados (removido estado do gráfico)
  
  // Estado para os dados dos cards
  const [cardStats, setCardStats] = useState({
    totalMentions: 5,
    totalMentionsTrend: 5,
    leadMentions: 2,
    leadMentionsTrend: 10,
    highPriority: 3,
    highPriorityTrend: 15,
    avgResponseTime: 6.2,
    avgResponseTimeTrend: -8,
    responseRate: 20,
    responseRateTrend: 8
  });

  // Função para buscar dados para os cards e para o gráfico
  const fetchDashboardData = async () => {
    if (!currentProject?.id) {
      console.log('Não foi possível buscar dados: ID do projeto não disponível');
      return;
    }
    
    const projectId = currentProject.id;
    
    try {
      console.log(`Buscando dados para o dashboard (Projeto ID: ${projectId})`);
      
      // ----- BUSCAR DADOS PARA OS CARDS -----
      
      // 1. Total Mentions
      const { data: totalMentionsData, error: totalMentionsError } = await supabase
        .from('mentions_overview')
        .select('comment_id, comment_published_at')
        .eq('scanner_project_id', projectId);
        
      if (totalMentionsError) {
        console.error('Erro ao buscar total de menções:', totalMentionsError);
      }
      
      // 2. Lead Mentions
      const { data: leadMentionsData, error: leadMentionsError } = await supabase
        .from('mentions_overview')
        .select('comment_id')
        .eq('scanner_project_id', currentProject.id)
        .gt('comment_lead_score', 0);
        
      if (leadMentionsError) {
        console.error('Erro ao buscar menções lead:', leadMentionsError);
      }
      
      // 3. High Priority Mentions (comment_lead_score > 10)
      const { data: highPriorityData, error: highPriorityError } = await supabase
        .from('mentions_overview')
        .select('comment_id')
        .eq('scanner_project_id', currentProject.id)
        .gt('comment_lead_score', 10);
        
      if (highPriorityError) {
        console.error('Erro ao buscar menções de alta prioridade:', highPriorityError);
      }
      
      // 4. Average Response Time
      const { data: responseTimeData, error: responseTimeError } = await supabase
        .from('mentions_overview')
        .select('response_time_hours')
        .eq('scanner_project_id', currentProject.id)
        .not('response_time_hours', 'is', null);
        
      if (responseTimeError) {
        console.error('Erro ao buscar tempo de resposta:', responseTimeError);
      }
      
      // 5. Response Rate
      const { data: responseRateData, error: responseRateError } = await supabase
        .from('mentions_overview')
        .select('comment_id, mention_status')
        .eq('scanner_project_id', currentProject.id);
        
      if (responseRateError) {
        console.error('Erro ao buscar taxa de resposta:', responseRateError);
      }
      
      // Calcular estatísticas
      if (totalMentionsData && leadMentionsData && highPriorityData && responseTimeData && responseRateData) {
        // Total Mentions
        const totalMentions = totalMentionsData.length;
        
        // Total Lead Mentions
        const leadMentions = leadMentionsData.length;
        
        // High Priority Mentions
        const highPriority = highPriorityData.length;
        
        // Average Response Time
        const avgResponseTime = responseTimeData.length > 0 
          ? responseTimeData.reduce((sum: number, item: any) => sum + (item.response_time_hours || 0), 0) / responseTimeData.length
          : 0;
        
        // Response Rate
        const totalResponded = responseRateData.filter((item: any) => item.mention_status === 'posted').length;
        const responseRate = totalMentions > 0 
          ? (totalResponded / totalMentions) * 100
          : 0;
        
        // Atualizar estado dos cards com valores reais
        // Por enquanto, manter as tendências estáticas conforme solicitado
        setCardStats({
          totalMentions: totalMentions || 5,
          totalMentionsTrend: 5,
          leadMentions: leadMentions || 2,
          leadMentionsTrend: 10,
          highPriority: highPriority || 3,
          highPriorityTrend: 15,
          avgResponseTime: parseFloat(avgResponseTime.toFixed(1)) || 6.2,
          avgResponseTimeTrend: -8,
          responseRate: Math.round(responseRate) || 20,
          responseRateTrend: 8
        });
      }
      
      // Código para buscar dados do gráfico de performance removido
      
    } catch (err) {
      console.error('Erro ao processar dados do dashboard:', err);
    }
  };
  
  // Buscar dados para o dashboard quando o componente carregar
  useEffect(() => {
    fetchDashboardData();
  }, [currentProject]);
  
  // Estado local adicional para forçar atualizações
  const [localMentionsData, setLocalMentionsData] = useState<MentionData[]>([]);
  
  // Estado para armazenar quais itens foram marcados como favoritos localmente
  const [favoritosLocais, setFavoritosLocais] = useState<{[key: number]: boolean}>({});
  
  // Sincronizar dados locais com dados do hook e aplicar favoritos locais
  useEffect(() => {
    // Aplicar estado de favoritos locais sobre os dados do servidor
    const dadosComFavoritosLocais = data.map(item => {
      // Se o item tem um estado local de favorito, sobrescrever o valor do servidor
      if (favoritosLocais.hasOwnProperty(item.id)) {
        return { ...item, favorite: favoritosLocais[item.id] };
      }
      // Caso contrário, manter o valor do servidor
      return item;
    });
    
    setLocalMentionsData(dadosComFavoritosLocais);
    
    if (activeTab === 'favorites') {
      console.log("Dados de favoritos no componente:", dadosComFavoritosLocais.length, dadosComFavoritosLocais);
    }
  }, [activeTab, data, favoritosLocais]);
  
  const renderTypeCell = (mention: MentionData) => {
    // Calcular a largura do preenchimento com base na pontuação
    const fillWidth = `${mention.score}%`;
    const category = mention.score >= 70 ? 'Quality' : mention.score >= 40 ? 'Medium' : 'Low';
    
    return (
      <TypeCell>
        <ScoreCardContainer>
          <ScoreLabel>
            Score
            <TypeBadge type={mention.type}>{mention.type}</TypeBadge>
          </ScoreLabel>
          <ScoreValueRow>
            <ScoreValue score={mention.score}>{mention.score}%</ScoreValue>
            <ScoreQualityBadge score={mention.score}>{category}</ScoreQualityBadge>
          </ScoreValueRow>
          <ScoreMeterContainer>
            <ScoreMeterFill 
              score={mention.score} 
              style={{ '--fill-width': fillWidth } as React.CSSProperties} 
            />
          </ScoreMeterContainer>
        </ScoreCardContainer>
      </TypeCell>
    );
  };
  
  const handleEditClick = (mention: MentionData) => {
    setCurrentMention(mention);
    setEditModalOpen(true);
  };
  
  const handleSaveResponse = async (commentId: number, newText: string, responseType?: string | null) => {
    try {
      console.log(`Salvando resposta para comentário ID ${commentId}`);

      // 1. Buscar o msg_id correspondente ao comment_id
      const { data: mentionData, error: fetchError } = await supabase
        .from('mentions_overview')
        .select('msg_id')
        .eq('comment_id', commentId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar msg_id:', fetchError);
        setToast({
          visible: true,
          message: 'Error finding message to update',
          success: false
        });
        return;
      }

      if (!mentionData?.msg_id) {
        console.error('Nenhuma mensagem associada ao comentário');
        setToast({
          visible: true,
          message: 'No message found for this comment',
          success: false
        });
        return;
      }

      console.log(`Atualizando mensagem ID ${mentionData.msg_id} com novo texto`);

      // 2. Preparar os dados para atualizar
      const updateData: any = {
        mensagem: newText
      };

      // Se tem um tipo de resposta para atualizar, inclui no update
      if (responseType !== null && responseType !== undefined) {
        updateData.tipo_resposta = responseType;
        console.log(`Também atualizando tipo_resposta para: ${responseType}`);
      }

      // 3. Atualizar o texto da mensagem (e opcionalmente o tipo) na tabela Mensagens
      const { error: updateError } = await supabase
        .from('Mensagens')
        .update(updateData)
        .eq('id', mentionData.msg_id);

      if (updateError) {
        console.error('Erro ao atualizar mensagem:', updateError);
        setToast({
          visible: true,
          message: 'Error updating response',
          success: false
        });
        return;
      }

      // 3. Sucesso - mostrar feedback e fechar modal
      console.log('Resposta atualizada com sucesso!');
      setToast({
        visible: true,
        message: 'Response updated successfully!',
        success: true
      });

      // Fechar o modal
      setEditModalOpen(false);

      // Atualizar os dados sem recarregar a página
      if (refetch) {
        setTimeout(() => {
          refetch(); // Recarregar os dados
        }, 500); // Pequeno delay para garantir que o banco foi atualizado
      }

    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      setToast({
        visible: true,
        message: 'Unexpected error updating response',
        success: false
      });
    }
  };
  
  // Função para testar diretamente o Supabase
  const testeUpdateDireto = async (mensagemId: number, novoValor: boolean): Promise<boolean> => {
    console.log(`=== TESTE DIRETO DE UPDATE ===`);
    console.log(`Tentando atualizar mensagem ID=${mensagemId} para template=${novoValor}`);
    
    try {
      // 1. Verificar se a mensagem existe
      const { data: mensagem, error: erroConsulta } = await supabase
        .from('Mensagens')
        .select('*')
        .eq('id', mensagemId)
        .single();
        
      if (erroConsulta) {
        console.error(`Erro ao verificar mensagem:`, erroConsulta);
        return false;
      }
      
      console.log(`Mensagem encontrada:`, mensagem);
      
      // 2. Tentar atualizar a mensagem
      const { data: resultadoUpdate, error: erroUpdate } = await supabase
        .from('Mensagens')
        .update({ template: novoValor })
        .eq('id', mensagemId)
        .select();
        
      if (erroUpdate) {
        console.error(`Erro ao atualizar mensagem:`, erroUpdate);
        return false;
      }
      
      console.log(`Update com sucesso:`, resultadoUpdate);
      return true;
    } catch (erro) {
      console.error(`Erro geral no teste:`, erro);
      return false;
    }
  };
  
  // Estado para controlar botões de favorito que estão sendo processados
  const [processandoFavoritos, setProcessandoFavoritos] = useState<number[]>([]);
  
  // Estado para controlar o popup de detalhes
  const [selectedMention, setSelectedMention] = useState<MentionData | null>(null);

  // Estado para armazenar info do Browser Task (se existir)
  const [browserTaskInfo, setBrowserTaskInfo] = useState<{
    exists: boolean;
    status: string;
    created_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
  } | null>(null);

  // Buscar browser task quando abre popup de post já publicado
  useEffect(() => {
    const fetchBrowserTask = async () => {
      if (!selectedMention || activeTab !== 'posted') {
        setBrowserTaskInfo(null);
        return;
      }

      try {
        // Primeiro buscar o msg_id via mentions_overview (selectedMention.id é comment_id)
        const { data: mentionData } = await supabase
          .from('mentions_overview')
          .select('msg_id')
          .eq('comment_id', selectedMention.id)
          .single();

        if (!mentionData?.msg_id) {
          setBrowserTaskInfo(null);
          return;
        }

        // Agora buscar settings_post via msg_id
        const { data: settingsPost } = await supabase
          .from('Settings messages posts')
          .select('id')
          .eq('Mensagens', mentionData.msg_id)
          .single();

        if (!settingsPost) {
          setBrowserTaskInfo(null);
          return;
        }

        // Buscar browser_task por settings_post_id no metadata
        // Usar RPC para buscar com filtro JSONB correto
        const { data: browserTasks } = await supabase
          .from('browser_tasks')
          .select('id, status, created_at, completed_at, metadata')
          .eq('task_type', 'youtube_reply')
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        // Filtrar manualmente pelo settings_post_id no metadata
        const browserTask = browserTasks?.find(
          (task: any) => task.metadata?.settings_post_id === settingsPost.id
        );

        if (browserTask) {
          const created = new Date(browserTask.created_at);
          const completed = browserTask.completed_at ? new Date(browserTask.completed_at) : null;
          const durationSeconds = completed ? Math.round((completed.getTime() - created.getTime()) / 1000) : null;

          setBrowserTaskInfo({
            exists: true,
            status: browserTask.status,
            created_at: browserTask.created_at,
            completed_at: browserTask.completed_at,
            duration_seconds: durationSeconds
          });
        } else {
          setBrowserTaskInfo(null);
        }
      } catch (error) {
        console.log('No browser task found for this mention');
        setBrowserTaskInfo(null);
      }
    };

    fetchBrowserTask();
  }, [selectedMention, activeTab]);

  const handleToggleFavorite = async (id: number, currentStatus: boolean) => {
    console.log(`Clicou para alternar favorito: ID=${id}, Status atual=${currentStatus}`);
    
    // Marcar este favorito específico como em processamento
    setProcessandoFavoritos(prev => [...prev, id]);
    
    // Atualizar o estado local imediatamente para feedback visual instantâneo
    const novoEstado = !currentStatus;
    setFavoritosLocais(prev => ({
      ...prev,
      [id]: novoEstado
    }));
    
    // Chamar a função do hook para atualizar este favorito específico no banco
    // Esta é a única operação de update que faremos
    toggleFavoriteMention(id);
    
    // Show custom toast notification
    if (currentStatus) {
      setToast({
        visible: true,
        message: "Removed from favorites",
        success: true
      });
    } else {
      setToast({
        visible: true,
        message: "Added to favorites",
        success: true
      });
    }
    
    // Log para debug
    console.log(`Toast exibido, alterando de ${currentStatus} para ${!currentStatus}`);
    
    // Timeout de segurança mais curto, já que os dados são em tempo real
    setTimeout(() => {
      setProcessandoFavoritos(prev => prev.filter(itemId => itemId !== id));
    }, 2000);
  };
  
  // Não é mais necessário filtrar os dados aqui, pois o hook já retorna os dados filtrados por tab
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      {/* Custom Toast Notification */}
      <Toast visible={toast.visible} success={toast.success}>
        <IconComponent icon={toast.success ? FaIcons.FaCheck : FaIcons.FaExclamationCircle} />
        {toast.message}
      </Toast>
      
      <PageContainer isBlurred={editModalOpen || instructionsModalOpen || !!selectedMention}>
        <PageTitle>
          <IconComponent icon={FaIcons.FaComments} />
          Mentions
        </PageTitle>

        <PageSubtitle>
          Liftlio finds the perfect moments to engage, comments naturally, and builds real connections that grow your reach.
        </PageSubtitle>

        <ExplanationBox>
          <ExplanationHeader
            onClick={() => setIsExplanationExpanded(!isExplanationExpanded)}
            $isExpanded={isExplanationExpanded}
          >
            <ExplanationTitle>
              <IconComponent icon={FaIcons.FaRoute} />
              The Journey of a Liftlio Comment
            </ExplanationTitle>
            <span className="chevron-icon">
              <IconComponent icon={FaIcons.FaChevronDown} />
            </span>
          </ExplanationHeader>

          <AnimatePresence>
            {isExplanationExpanded && (
              <ExplanationContent
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <strong>Stage 1: Discovery</strong><br />
                  Liftlio continuously scans for videos where your expertise
                  can add real value. Only the best opportunities make it through.
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong>Stage 2: Quality Gate</strong><br />
                  Each video passes multiple quality checks:
                  <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                    <li>Is the audience engaged and receptive?</li>
                    <li>Will your comment add genuine value?</li>
                    <li>Is this the right moment to engage?</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong>Stage 3: Natural Engagement</strong><br />
                  The Liftlio Agent interacts like a real person would:
                  <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                    <li>Watches the video content</li>
                    <li>Engages with likes and reactions</li>
                    <li>Reads and understands comments</li>
                    <li>Responds thoughtfully at the right time</li>
                  </ul>
                </div>

                <div>
                  <strong>Stage 4: Continuous Growth</strong><br />
                  When one batch completes, Liftlio discovers new opportunities.
                  Your reach expands naturally, day after day.<br />
                  <em style={{ color: '#8B5CF6', marginTop: '8px', display: 'block' }}>
                    The system learns and improves with every interaction.
                  </em>
                </div>
              </ExplanationContent>
            )}
          </AnimatePresence>
        </ExplanationBox>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TabContainer>
            <Tab active={activeTab === 'scheduled'} onClick={() => setActiveTab('scheduled')}>
              Scheduled
            </Tab>
            <Tab active={activeTab === 'posted'} onClick={() => setActiveTab('posted')}>
              Posted
            </Tab>
            <Tab active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')}>
              Favorites
            </Tab>
          </TabContainer>
          <SpecialInstructionsButton onClick={handleSpecialInstructionsClick}>
            <IconComponent icon={HiPencil} />
            Special Instructions
          </SpecialInstructionsButton>
        </div>
        
        <MentionsContainer padding="0" elevation="medium">
          <MentionsTable>
            <TableHeader>
              <div style={{ display: 'flex', justifyContent: 'center' }}>Video</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>Type</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>Comment</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>Response</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>Actions</div>
            </TableHeader>
            
            {loading ? (
              <TableRow style={{ justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ gridColumn: '1 / span 5', textAlign: 'center', color: '#6c757d' }}>
                  <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>
                    <SpinnerIcon>
                      <IconComponent icon={FaIcons.FaSpinner} />
                    </SpinnerIcon>
                  </div>
                  <p>Loading mentions...</p>
                </div>
              </TableRow>
            ) : error ? (
              <TableRow style={{ justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ gridColumn: '1 / span 5', textAlign: 'center', color: '#dc3545' }}>
                  <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>
                    <IconComponent icon={FaIcons.FaExclamationCircle} />
                  </div>
                  <p>Error loading mentions. Please try refreshing the page.</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    style={{
                      padding: '8px 16px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      marginTop: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Refresh Page
                  </button>
                </div>
              </TableRow>
            ) : localMentionsData.length === 0 ? (
              <TableRow style={{ justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ gridColumn: '1 / span 5', textAlign: 'center', color: '#6c757d' }}>
                  <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>
                    <IconComponent icon={activeTab === 'favorites' ? FaIcons.FaHeart : FaIcons.FaInbox} />
                  </div>
                  {activeTab === 'scheduled' ? (
                    <p>Today's scheduled posts will appear here before being published</p>
                  ) : activeTab === 'posted' ? (
                    <p>No posted mentions found. Check back later for new content.</p>
                  ) : activeTab === 'favorites' ? (
                    <p>No favorite mentions yet. Mark posts as favorites to see them here.</p>
                  ) : (
                    <p>No mentions found for the selected filter.</p>
                  )}
                </div>
              </TableRow>
            ) : (
              localMentionsData.map((mention, index) => (
                <TableRow 
                  key={mention.id} 
                  index={index}
                  isFavorite={mention.favorite}
                  onClick={() => setSelectedMention(mention)}
                >
                  <VideoCell>
                    <VideoThumbnailWrapper>
                      <VideoThumbnail>
                        <img 
                          src={mention.video.thumbnail || `https://i.ytimg.com/vi/${mention.video.id}/maxresdefault.jpg`} 
                          alt={mention.video.title}
                          onError={(e) => {
                            // Fallback if high quality thumbnail is not available
                            const target = e.target as HTMLImageElement;
                            target.src = `https://i.ytimg.com/vi/${mention.video.id}/hqdefault.jpg`;
                          }}
                        />
                      </VideoThumbnail>
                    </VideoThumbnailWrapper>
                    <VideoInfo>
                      <VideoTitle>{mention.video.title}</VideoTitle>
                      <VideoStats>
                        <span>
                          <IconComponent icon={FaIcons.FaThumbsUp} />
                          {mention.video.likes.toLocaleString()}
                        </span>
                        <span>
                          <IconComponent icon={FaIcons.FaEye} />
                          {mention.video.views.toLocaleString()}
                        </span>
                      </VideoStats>
                      <VideoAction>
                        <ViewDetailsButton 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent TableRow click from triggering
                            setSelectedMention(mention);
                          }}
                        >
                          See details <IconComponent icon={FaIcons.FaEye} />
                        </ViewDetailsButton>
                      </VideoAction>
                    </VideoInfo>
                  </VideoCell>
                  
                  {renderTypeCell(mention)}
                  
                  <CommentCell>
                    <CommentInfo>
                      <CommentHeader>
                        <CommentAuthorSection>
                          <CommentAuthor>
                            <IconComponent icon={FaIcons.FaUser} />
                            {mention.comment.author}
                          </CommentAuthor>
                          <CommentDate>
                            <IconComponent icon={FaIcons.FaClock} />
                            {mention.comment.date}
                          </CommentDate>
                        </CommentAuthorSection>
                        <CommentEngagement>
                          <EngagementBadge>
                            <IconComponent icon={FaIcons.FaThumbsUp} />
                            {mention.comment.likes}
                          </EngagementBadge>
                        </CommentEngagement>
                      </CommentHeader>
                      <CommentText>
                        {decodeHtmlEntities(mention.comment.text)}
                      </CommentText>
                      {mention.comment.comment_justificativa && (
                        <div 
                          style={{ 
                            marginTop: '8px', 
                            fontSize: '12px', 
                            color: COLORS.TEXT.SECONDARY
                          }}
                        >
                          <strong>Justification</strong> (view in details)
                        </div>
                      )}
                    </CommentInfo>
                  </CommentCell>
                  
                  <ResponseCell>
                    <ResponseInfo status={mention.response.status}>
                      <ResponseStatusBadge status={activeTab === 'scheduled' ? 'scheduled' : 'posted'}>
                        {activeTab === 'scheduled' ? (
                          <>
                            <IconComponent icon={FaIcons.FaClock} />
                            Scheduled
                          </>
                        ) : (
                          <>
                            <IconComponent icon={FaIcons.FaCheck} />
                            Posted
                          </>
                        )}
                      </ResponseStatusBadge>
                      <ResponseText>
                        {mention.response.text}
                      </ResponseText>
                      <ResponseDate status={activeTab === 'scheduled' ? 'scheduled' : 'posted'}>
                        <IconComponent 
                          icon={activeTab === 'scheduled' ? FaIcons.FaClock : FaIcons.FaCalendarCheck} 
                        />
                        {formatDate(mention.response.date)}
                      </ResponseDate>
                      <SeeMoreLink>
                        See more <IconComponent icon={FaIcons.FaChevronRight} />
                      </SeeMoreLink>
                      {mention.response.msg_justificativa && (
                        <div 
                          style={{ 
                            marginTop: '8px', 
                            fontSize: '12px', 
                            color: COLORS.TEXT.SECONDARY
                          }}
                        >
                          <strong>Justification</strong> (view in details)
                        </div>
                      )}
                    </ResponseInfo>
                  </ResponseCell>
                  
                  <ActionsCell>
                    <ActionButtonsGroup>
                      <ActionLabel>Actions</ActionLabel>
                      {activeTab !== 'scheduled' && (
                        <ActionButton 
                          variant="favorite" 
                          title={mention.favorite ? "Remove from favorites" : "Add to favorites"}
                          onClick={(e) => {
                            // Prevent button click from propagating to the TableRow
                            e.stopPropagation();
                            
                            console.log(`DEBUG btn: mention=${JSON.stringify({
                              id: mention.id,
                              favorite: mention.favorite
                            })}`);
                            handleToggleFavorite(mention.id, mention.favorite);
                          }}
                          disabled={processandoFavoritos.includes(mention.id)}
                        >
                          {processandoFavoritos.includes(mention.id) ? (
                            <SpinnerIcon>
                              <IconComponent icon={FaIcons.FaSpinner} />
                            </SpinnerIcon>
                          ) : (
                            <IconComponent icon={mention.favorite ? FaIcons.FaHeart : FaIcons.FaRegHeart} />
                          )}
                        </ActionButton>
                      )}
                      <ActionButton 
                        variant="primary" 
                        title="Edit response"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(mention);
                        }}
                      >
                        <IconComponent icon={FaIcons.FaPencilAlt} />
                      </ActionButton>
                    </ActionButtonsGroup>
                  </ActionsCell>
                </TableRow>
              ))
            )}
          </MentionsTable>
          
          {/* Pagination */}
          {data.length > 0 && pagination.totalPages > 1 && (
            <PaginationContainer>
              <PageButton 
                onClick={pagination.goToPrevPage} 
                disabled={pagination.currentPage === 1}
              >
                <IconComponent icon={FaIcons.FaChevronLeft} />
              </PageButton>
              
              <PageNumbers>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  // Logic to display the appropriate pages when we have many pages
                  let pageNum = i + 1;
                  if (pagination.totalPages > 5) {
                    if (pagination.currentPage <= 3) {
                      // We are on the first pages
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      // We are on the last pages
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      // We are in the middle
                      pageNum = pagination.currentPage - 2 + i;
                    }
                  }
                  
                  return (
                    <PageButton 
                      key={i}
                      active={pageNum === pagination.currentPage}
                      onClick={() => pagination.goToPage(pageNum)}
                    >
                      {pageNum}
                    </PageButton>
                  );
                })}
              </PageNumbers>
              
              <PageButton 
                onClick={pagination.goToNextPage} 
                disabled={pagination.currentPage === pagination.totalPages}
              >
                <IconComponent icon={FaIcons.FaChevronRight} />
              </PageButton>
              
              <PageInfo>
                Página {pagination.currentPage} de {pagination.totalPages} 
                ({pagination.totalItems} itens)
              </PageInfo>
            </PaginationContainer>
          )}
        </MentionsContainer>
        {/* Seção Analytics removida */}
      </PageContainer>
      
      <EditResponseModal 
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        mention={currentMention}
        onSave={handleSaveResponse}
      />
      
      {/* Popup de detalhes de menção */}
      {/* Modal de Instruções Especiais */}
      {instructionsModalOpen && (
        <DetailPopupOverlay onClick={() => setInstructionsModalOpen(false)}>
          <DetailPopupContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <DetailPopupHeader>
              <DetailPopupTitle>
                <IconComponent icon={HiPencil} />
                Guidelines for Liftlio
              </DetailPopupTitle>
              <DetailPopupCloseButton onClick={() => setInstructionsModalOpen(false)}>×</DetailPopupCloseButton>
            </DetailPopupHeader>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>Recommend what Liftlio should NOT do in responses</h3>
              <p style={{ color: theme.colors.text.secondary }}>
                Tell Liftlio what to avoid when generating responses to comments. This helps maintain 
                compliance and optimize your audience engagement.
              </p>
            </div>
            
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder="Example: Don't use emojis in responses. Avoid making specific claims about results or earnings. Don't mention competitor names. Don't include promotional language in initial responses."
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.border.primary}`,
                resize: 'vertical',
                fontSize: '16px',
                marginBottom: '20px'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button type="button" onClick={() => setInstructionsModalOpen(false)}>Cancel</Button>
              <Button type="button" variant="primary" onClick={saveProjectInstructions}>Save Instructions</Button>
            </div>
          </DetailPopupContent>
        </DetailPopupOverlay>
      )}
      
      {selectedMention && (
        <DetailPopupOverlay onClick={() => setSelectedMention(null)}>
          <DetailPopupContent onClick={(e) => e.stopPropagation()}>
            <FavoriteIndicator isFavorite={selectedMention.favorite}>
              <IconComponent icon={selectedMention.favorite ? FaIcons.FaHeart : FaIcons.FaRegHeart} />
            </FavoriteIndicator>
            
            <DetailPopupHeader>
              <DetailPopupTitle>Mention Details</DetailPopupTitle>
              <DetailPopupCloseButton onClick={() => setSelectedMention(null)}>×</DetailPopupCloseButton>
            </DetailPopupHeader>
            
            <DetailPopupVideoSection>
              <DetailPopupThumbnail>
                <img
                  src={selectedMention.video.thumbnail}
                  alt={selectedMention.video.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://i.ytimg.com/vi/${selectedMention.video.id}/hqdefault.jpg`;
                  }}
                />
              </DetailPopupThumbnail>
              
              <DetailPopupVideoInfo>
                <DetailPopupVideoTitle>{selectedMention.video.title}</DetailPopupVideoTitle>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                  <span><IconComponent icon={FaIcons.FaEye} /> {selectedMention.video.views.toLocaleString()} views</span>
                  <span><IconComponent icon={FaIcons.FaThumbsUp} /> {selectedMention.video.likes.toLocaleString()} likes</span>
                </div>
                <div>
                  <strong>Canal:</strong> {selectedMention.video.channel}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <button
                    style={{
                      background: '#8b5cf6',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      marginTop: '15px',
                      color: 'white',
                      boxShadow: theme.shadows.md,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#7c3aed'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#8b5cf6'}
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedMention.video.youtube_id}`, '_blank')}
                  >
                    <IconComponent icon={FaIcons.FaYoutube} /> View on YouTube
                  </button>
                </div>
              </DetailPopupVideoInfo>
            </DetailPopupVideoSection>
            
            <DetailPopupGrid>
              <DetailPopupSection>
                <DetailPopupSectionTitle>
                  <IconComponent icon={FaIcons.FaComment} /> Comment
                </DetailPopupSectionTitle>
                
                <DetailPopupComment>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>{selectedMention.comment.author}</strong>
                    <span>{formatDate(selectedMention.comment.date)}</span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{decodeHtmlEntities(selectedMention.comment.text)}</p>
                  <div>
                    <IconComponent icon={FaIcons.FaThumbsUp} /> {selectedMention.comment.likes} likes
                  </div>
                  {selectedMention.comment.comment_justificativa && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      background: 'rgba(45, 62, 80, 0.06)',
                      borderRadius: '6px',
                      border: '1px solid rgba(45, 62, 80, 0.1)'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Justification for choosing this comment:</div>
                      <p style={{ margin: 0, fontSize: '14px' }}>{selectedMention.comment.comment_justificativa}</p>
                    </div>
                  )}
                </DetailPopupComment>
                
                <div style={{ 
                  margin: '15px 0',
                  background: 'rgba(45, 62, 80, 0.05)',
                  padding: '15px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                  border: '1px solid rgba(45, 62, 80, 0.1)'
                }}>
                  <ScoreCardContainer style={{ width: '140px' }}>
                    <ScoreLabel>
                      Score
                      <TypeBadge type={selectedMention.type}>{selectedMention.type}</TypeBadge>
                    </ScoreLabel>
                    <ScoreValueRow>
                      <ScoreValue score={selectedMention.score}>{selectedMention.score}%</ScoreValue>
                      <ScoreQualityBadge score={selectedMention.score}>
                        {selectedMention.score >= 70 ? 'Quality' : selectedMention.score >= 40 ? 'Medium' : 'Low'}
                      </ScoreQualityBadge>
                    </ScoreValueRow>
                    <ScoreMeterContainer>
                      <ScoreMeterFill 
                        score={selectedMention.score} 
                        style={{ '--fill-width': `${selectedMention.score}%` } as React.CSSProperties} 
                      />
                    </ScoreMeterContainer>
                  </ScoreCardContainer>
                </div>
              </DetailPopupSection>
              
              <DetailPopupSection>
                <DetailPopupSectionTitle>
                  <IconComponent icon={FaIcons.FaReply} /> Response
                </DetailPopupSectionTitle>
                
                <DetailPopupResponse>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    background: activeTab === 'posted' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                    color: activeTab === 'posted' ? '#8b5cf6' : '#a78bfa',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    border: `1px solid ${activeTab === 'posted' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(167, 139, 250, 0.3)'}`
                  }}>
                    <IconComponent icon={activeTab === 'posted' ? FaIcons.FaCheck : FaIcons.FaClock} />
                    {' '}
                    {activeTab === 'posted' ? 'Posted' : 'Scheduled'}
                  </div>
                  
                  <p style={{ margin: '0 0 15px 0', lineHeight: '1.6' }}>{selectedMention.response.text}</p>
                  
                  {selectedMention.response.date && (
                    <div style={{
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      marginTop: '8px',
                      background: activeTab === 'posted' ?
                        'rgba(139, 92, 246, 0.1)' :
                        'rgba(167, 139, 250, 0.1)',
                      color: activeTab === 'posted' ?
                        '#8b5cf6' :
                        '#a78bfa'
                    }}>
                      <IconComponent 
                        icon={activeTab === 'posted' ? 
                          FaIcons.FaCalendarCheck : 
                          FaIcons.FaClock
                        } 
                        style={{ marginRight: '6px' }}
                      /> 
                      Data: {formatDate(selectedMention.response.date)}
                    </div>
                  )}
                  <SeeMoreLink>
                    See more <IconComponent icon={FaIcons.FaChevronRight} />
                  </SeeMoreLink>
                  
                  {selectedMention.response.msg_justificativa && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      background: 'rgba(45, 62, 80, 0.06)',
                      borderRadius: '6px',
                      border: '1px solid rgba(45, 62, 80, 0.1)'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Justification for this response:</div>
                      <p style={{ margin: 0, fontSize: '14px' }}>{selectedMention.response.msg_justificativa}</p>
                    </div>
                  )}
                </DetailPopupResponse>

                {/* Liftlio Agent Activity Section - Only for posts made by Browser Agent */}
                {activeTab === 'posted' && browserTaskInfo?.exists && (
                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(139, 92, 246, 0.25)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '14px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}>
                        <IconComponent icon={FaIcons.FaRobot} style={{ color: 'white', fontSize: '14px' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '14px' }}>Liftlio Agent Activity</div>
                        <div style={{ fontSize: '11px', color: theme.colors.text.secondary }}>Human-like engagement</div>
                      </div>
                      <div style={{
                        marginLeft: 'auto',
                        padding: '4px 10px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <IconComponent icon={FaIcons.FaCheckCircle} /> Completed
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: theme.colors.text.primary,
                        border: '1px solid rgba(139, 92, 246, 0.15)'
                      }}>
                        <IconComponent icon={FaIcons.FaPlay} style={{ color: '#8b5cf6' }} />
                        <span>Watched video</span>
                        <IconComponent icon={FaIcons.FaCheck} style={{ color: '#22c55e', marginLeft: 'auto' }} />
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: theme.colors.text.primary,
                        border: '1px solid rgba(139, 92, 246, 0.15)'
                      }}>
                        <IconComponent icon={FaIcons.FaThumbsUp} style={{ color: '#8b5cf6' }} />
                        <span>Liked video</span>
                        <IconComponent icon={FaIcons.FaCheck} style={{ color: '#22c55e', marginLeft: 'auto' }} />
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: theme.colors.text.primary,
                        border: '1px solid rgba(139, 92, 246, 0.15)'
                      }}>
                        <IconComponent icon={FaIcons.FaComments} style={{ color: '#8b5cf6' }} />
                        <span>Read comments</span>
                        <IconComponent icon={FaIcons.FaCheck} style={{ color: '#22c55e', marginLeft: 'auto' }} />
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: theme.colors.text.primary,
                        border: '1px solid rgba(139, 92, 246, 0.15)'
                      }}>
                        <IconComponent icon={FaIcons.FaReply} style={{ color: '#8b5cf6' }} />
                        <span>Posted reply</span>
                        <IconComponent icon={FaIcons.FaCheck} style={{ color: '#22c55e', marginLeft: 'auto' }} />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.colors.text.primary }}>
                        <IconComponent icon={FaIcons.FaClock} style={{ color: '#8b5cf6' }} />
                        <span style={{ fontWeight: '500' }}>Engagement time:</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                          {browserTaskInfo?.duration_seconds
                            ? `${Math.floor(browserTaskInfo.duration_seconds / 60)}:${String(browserTaskInfo.duration_seconds % 60).padStart(2, '0')} min`
                            : '~4:30 min'}
                        </span>
                      </div>
                      <div style={{
                        padding: '3px 8px',
                        background: 'rgba(139, 92, 246, 0.25)',
                        color: '#8b5cf6',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Natural Behavior
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    style={{
                      background: '#8b5cf6',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#7c3aed'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#8b5cf6'}
                    onClick={() => {
                      setSelectedMention(null);
                      setCurrentMention(selectedMention);
                      setEditModalOpen(true);
                    }}
                  >
                    <IconComponent icon={FaIcons.FaEdit} /> Edit Response
                  </button>
                </div>
              </DetailPopupSection>
            </DetailPopupGrid>
          </DetailPopupContent>
        </DetailPopupOverlay>
      )}
    </IconContext.Provider>
  );
};

export default Mentions;