import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useMentionsData, TimeframeType, TabType, MentionData } from '../hooks/useMentionsData';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
// Recharts imports removidos pois os gráficos foram removidos

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
const PageContainer = styled.div`
  padding: 16px;
  animation: ${fadeIn} 0.6s ease-out forwards;
  background-color: ${props => props.theme.colors.tertiary}; /* Dominant color (60%) - Cinza médio */
  
  @media (max-width: 768px) {
    padding: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
  }
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${COLORS.TEXT.ON_LIGHT};
  display: flex;
  align-items: center;
  position: relative;
  
  svg {
    margin-right: 12px;
    color: ${COLORS.ACCENT};
    animation: ${pulse} 3s infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 60px;
    height: 3px;
    background: ${COLORS.GRADIENT.PRIMARY};
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

// Improved tab design
const TabContainer = styled.div`
  display: flex;
  margin-bottom: 30px;
  background: ${COLORS.DOMINANT_LIGHTER};
  border-radius: ${props => props.theme.radius.pill};
  padding: 5px;
  width: fit-content;
  box-shadow: ${COLORS.SHADOW.LIGHT};
  position: relative;
  animation: ${fadeIn} 0.8s ease-out forwards;
  white-space: nowrap;
  
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    right: -5px;
    bottom: -5px;
    left: -5px;
    background: linear-gradient(90deg, 
      ${withOpacity(COLORS.ACCENT, 0.05)}, 
      ${withOpacity(COLORS.INFO, 0.05)}, 
      ${withOpacity(COLORS.ACCENT, 0.05)});
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
  background: ${props => props.active ? COLORS.SECONDARY : 'transparent'};
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.normal};
  color: ${props => props.active ? COLORS.ACCENT : COLORS.TEXT.SECONDARY};
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
    background: ${props => props.active ? COLORS.ACCENT : 'transparent'};
    transition: background 0.3s ease;
    opacity: 1;
  }
  
  ${props => props.active && tabHoverEffect}
  
  &:hover {
    background: ${props => props.active ? COLORS.SECONDARY : withOpacity(COLORS.SECONDARY, 0.8)};
    color: ${COLORS.ACCENT};
    
    &::after {
      background: ${COLORS.ACCENT};
      opacity: ${props => props.active ? 1 : 0.5};
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
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
  animation: ${fadeIn} 1s ease-out forwards;
  box-shadow: ${props => props.theme.shadows.lg};
  border: 1px solid ${withOpacity(COLORS.ACCENT, 0.1)};
  
  &:hover {
    box-shadow: ${COLORS.SHADOW.STRONG};
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
  border-bottom: 1px solid ${COLORS.BORDER.DEFAULT};
  color: ${COLORS.TEXT.SECONDARY};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${COLORS.DOMINANT_LIGHTER};
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
  padding: 20px;
  border-bottom: 1px solid ${COLORS.BORDER.DEFAULT};
  align-items: stretch;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  animation: ${tableAppear} 0.5s ease-out forwards;
  animation-delay: ${props => (props.index || 0) * 0.1}s;
  opacity: 0;
  min-width: 1000px;
  cursor: pointer;
  
  /* Destacar itens favoritos com uma borda suave */
  border-left: ${props => props.isFavorite ? `4px solid ${COLORS.ERROR}` : '4px solid transparent'};
  
  &:hover {
    background-color: ${withOpacity(COLORS.ACCENT, 0.08)};
    transform: translateY(-2px);
    box-shadow: ${COLORS.SHADOW.MEDIUM};
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
    background: ${COLORS.GRADIENT.PRIMARY};
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
    box-shadow: 0 0 5px ${withOpacity(COLORS.ACCENT, 0.5)};
  }
  50% {
    box-shadow: 0 0 15px ${withOpacity(COLORS.ACCENT, 0.8)}, 0 0 30px ${withOpacity(COLORS.ACCENT, 0.4)};
  }
  100% {
    box-shadow: 0 0 5px ${withOpacity(COLORS.ACCENT, 0.5)};
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
  background-color: #000;
  border-radius: ${props => props.theme.radius.md};
  overflow: hidden;
  position: relative;
  box-shadow: ${COLORS.SHADOW.MEDIUM};
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
      ${withOpacity(COLORS.ACCENT, 0)} 40%,
      ${withOpacity(COLORS.ACCENT, 0.2)} 50%,
      ${withOpacity(COLORS.ACCENT, 0)} 60%
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
    box-shadow: ${COLORS.SHADOW.STRONG};
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
    border-left: 30px solid white;
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
  color: ${COLORS.TEXT.ON_LIGHT};
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
  color: ${COLORS.TEXT.SECONDARY};
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
  color: ${COLORS.ACCENT};
  font-size: ${props => props.theme.fontSizes.sm};
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: ${props => props.theme.fontWeights.medium};
  
  &:hover {
    text-decoration: underline;
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
  color: ${COLORS.TEXT.SECONDARY};
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
    background: ${COLORS.GRADIENT.PRIMARY};
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

// Componente clean para o score
const ScoreCardContainer = styled.div`
  width: 120px;
  background: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ScoreLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #718096;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TypeBadge = styled.span<{ type: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => {
    if (props.type === 'LED') return '#EBF4FF'; 
    if (props.type === 'BRAND') return '#F0FFF4';
    return '#F9F9F9'; // Fallback para outros tipos
  }};
  color: ${props => {
    if (props.type === 'LED') return '#3182CE'; 
    if (props.type === 'BRAND') return '#38A169';
    return '#718096'; // Fallback para outros tipos
  }};
  font-weight: 600;
`;

const ScoreValueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const ScoreValue = styled.div<{ score: number }>`
  font-size: 18px;
  font-weight: 700;
  color: ${props => {
    if (props.score >= 70) return '#38A169';
    if (props.score >= 40) return '#DD6B20';
    return '#E53E3E';
  }};
`;

const ScoreQualityBadge = styled.div<{ score: number }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => {
    if (props.score >= 70) return '#F0FFF4';
    if (props.score >= 40) return '#FFFAF0';
    return '#FFF5F5';
  }};
  color: ${props => {
    if (props.score >= 70) return '#38A169';
    if (props.score >= 40) return '#DD6B20';
    return '#E53E3E';
  }};
`;

const ScoreMeterContainer = styled.div`
  width: 100%;
  height: 4px;
  background: #EDF2F7;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
`;

const ScoreMeterFill = styled.div<{ score: number }>`
  height: 100%;
  width: var(--fill-width);
  background: ${props => {
    if (props.score >= 70) return '#38A169';
    if (props.score >= 40) return '#DD6B20';
    return '#E53E3E';
  }};
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
  background: #f9f8fc;
  border-radius: ${props => props.theme.radius.md};
  padding: 16px;
  width: 90%;
  position: relative;
  box-shadow: ${props => props.theme.shadows.sm};
  border-left: 4px solid ${props => props.theme.colors.primary};
  
  &::after {
    content: '';
    position: absolute;
    left: 20px;
    bottom: -10px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid #f9f8fc;
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
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
    color: ${props => props.theme.colors.primary};
  }
`;

const CommentDate = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.darkGrey};
  
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
  background: rgba(135, 97, 197, 0.1);
  color: ${props => props.theme.colors.primary};
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
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
  position: relative;
  height: 65px; /* Altura fixa para manter consistência */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* Limitar a 3 linhas */
  -webkit-box-orient: vertical;
  
  &::before {
    content: '\\201C';
    font-size: 1.5rem;
    color: ${props => props.theme.colors.primary};
    opacity: 0.3;
    position: absolute;
    left: -10px;
    top: -5px;
  }
  
  &::after {
    content: '\\201D';
    font-size: 1.5rem;
    color: ${props => props.theme.colors.primary};
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
  background: white;
  border-radius: 8px;
  padding: 16px;
  width: 90%;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid ${props => 
    !props.status || props.status === 'scheduled' ? '#e69819' : 
    props.status === 'posted' || props.status === 'published' ? '#38a169' : 
    '#6b46c1'};
`;

const ResponseStatusBadge = styled.div<{ status?: string }>`
  position: absolute;
  top: -10px;
  right: 15px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  color: white;
  background: ${props => 
    !props.status || props.status === 'scheduled' ? '#e69819' : 
    props.status === 'posted' || props.status === 'published' ? '#38a169' : 
    '#6b46c1'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  color: ${props => props.theme.colors.text};
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
`;

const DetailPopupContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 80%;
  max-width: 900px;
  max-height: none;
  overflow-y: visible;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  
  /* Design moderno com borda gradiente */
  border: 1px solid transparent;
  background-clip: padding-box;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: ${props => props.theme.colors.gradient.primary};
    z-index: -1;
    border-radius: 14px;
    opacity: 0.5;
  }
`;

const DetailPopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
`;

const DetailPopupTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  color: ${props => props.theme.colors.primary};
  margin: 0;
  font-weight: 600;
`;

const DetailPopupCloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  font-size: 28px;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
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
  border-radius: 10px;
  overflow: hidden;
  box-shadow: ${COLORS.SHADOW.MEDIUM};
  
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
  font-size: 18px;
  margin-bottom: 10px;
  color: ${COLORS.TEXT.ON_LIGHT};
  font-weight: 600;
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
  font-size: 16px;
  margin-bottom: 10px;
  color: ${COLORS.ACCENT};
  font-weight: 600;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
  }
`;

const DetailPopupComment = styled.div`
  background: ${COLORS.DOMINANT_LIGHTER};
  border-radius: 10px;
  padding: 20px;
  box-shadow: ${COLORS.SHADOW.LIGHT};
  margin-bottom: 20px;
`;

const DetailPopupResponse = styled.div`
  background: ${withOpacity(COLORS.INFO_LIGHT, 0.5)};
  border-radius: 10px;
  padding: 20px;
  box-shadow: ${COLORS.SHADOW.LIGHT};
`;

const FavoriteIndicator = styled.div<{ isFavorite: boolean }>`
  position: absolute;
  top: 30px;
  right: 80px;
  color: ${props => props.isFavorite ? COLORS.ERROR : COLORS.DOMINANT_DARK};
  font-size: 24px;
`;

const ResponseDate = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${COLORS.TEXT.SECONDARY};
  margin-top: auto;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const SeeMoreLink = styled.a`
  color: ${COLORS.ACCENT};
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
    props.variant === 'primary' ? COLORS.SECONDARY : 
    props.variant === 'favorite' ? withOpacity(COLORS.ERROR, 0.1) : 
    withOpacity(COLORS.ACCENT, 0.1)};
  border: ${props => 
    props.variant === 'primary' ? `1px solid ${withOpacity(COLORS.ACCENT, 0.3)}` : 'none'};
  color: ${props => 
    props.variant === 'favorite' ? COLORS.ERROR : 
    COLORS.ACCENT};
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
    box-shadow: ${COLORS.SHADOW.MEDIUM};
    background: ${props => 
      props.variant === 'favorite' ? withOpacity(COLORS.ERROR, 0.2) : 
      props.variant === 'primary' ? COLORS.SECONDARY : 
      withOpacity(COLORS.ACCENT, 0.2)};
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
  color: ${COLORS.TEXT.SECONDARY};
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndices.modal};
`;

const ModalContent = styled.div`
  background: ${COLORS.SECONDARY};
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${COLORS.SHADOW.STRONG};
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${COLORS.BORDER.DEFAULT};
`;

const ModalTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  color: ${COLORS.ACCENT};
  margin: 0;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${COLORS.TEXT.SECONDARY};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
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
  border: 1px solid ${COLORS.BORDER.DEFAULT};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.ACCENT};
    box-shadow: 0 0 0 2px ${withOpacity(COLORS.ACCENT, 0.2)};
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
  border: none;
  
  background: ${props => props.variant === 'primary' 
    ? COLORS.GRADIENT.PRIMARY 
    : 'transparent'};
  color: ${props => props.variant === 'primary' 
    ? COLORS.TEXT.ON_DARK 
    : COLORS.TEXT.SECONDARY};
  border: ${props => props.variant === 'primary' 
    ? 'none' 
    : `1px solid ${COLORS.BORDER.DEFAULT}`};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'primary' 
      ? COLORS.SHADOW.MEDIUM 
      : 'none'};
    background: ${props => props.variant === 'primary' 
      ? COLORS.GRADIENT.PRIMARY 
      : COLORS.DOMINANT_LIGHTER};
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
  background: white;
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
      rgba(135, 97, 197, 0.03) 0%, 
      rgba(255, 255, 255, 0) 50%, 
      rgba(79, 172, 254, 0.03) 100%);
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
  background: ${props => props.success ? '#38a169' : '#e53e3e'};
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  color: ${props => props.theme.colors.darkGrey};
  margin: 0 12px;
`;

const PageButton = styled.button<{ active?: boolean; disabled?: boolean }>`
  background: ${props => props.active ? props.theme.colors.primary : 'white'};
  color: ${props => props.active ? 'white' : props.disabled ? props.theme.colors.grey : props.theme.colors.primary};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey};
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
    background: ${props => props.disabled ? 'white' : props.active ? props.theme.colors.primary : '#f0f0f5'};
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
  onSave: (id: number, newText: string) => void;
}

const EditResponseModal: React.FC<EditModalProps> = ({ isOpen, onClose, mention, onSave }) => {
  const [responseText, setResponseText] = useState('');
  
  React.useEffect(() => {
    if (mention) {
      setResponseText(mention.response.text);
    }
  }, [mention]);
  
  if (!isOpen || !mention) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(mention.id, responseText);
    onClose();
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
            <div style={{ padding: '10px', background: '#f9f8fc', borderRadius: '8px' }}>
              {mention.comment.text}
            </div>
          </FormGroup>
          
          <FormGroup>
            <Label>Your Response</Label>
            <TextArea 
              value={responseText} 
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Enter your response..."
            />
          </FormGroup>
          
          <ButtonGroup>
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Save Response</Button>
          </ButtonGroup>
        </ResponseForm>
      </ModalContent>
    </ModalOverlay>
  );
};

const Mentions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('posted');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentMention, setCurrentMention] = useState<MentionData | null>(null);
  // Estado timeframe removido, pois o seletor de timeframe foi removido
  const [toast, setToast] = useState({ visible: false, message: '', success: true });
  
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
    pagination // Obter informações e funções de paginação
  } = useMentionsData(activeTab);
  
  // Obter estatísticas gerais independentes da aba selecionada,
  // mas filtradas apenas para o projeto atual
  const {
    mentionStats
  } = useMentionsData('all');
  
  // Obter o projeto atual do contexto
  const { currentProject } = useProject();

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
        .eq('comment_is_lead', true);
        
      if (leadMentionsError) {
        console.error('Erro ao buscar menções lead:', leadMentionsError);
      }
      
      // 3. High Priority Mentions (priority_score > 10)
      const { data: highPriorityData, error: highPriorityError } = await supabase
        .from('mentions_overview')
        .select('comment_id')
        .eq('scanner_project_id', currentProject.id)
        .gt('priority_score', 10);
        
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
  
  const handleSaveResponse = (id: number, newText: string) => {
    // Aqui seria implementada a lógica para atualizar a resposta no banco de dados
    console.log(`Saving response for mention ID ${id}: ${newText}`);
    // Por enquanto, não temos uma implementação completa para isso
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
  
  const handleToggleFavorite = async (id: number, currentStatus: boolean) => {
    console.log(`Clicou para alternar favorito: ID=${id}, Status atual=${currentStatus}`);
    
    // Marcar este favorito como em processamento
    setProcessandoFavoritos(prev => [...prev, id]);
    
    // Atualizar o estado local imediatamente para feedback visual instantâneo
    const novoEstado = !currentStatus;
    setFavoritosLocais(prev => ({
      ...prev,
      [id]: novoEstado
    }));
    
    // Também tentar o método normal para persistir no banco
    toggleFavoriteMention(id);
    
    // Buscar o msg_id para testar diretamente
    try {
      const { data: comentario } = await supabase
        .from('mentions_overview')
        .select('msg_id')
        .eq('comment_id', id)
        .single();
        
      if (comentario && comentario.msg_id) {
        console.log(`Fazendo teste direto para msg_id=${comentario.msg_id}`);
        const resultado = await testeUpdateDireto(comentario.msg_id, !currentStatus);
        
        if (resultado) {
          console.log(`Teste direto bem-sucedido! Atualizando UI...`);
          // Não precisamos mais atualizar localMentionsData aqui,
          // já que o useEffect cuida disso baseado no estado favoritosLocais
          
          // Os dados são atualizados em tempo real, então apenas remover do estado de processamento
          console.log("Atualização concluída - aguardando atualização em tempo real");
          setTimeout(() => {
            // Remover do estado de processamento após concluir
            setProcessandoFavoritos(prev => prev.filter(itemId => itemId !== id));
          }, 500);
        }
      }
    } catch (erro) {
      console.error(`Erro ao buscar msg_id:`, erro);
    }
    
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
      
      <PageContainer>
        <PageTitle>
          <IconComponent icon={FaIcons.FaComments} />
          Mentions
        </PageTitle>
        
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
                    <IconComponent icon={FaIcons.FaSpinner} />
                  </div>
                  <p>Loading mentions...</p>
                </div>
              </TableRow>
            ) : localMentionsData.length === 0 ? (
              <TableRow style={{ justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ gridColumn: '1 / span 5', textAlign: 'center', color: '#6c757d' }}>
                  <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>
                    <IconComponent icon={FaIcons.FaInbox} />
                  </div>
                  <p>No {activeTab} mentions found</p>
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
                        {mention.comment.text}
                      </CommentText>
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
                      <ResponseDate>
                        <IconComponent icon={FaIcons.FaCalendarAlt} />
                        {mention.response.date}
                      </ResponseDate>
                      <SeeMoreLink>
                        See more <IconComponent icon={FaIcons.FaChevronRight} />
                      </SeeMoreLink>
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
                      background: '#f0f0f5',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      marginTop: '15px'
                    }}
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
                    <span>{selectedMention.comment.date}</span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', lineHeight: '1.6' }}>{selectedMention.comment.text}</p>
                  <div>
                    <IconComponent icon={FaIcons.FaThumbsUp} /> {selectedMention.comment.likes} likes
                  </div>
                </DetailPopupComment>
                
                <div style={{ 
                  margin: '15px 0',
                  background: '#f8f8f8',
                  padding: '15px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'center'
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
                    background: selectedMention.response.status === 'posted' ? '#e8f5e9' : '#fff8e1',
                    color: selectedMention.response.status === 'posted' ? '#43a047' : '#ff8f00',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}>
                    <IconComponent icon={selectedMention.response.status === 'posted' ? FaIcons.FaCheck : FaIcons.FaClock} />
                    {' '}
                    {selectedMention.response.status === 'posted' ? 'Posted' : 'Scheduled'}
                  </div>
                  
                  <p style={{ margin: '0 0 15px 0', lineHeight: '1.6' }}>{selectedMention.response.text}</p>
                  
                  {selectedMention.response.date && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <IconComponent icon={FaIcons.FaCalendarAlt} /> Data: {selectedMention.response.date}
                    </div>
                  )}
                </DetailPopupResponse>
                
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    style={{ 
                      background: `linear-gradient(135deg, #6b46c1 0%, #9579e0 100%)`,
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 10px rgba(107, 70, 193, 0.2)'
                    }}
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