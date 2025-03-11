import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useMentionsData, TimeframeType, TabType, MentionData } from '../hooks/useMentionsData';
import { supabase } from '../lib/supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';

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

// Animação de rotação para o ícone de carregamento
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Componente de spinner com animação
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
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  position: relative;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
    animation: ${pulse} 3s infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 60px;
    height: 3px;
    background: ${props => props.theme.colors.gradient.primary};
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
  background: #f0f0f5;
  border-radius: ${props => props.theme.radius.pill};
  padding: 5px;
  width: fit-content;
  box-shadow: ${props => props.theme.shadows.sm};
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
      rgba(135, 97, 197, 0.05), 
      rgba(79, 172, 254, 0.05), 
      rgba(135, 97, 197, 0.05));
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
  background: ${props => props.active ? props.theme.colors.white : 'transparent'};
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.normal};
  color: ${props => props.active ? '#6b46c1' : props.theme.colors.darkGrey};
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
    background: ${props => props.active ? '#6b46c1' : 'transparent'};
    transition: background 0.3s ease;
    opacity: 1;
  }
  
  ${props => props.active && tabHoverEffect}
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.white : 'rgba(255, 255, 255, 0.8)'};
    color: #6b46c1;
    
    &::after {
      background: #6b46c1;
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
  border: 1px solid rgba(135, 97, 197, 0.1);
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.xl};
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
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  color: #4a5568;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f8f9fa;
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

const TableRow = styled.div<{ index?: number }>`
  display: grid;
  grid-template-columns: 2.5fr 1fr 2.5fr 3fr 1fr;
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  align-items: stretch;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  animation: ${tableAppear} 0.5s ease-out forwards;
  animation-delay: ${props => (props.index || 0) * 0.1}s;
  opacity: 0;
  min-width: 1000px;
  
  &:hover {
    background-color: rgba(135, 97, 197, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
    opacity: 0.1;
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
    box-shadow: 0 0 5px rgba(135, 97, 197, 0.5);
  }
  50% {
    box-shadow: 0 0 15px rgba(135, 97, 197, 0.8), 0 0 30px rgba(135, 97, 197, 0.4);
  }
  100% {
    box-shadow: 0 0 5px rgba(135, 97, 197, 0.5);
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
      rgba(135, 97, 197, 0) 40%,
      rgba(135, 97, 197, 0.2) 50%,
      rgba(135, 97, 197, 0) 60%
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
  color: ${props => props.theme.colors.text};
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
  color: ${props => props.theme.colors.darkGrey};
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
  color: ${props => props.theme.colors.tertiary};
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
  color: ${props => props.theme.colors.darkGrey};
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
    background: ${props => props.theme.colors.gradient.primary};
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

const LEDScoreBadgeContainer = styled.div`
  position: relative;
`;

const ScoreRipple = styled.div<{ score: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: ${props => {
    if (props.score >= 80) return 'rgba(0, 199, 129, 0.15)';
    if (props.score >= 60) return 'rgba(153, 199, 129, 0.15)';
    if (props.score >= 40) return 'rgba(255, 170, 21, 0.15)';
    if (props.score >= 20) return 'rgba(255, 140, 64, 0.15)';
    return 'rgba(255, 64, 64, 0.15)';
  }};
  z-index: 1;
`;

const LedScoreText = styled.div`
  position: relative;
  z-index: 2;
`;

const LedScoreBadge = styled.div<{ score: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  color: white;
  font-weight: 600;
  font-size: 1.25rem;
  background: ${props => {
    // Dynamic gradient based on score
    if (props.score >= 80) return 'linear-gradient(135deg, #00C781 0%, #82ffc9 100%)';
    if (props.score >= 60) return 'linear-gradient(135deg, #99C781 20%, #d4ffaa 100%)';
    if (props.score >= 40) return 'linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)';
    if (props.score >= 20) return 'linear-gradient(135deg, #FF8C40 0%, #ffb27e 100%)';
    return 'linear-gradient(135deg, #FF4040 0%, #ff9b9b 100%)';
  }};
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s ease;
  z-index: 2;
  animation: ${scorePulse} 4s ease-in-out infinite;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background: inherit;
    z-index: -1;
    filter: blur(10px);
    opacity: 0.7;
    transition: all 0.3s ease;
  }
  
  &:hover::before {
    opacity: 0.9;
    filter: blur(15px);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 5px;
    left: 5px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    filter: blur(1px);
  }
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
  
  // Add ellipsis for long text
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResponseDate = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.darkGrey};
  margin-top: auto;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const SeeMoreLink = styled.a`
  color: ${props => props.theme.colors.tertiary};
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
    props.variant === 'primary' ? 'white' : 
    props.variant === 'favorite' ? 'rgba(255, 92, 147, 0.1)' : 
    'rgba(135, 97, 197, 0.1)'};
  border: ${props => 
    props.variant === 'primary' ? '1px solid rgba(135, 97, 197, 0.3)' : 'none'};
  color: ${props => 
    props.variant === 'favorite' ? '#FF5C93' : 
    props.theme.colors.primary};
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
      props.variant === 'favorite' ? 'rgba(255, 92, 147, 0.2)' : 
      props.variant === 'primary' ? 'white' : 
      'rgba(135, 97, 197, 0.2)'};
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
  color: ${props => props.theme.colors.darkGrey};
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
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.xl};
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
`;

const ModalTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  color: ${props => props.theme.colors.primary};
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
  color: ${props => props.theme.colors.darkGrey};
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
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.tertiary};
    box-shadow: 0 0 0 2px rgba(135, 97, 197, 0.2);
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
    ? props.theme.colors.gradient.primary 
    : 'transparent'};
  color: ${props => props.variant === 'primary' 
    ? 'white' 
    : props.theme.colors.darkGrey};
  border: ${props => props.variant === 'primary' 
    ? 'none' 
    : `1px solid ${props.theme.colors.grey}`};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'primary' 
      ? props.theme.shadows.md 
      : 'none'};
    background: ${props => props.variant === 'primary' 
      ? props.theme.colors.gradient.accent 
      : props.theme.colors.lightGrey};
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

// Chart data for the analytics section
const analyticsData = [
  { day: 'Mon', mentions: 65, responses: 55 },
  { day: 'Tue', mentions: 78, responses: 70 },
  { day: 'Wed', mentions: 52, responses: 48 },
  { day: 'Thu', mentions: 91, responses: 80 },
  { day: 'Fri', mentions: 44, responses: 36 },
  { day: 'Sat', mentions: 59, responses: 45 },
  { day: 'Sun', mentions: 86, responses: 75 }
];

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

const AnalyticsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 16px;
  }
`;

const AnalyticsTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
  }
`;

const TimeframeSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
  
  @media (max-width: 480px) {
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }
`;

const TimeframeButton = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  border-radius: ${props => props.theme.radius.pill};
  border: none;
  background: ${props => props.active ? props.theme.colors.primary : '#f0f0f5'};
  color: ${props => props.active ? 'white' : props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary : '#e0e0e5'};
  }
`;

const StatsGrid = styled.div`
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

const ChartSection = styled.div`
  display: flex;
  height: 400px;
  background: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.md};
  border: 1px solid ${props => props.theme.colors.lightGrey};
  overflow: hidden;
  position: relative;
  box-shadow: ${props => props.theme.shadows.md};
  animation: ${fadeIn} 1.2s ease-out forwards;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.lg};
    transform: translateY(-5px);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: ${props => props.theme.colors.gradient.primary};
    opacity: 0.7;
  }
  
  @media (max-width: 768px) {
    height: 300px;
  }
  
  @media (max-width: 480px) {
    height: 250px;
  }
`;

const ChartLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
`;

const ChartLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.darkGrey};
  text-align: center;
  width: 40px;
`;

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
  const [timeframe, setTimeframe] = useState<TimeframeType>('week');
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
  
  // Usar o hook para obter dados dinâmicos
  const { 
    loading, 
    error, 
    mentionsData: data, 
    mentionStats, 
    performanceData,
    toggleFavorite: toggleFavoriteMention,
    setTimeframe: setMentionTimeframe,
    pagination // Obter informações e funções de paginação
  } = useMentionsData(activeTab);
  
  // Estado local adicional para forçar atualizações
  const [localMentionsData, setLocalMentionsData] = useState<MentionData[]>([]);
  
  // Sincronizar dados locais com dados do hook
  useEffect(() => {
    setLocalMentionsData(data);
    
    if (activeTab === 'favorites') {
      console.log("Dados de favoritos no componente:", data.length, data);
    }
  }, [activeTab, data]);
  
  const renderTypeCell = (mention: MentionData) => {
    if (mention.type === 'Led Score') {
      return (
        <TypeCell>
          <LedScoreWrapper>
            <LedScoreLabel>{mention.type}</LedScoreLabel>
            <LEDScoreBadgeContainer>
              <ScoreRipple score={mention.score} />
              <LedScoreBadge score={mention.score}>
                <LedScoreText>{mention.score}%</LedScoreText>
              </LedScoreBadge>
            </LEDScoreBadgeContainer>
          </LedScoreWrapper>
        </TypeCell>
      );
    }
    
    return (
      <TypeCell>
        <LedScoreWrapper>
          <LedScoreLabel>{mention.type}</LedScoreLabel>
          <LEDScoreBadgeContainer>
            <ScoreRipple score={mention.score} />
            <LedScoreBadge score={mention.score}>
              <LedScoreText>{mention.score}%</LedScoreText>
            </LedScoreBadge>
          </LEDScoreBadgeContainer>
        </LedScoreWrapper>
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
  
  const handleToggleFavorite = async (id: number, currentStatus: boolean) => {
    console.log(`Clicou para alternar favorito: ID=${id}, Status atual=${currentStatus}`);
    
    // Marcar este favorito como em processamento
    setProcessandoFavoritos(prev => [...prev, id]);
    
    // Primeiro, tente o método normal
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
          // Forçar recarregamento dos dados localmente
          setLocalMentionsData(data.map(item => 
            item.id === id 
              ? { ...item, favorite: !currentStatus } 
              : item
          ));
          
          // Recarregar dados completos
          console.log("Recarregando dados...");
          
          // Forçar recarregamento dos dados após um breve delay
          setTimeout(() => {
            // Recarregar dados diretamente do banco
            if (activeTab === 'favorites') {
              // Consultar favoritos diretamente
              const buscarFavoritos = async () => {
                console.log("Buscando favoritos diretamente do banco...");
                try {
                  const { data: favoritosData, error: favoritosError } = await supabase
                    .from('Mensagens')
                    .select('id, template')
                    .eq('template', true);
                    
                  if (!favoritosError && favoritosData) {
                    console.log(`Encontrados ${favoritosData.length} favoritos no banco.`);
                  }
                  
                  // Forçar recarregamento da página atual
                  window.location.reload();
                } catch (err) {
                  console.error("Erro ao buscar favoritos:", err);
                }
              };
              
              buscarFavoritos();
            } else {
              // Simplemente forçar recarregamento da página
              window.location.reload();
            }
          }, 1000); // Esperar 1 segundo antes de recarregar
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
    
    // Se não encontrou msg_id ou ocorreu erro, remover do estado de processamento após 3 segundos
    setTimeout(() => {
      setProcessandoFavoritos(prev => prev.filter(itemId => itemId !== id));
    }, 3000);
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
                <TableRow key={mention.id} index={index}>
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
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${mention.video.id}`, '_blank')}
                        >
                          See details <IconComponent icon={FaIcons.FaExternalLinkAlt} />
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
                      <ResponseStatusBadge status={mention.response.date ? 'posted' : 'scheduled'}>
                        {mention.response.date ? (
                          <>
                            <IconComponent icon={FaIcons.FaCheck} />
                            Posted
                          </>
                        ) : (
                          <>
                            <IconComponent icon={FaIcons.FaClock} />
                            Scheduled
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
                          onClick={() => {
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
                        onClick={() => handleEditClick(mention)}
                      >
                        <IconComponent icon={FaIcons.FaPencilAlt} />
                      </ActionButton>
                      <ActionButton 
                        title="View analytics"
                      >
                        <IconComponent icon={FaIcons.FaChartLine} />
                      </ActionButton>
                    </ActionButtonsGroup>
                  </ActionsCell>
                </TableRow>
              ))
            )}
          </MentionsTable>
          
          {/* Paginação */}
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
                  // Lógica para mostrar as páginas adequadas quando temos muitas páginas
                  let pageNum = i + 1;
                  if (pagination.totalPages > 5) {
                    if (pagination.currentPage <= 3) {
                      // Estamos nas primeiras páginas
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      // Estamos nas últimas páginas
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      // Estamos no meio
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
        <AnalyticsSection>
          <AnalyticsHeader>
            <AnalyticsTitle>
              <IconComponent icon={FaIcons.FaChartBar} />
              Mentions Performance
            </AnalyticsTitle>
            <TimeframeSelector>
              <TimeframeButton 
                active={timeframe === 'day'} 
                onClick={() => {
                  setTimeframe('day');
                  setMentionTimeframe('day');
                }}
              >
                Day
              </TimeframeButton>
              <TimeframeButton 
                active={timeframe === 'week'} 
                onClick={() => {
                  setTimeframe('week');
                  setMentionTimeframe('week');
                }}
              >
                Week
              </TimeframeButton>
              <TimeframeButton 
                active={timeframe === 'month'} 
                onClick={() => {
                  setTimeframe('month');
                  setMentionTimeframe('month');
                }}
              >
                Month
              </TimeframeButton>
              <TimeframeButton 
                active={timeframe === 'year'} 
                onClick={() => {
                  setTimeframe('year');
                  setMentionTimeframe('year');
                }}
              >
                Year
              </TimeframeButton>
            </TimeframeSelector>
          </AnalyticsHeader>
          
          <StatsGrid>
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #8561C5 0%, #9575CD 100%)`}>
                <IconComponent icon={FaIcons.FaComments} />
              </StatIcon>
              <StatValue>{mentionStats.totalMentions}</StatValue>
              <StatLabel>Total Mentions</StatLabel>
              <StatTrend increasing={mentionStats.trends.totalMentionsTrend > 0}>
                <IconComponent icon={mentionStats.trends.totalMentionsTrend > 0 ? FaIcons.FaArrowUp : FaIcons.FaArrowDown} />
                {Math.abs(mentionStats.trends.totalMentionsTrend)}% from last week
              </StatTrend>
            </StatCard>
            
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #00C781 0%, #82ffc9 100%)`}>
                <IconComponent icon={FaIcons.FaCheck} />
              </StatIcon>
              <StatValue>{mentionStats.respondedMentions}</StatValue>
              <StatLabel>Responded Mentions</StatLabel>
              <StatTrend increasing={mentionStats.trends.respondedMentionsTrend > 0}>
                <IconComponent icon={mentionStats.trends.respondedMentionsTrend > 0 ? FaIcons.FaArrowUp : FaIcons.FaArrowDown} />
                {Math.abs(mentionStats.trends.respondedMentionsTrend)}% from last week
              </StatTrend>
            </StatCard>
            
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)`}>
                <IconComponent icon={FaIcons.FaClock} />
              </StatIcon>
              <StatValue>{mentionStats.pendingResponses}</StatValue>
              <StatLabel>Pending Responses</StatLabel>
              <StatTrend increasing={mentionStats.trends.pendingResponsesTrend > 0}>
                <IconComponent icon={mentionStats.trends.pendingResponsesTrend > 0 ? FaIcons.FaArrowUp : FaIcons.FaArrowDown} />
                {Math.abs(mentionStats.trends.pendingResponsesTrend)}% from last week
              </StatTrend>
            </StatCard>
            
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #9575CD 0%, #4facfe 100%)`}>
                <IconComponent icon={FaIcons.FaPercentage} />
              </StatIcon>
              <StatValue>{Math.round(mentionStats.responseRate)}%</StatValue>
              <StatLabel>Response Rate</StatLabel>
              <StatTrend increasing={mentionStats.trends.responseRateTrend > 0}>
                <IconComponent icon={mentionStats.trends.responseRateTrend > 0 ? FaIcons.FaArrowUp : FaIcons.FaArrowDown} />
                {Math.abs(mentionStats.trends.responseRateTrend)}% from last week
              </StatTrend>
            </StatCard>
          </StatsGrid>
          
          <ChartSection>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f5" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: 'none'
                  }}
                  cursor={{ fill: 'rgba(135, 97, 197, 0.05)' }}
                />
                <Legend verticalAlign="top" height={40} />
                <Bar 
                  dataKey="mentions" 
                  name="Mentions" 
                  fill="#8561C5" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                >
                  {analyticsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#mentionsGradient-${index})`} 
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="responses" 
                  name="Responses" 
                  fill="#4facfe" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  animationBegin={300}
                >
                  {analyticsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#responsesGradient-${index})`} 
                    />
                  ))}
                </Bar>
                <defs>
                  {analyticsData.map((entry, index) => (
                    <linearGradient 
                      key={`mentionsGradient-${index}`}
                      id={`mentionsGradient-${index}`} 
                      x1="0" y1="0" x2="0" y2="1"
                    >
                      <stop offset="0%" stopColor="#9575CD" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#673AB7" stopOpacity={0.9} />
                    </linearGradient>
                  ))}
                  {analyticsData.map((entry, index) => (
                    <linearGradient 
                      key={`responsesGradient-${index}`}
                      id={`responsesGradient-${index}`} 
                      x1="0" y1="0" x2="0" y2="1"
                    >
                      <stop offset="0%" stopColor="#4facfe" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.9} />
                    </linearGradient>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
        </AnalyticsSection>
      </PageContainer>
      
      <EditResponseModal 
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        mention={currentMention}
        onSave={handleSaveResponse}
      />
    </IconContext.Provider>
  );
};

export default Mentions;