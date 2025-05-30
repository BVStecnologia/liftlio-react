import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { COLORS, withOpacity } from '../styles/colors';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, Label, AreaChart, Area } from 'recharts';
import * as FaIcons from 'react-icons/fa';
import { IconType } from 'react-icons';
import Card from '../components/Card';
import SentimentIndicator from '../components/SentimentIndicator';
import { IconComponent } from '../utils/IconHelper';
import { useDashboardData } from '../hooks/useDashboardData';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/EmptyState';
import ProjectModal from '../components/ProjectModal';
import { supabase } from '../lib/supabaseClient';
import { PieLabelRenderProps } from 'recharts';

// Efeito de onda suave e fluido
const waveEffect = keyframes`
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.02);
  }
  100% {
    transform: translateY(0) scale(1);
  }
`;


// Efeito de transição da esquerda para direita
const leftToRightWave = keyframes`
  0% {
    background-position: -100% 0;
    opacity: 0.1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    background-position: 200% 0;
    opacity: 0.1;
  }
`;

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

// Styled components for shimmer animations
const ShimmerBar = styled.div`
  height: 10px;
  border-radius: 6px;
  width: 60%;
  background: ${props => props.theme.name === 'dark'
    ? `linear-gradient(90deg, 
        ${props.theme.colors.accent.primary}33 0%, 
        ${props.theme.colors.accent.primary} 30%, 
        ${props.theme.colors.accent.primary}33 60%, 
        ${props.theme.colors.accent.primary} 80%, 
        ${props.theme.colors.accent.primary}33 100%)`
    : `linear-gradient(90deg, 
        ${props.theme.colors.accent.primary}33 0%, 
        ${props.theme.colors.accent.primary} 30%, 
        ${props.theme.colors.accent.primary}33 60%, 
        ${props.theme.colors.accent.primary} 80%, 
        ${props.theme.colors.accent.primary}33 100%)`};
  background-size: 200% 100%;
  animation: ${shimmer} 2s linear infinite;
  transition: width 0.5s ease;
`;

const ShimmerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
    : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)'};
  background-size: 200% 100%;
  animation: ${shimmer} 2s linear infinite;
  z-index: 1;
`;

const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
`;

// Signal animation keyframe
const signalPulse = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.8;
  }
  70% {
    opacity: 0;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
`;

// LED flow animation keyframe
const ledFlow = keyframes`
  0%, 15% {
    opacity: 0;
    transform: translateX(-10px);
  }
  20%, 30% {
    opacity: 1;
    transform: translateX(0);
  }
  35%, 100% {
    opacity: 0;
    transform: translateX(10px);
  }
`;

// Modern digital pulse animation
const digitalPulse = keyframes`
  0% {
    background-position: -20px 0;
    opacity: 0.05;
  }
  50% {
    opacity: 0.15;
  }
  100% {
    background-position: 20px 0;
    opacity: 0.05;
  }
`;

// Animação de circuito digital
const circuitFlow = keyframes`
  0% {
    background-position: 0% 0%;
    opacity: 0;
  }
  10% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.15;
  }
  90% {
    opacity: 0.1;
  }
  100% {
    background-position: 100% 100%;
    opacity: 0;
  }
`;

// Efeito de dados pulsantes
const dataPulse = keyframes`
  0% {
    transform: scale(0.95);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.2;
  }
`;

// Animação de ondas/matriz de dados
const dataMatrix = keyframes`
  0% {
    background-size: 24px 24px;
    opacity: 0.05;
  }
  50% {
    background-size: 28px 28px;
    opacity: 0.15;
  }
  100% {
    background-size: 24px 24px;
    opacity: 0.05;
  }
`;

// Ultra subtle card highlight animation
const subtleHighlight = keyframes`
  0% {
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
  100% {
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
  }
`;

// Minimal tech interface scan
const interfaceScan = keyframes`
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  50% {
    opacity: 0.08;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
`;

// Animação de fluxo de luz para o fundo dos cards
const cardLightFlow = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Tech pulse effect
const techPulse = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.5), 0 0 10px rgba(0, 123, 255, 0.5);
    opacity: 0.3;
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(0, 123, 255, 0.8);
    opacity: 0.8;
  }
  100% {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.5), 0 0 10px rgba(0, 123, 255, 0.5);
    opacity: 0.3;
  }
`;

// Digital data flow
const digitalFlow = keyframes`
  0% {
    background-position: 0% 0%;
    opacity: 0.2;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    background-position: 100% 100%;
    opacity: 0.2;
  }
`;

// Gentle indicator pulse
const indicatorPulse = keyframes`
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
`;

// Border top highlight effect
const borderGlow = keyframes`
  0%, 100% {
    box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
  }
`;

// Page container with max width and centering
const PageContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background-color: ${props => props.theme.colors.bg.primary};
  
  @media (max-width: 768px) {
    padding: 16px 12px;
    overflow-x: hidden;
  }
  
  @media (max-width: 480px) {
    padding: 12px 8px;
  }
`;

// Enhanced dashboard header
const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

// Add New Project button styling
const AddNewProjectButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: ${props => props.theme.colors.accent.primary};
  color: ${props => props.theme.colors.text.inverse};
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.theme.shadows.md};
  
  &:hover {
    background: ${props => props.theme.colors.accent.secondary};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    margin-right: 8px;
  }
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 0.9rem;
  }
`;

const PageTitle = styled.h1`
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: ${props => props.theme.colors.text.primary};
  
  div {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    color: ${props => props.theme.colors.accent.primary};
  }
`;

// Componente para o cumprimento
const GreetingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'linear-gradient(135deg, rgba(236, 242, 255, 0.8), rgba(222, 232, 255, 0.4))'};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'transparent'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  animation: ${fadeIn} 0.5s ease-out;
  
  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: 10px;
  }
`;

const GreetingText = styled.span`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  white-space: nowrap;
  
  /* Estilo para o texto do nome */
  strong {
    color: ${props => props.theme.colors.accent.primary};
    font-weight: 600;
  }
`;

const TimeIcon = styled.span`
  margin-right: 10px;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text.secondary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
  
  @media (max-width: 480px) {
    gap: 8px;
    flex-wrap: wrap;
  }
`;

// Enhanced button styles with variants
const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost' | 'outline' }>`
  padding: ${props => props.variant === 'ghost' ? '8px 12px' : '10px 16px'};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  
  .filter-text {
    @media (max-width: 480px) {
      display: none;
    }
  }
  
  @media (max-width: 768px) {
    padding: ${props => props.variant === 'ghost' ? '7px 10px' : '8px 14px'};
    font-size: ${props => props.theme.fontSizes.xs};
  }
  
  @media (max-width: 480px) {
    padding: ${props => props.variant === 'ghost' ? '6px 8px' : '7px 12px'};
    flex: ${props => props.variant === 'primary' ? '1' : 'initial'};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(90deg, 
      rgba(255,255,255,0) 0%, 
      rgba(255,255,255,0.1) 50%, 
      rgba(255,255,255,0) 100%);
    transform: rotate(45deg);
    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
    opacity: 0;
  }
  
  &:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(150%, 150%);
  }
  
  ${props => {
    if (props.variant === 'primary') {
      return css`
        background: ${props.theme.colors.accent.primary};
        color: ${props.theme.colors.text.inverse};
        border: none;
        box-shadow: ${props.theme.shadows.md};
        
        &:hover {
          box-shadow: ${props.theme.shadows.lg};
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'secondary') {
      return css`
        background: ${props.theme.colors.accent.secondary};
        color: ${props.theme.colors.text.inverse};
        border: none;
        box-shadow: ${props.theme.shadows.md};
        
        &:hover {
          box-shadow: ${props.theme.shadows.lg};
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'outline') {
      return css`
        background: transparent;
        color: ${props.theme.colors.accent.primary};
        border: 1px solid ${props.theme.colors.accent.primary};
        
        &:hover {
          background: ${props.theme.colors.bg.hover};
          transform: translateY(-2px);
        }
      `;
    } else {
      return css`
        background: transparent;
        color: ${props.theme.colors.text.secondary};
        border: 1px solid ${props.theme.colors.border.primary};
        
        &:hover {
          background: ${props.theme.colors.bg.hover};
          border-color: ${props.theme.colors.border.focus};
          color: ${props.theme.colors.text.primary};
          transform: translateY(-2px);
        }
      `;
    }
  }}
`;

// Overview cards section with grid layout
const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-bottom: 32px;
  position: relative;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
    gap: 20px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  @media (max-width: 480px) {
    gap: 12px;
    margin-bottom: 24px;
  }
`;

// Enhanced stat card with modern tech-inspired design
const StatCard = styled.div<{ gridSpan?: number; cardIndex?: number; active?: boolean }>`
  background: ${props => props.theme.components.card.bg};
  border-radius: 16px;
  padding: 24px;
  box-shadow: ${props => props.theme.components.card.shadow};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  grid-column: span ${props => props.gridSpan || 3};
  animation: ${fadeIn} 0.6s ease-out forwards;
  transform: ${props => props.cardIndex !== undefined 
    ? `scale(${1 - props.cardIndex * 0.01}) ${props.active ? 'translateY(-1px)' : 'translateY(0)'}`
    : 'scale(1)'
  };
  z-index: ${props => props.cardIndex !== undefined ? 10 - props.cardIndex : 1};
  border: 1px solid ${props => props.theme.components.card.border};
  
  &:hover {
    transform: translateY(-4px) ${props => props.cardIndex !== undefined ? `scale(${1 - props.cardIndex * 0.01})` : 'scale(1)'};
    box-shadow: ${props => props.theme.name === 'dark' ? '0 10px 30px rgba(0, 0, 0, 0.8)' : '0 10px 20px rgba(0, 0, 0, 0.15)'};
    background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.tertiary : props.theme.colors.bg.hover};
  }
  
  @media (max-width: 1200px) {
    grid-column: span ${props => Math.min(props.gridSpan || 3, 6)};
  }
  
  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const FunnelArrow = keyframes`
  0% { transform: translateX(0) translateY(0); opacity: 0.4; }
  50% { transform: translateX(6px) translateY(0); opacity: 0.9; }
  100% { transform: translateX(0) translateY(0); opacity: 0.4; }
`;

const StatCardTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  
  svg {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const FunnelArrowIcon = styled.div<{ index: number }>`
  position: absolute;
  right: -18px;
  top: 40%;
  font-size: 24px;
  color: rgba(0, 0, 0, 0.15);
  z-index: 10;
  opacity: ${props => 0.8 - props.index * 0.2};
  animation: ${FunnelArrow} 2s ease-in-out infinite;
  animation-delay: ${props => props.index * 0.3}s;
  
  @media (max-width: 1200px) {
    display: none;
  }
`;

// Modern tech indicator - ultra subtle and elegant
const LedSignalDot = styled.div<{ index: number; active: boolean }>`
  position: absolute;
  top: ${props => (40 + props.index * 2)}%;
  right: -6px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: ${COLORS.ACCENT}; // Using accent color for all LEDs
  z-index: 15;
  opacity: ${props => props.active ? 0.8 : 0};
  box-shadow: 0 0 3px ${withOpacity(COLORS.ACCENT, 0.5)}; // Unified shadow for all LEDs
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid ${props => 
      props.index === 0 ? 'rgba(33, 150, 243, 0.3)' : // Blue for Reach
      props.index === 1 ? 'rgba(255, 122, 48, 0.3)' : // Orange for Activities
      props.index === 2 ? `rgba(45, 62, 80, 0.3)` : // Blue (primary) for Engagements
      'rgba(76, 175, 80, 0.3)'         // Green for LEDs
    };
    transform: translate(-50%, -50%);
    opacity: ${props => props.active ? 0.4 : 0};
    transition: opacity 0.3s ease;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: inherit;
    animation: ${props => props.active ? indicatorPulse : 'none'} 2.5s ease-in-out infinite;
  }
  
  @media (max-width: 1200px) {
    display: none;
  }
`;

// Modern data connection - extremely minimal
const LedConnectionLine = styled.div<{ index: number; active: boolean }>`
  position: absolute;
  top: ${props => (40 + props.index * 2)}%;
  right: -6px;
  width: ${props => props.index < 3 ? '26px' : '0px'};
  height: 1px;
  background: ${props => 
    props.index === 0 ? 'rgba(33, 150, 243, 0.3)' : // Blue for Reach
    props.index === 1 ? 'rgba(255, 122, 48, 0.3)' : // Orange for Activities
    `rgba(45, 62, 80, 0.3)`           // Blue (primary) for Engagements
  };
  z-index: 5;
  opacity: ${props => props.active ? 0.6 : 0};
  transition: opacity 0.3s ease, width 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${props => 
        props.index === 0 ? 'rgba(33, 150, 243, 0.4)' : // Blue for Reach
        props.index === 1 ? 'rgba(255, 122, 48, 0.4)' : // Orange for Activities
        'rgba(103, 58, 183, 0.4)'         // Purple for Engagements
      } 50%,
      transparent 100%
    );
    background-size: 25px 100%;
    animation: ${props => props.active ? digitalPulse : 'none'} 2s linear infinite;
  }
  
  @media (max-width: 1200px) {
    display: none;
  }
`;

// Ultra minimal data particle
const FlowParticle = styled.div<{ index: number; active: boolean }>`
  position: absolute;
  top: ${props => (40 + props.index * 2)}%;
  right: -20px;
  width: 2px;
  height: 1px;
  background-color: ${props => 
    props.index === 0 ? '#2196F3' : // Blue for Reach
    props.index === 1 ? '#FF7A30' : // Orange for Activities
    props.index === 2 ? '#673AB7' : // Purple for Engagements
    '#4CAF50'         // Green for LEDs
  };
  z-index: 12;
  opacity: ${props => props.active ? 0.7 : 0};
  box-shadow: 0 0 2px ${props => 
    props.index === 0 ? 'rgba(33, 150, 243, 0.7)' : // Blue for Reach 
    props.index === 1 ? 'rgba(255, 122, 48, 0.7)' : // Orange for Activities
    props.index === 2 ? 'rgba(103, 58, 183, 0.7)' : // Purple for Engagements
    'rgba(76, 175, 80, 0.7)'         // Green for LEDs
  };
  animation: ${ledFlow} 1.8s linear infinite;
  animation-delay: ${props => props.index * 0.3}s;
  
  @media (max-width: 1200px) {
    display: none;
  }
`;

// Extremely subtle card highlight effect
const CardEnergyEffect = styled.div<{ index: number; active: boolean }>`
  display: none; /* Remove completamente o efeito colorido */
  
  /* Efeito de luz fluindo pelo card - primeira camada */
  /* Efeito de luz fluindo e escaneando */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 300%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    background-size: 100% 100%;
    animation: ${cardLightFlow} ${props => 6 - props.index * 0.7}s infinite ease-in-out;
    opacity: ${props => props.active ? 0.9 : 0.5};
    z-index: 1;
  }
  
  /* Borda superior estilo Tron com brilho energético */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
      var(--card-color-primary), 
      var(--card-color-secondary),
      var(--card-color-primary)
    );
    box-shadow: 
      0 0 10px var(--card-color-primary),
      0 0 20px var(--card-color-secondary);
    opacity: 1;
    z-index: 2;
    animation: ${techPulse} ${props => 3 + props.index * 0.5}s infinite ease-in-out;
  }
  
  /* Partículas de dados flutuantes */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 30%, var(--card-color-primary)50 1px, transparent 1px),
      radial-gradient(circle at 40% 70%, var(--card-color-secondary)50 2px, transparent 2px),
      radial-gradient(circle at 60% 40%, var(--card-color-primary)50 1px, transparent 1px),
      radial-gradient(circle at 80% 90%, var(--card-color-secondary)50 1px, transparent 1px);
    background-size: 100px 100px;
    animation: ${digitalFlow} 15s infinite linear;
    z-index: 3;
    opacity: 0.6;
  }
  
  /* Estado hover ultra dinâmico */
  ${StatCard}:hover & {
    background: 
      linear-gradient(135deg, 
        var(--card-color-primary)40 0%, 
        var(--card-color-secondary)60 100%
      ),
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    
    &::before {
      animation: ${cardLightFlow} 3s infinite ease-in-out;
      opacity: 1;
    }
    
    &::after {
      height: 6px;
      box-shadow: 
        0 0 15px var(--card-color-primary),
        0 0 30px var(--card-color-secondary);
    }
    
    /* Iluminação pulsante ao redor do card */
    box-shadow: 
      0 0 30px var(--card-color-primary)50,
      inset 0 0 20px var(--card-color-secondary)30;
  }
`;

const StatDisplay = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  
  @media (max-width: 992px) and (min-width: 768px) {
    flex-direction: column;
    
    > div:first-child {
      margin-bottom: 12px;
    }
  }
`;

const StatContent = styled.div`
  flex: 1;
  
  @media (max-width: 992px) and (min-width: 768px) {
    width: 100%;
  }
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['4xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
  letter-spacing: -0.5px;
  word-break: break-word;
  
  @media (max-width: 992px) and (min-width: 768px) {
    font-size: ${props => props.theme.fontSizes['3xl']};
  }
`;

const StatGrowth = styled.div<{ positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.positive ? '#4CAF50' : '#e74c3c'};
  background-color: transparent;
  padding: 2px 0px;
  margin-top: 4px;
  white-space: nowrap;
  
  svg {
    margin-right: 4px;
    flex-shrink: 0;
  }
  
  @media (max-width: 992px) and (min-width: 768px) {
    font-size: 10px;
  }
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  
  @media (max-width: 992px) and (min-width: 768px) {
    font-size: ${props => props.theme.fontSizes.xs};
  }
`;

const StatIconContainer = styled.div`
  position: relative;
`;

const StatIcon = styled.div<{ bgColor: string; animationDelay?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.bgColor};
  color: white;
  font-size: 1.5rem;
  position: relative;
  overflow: hidden;
  animation: ${waveEffect} 3s infinite cubic-bezier(0.4, 0, 0.6, 1);
  animation-delay: ${props => props.animationDelay || '0s'};
  transition: all 0.3s ease;
  
  svg {
    position: relative;
    z-index: 2;
    width: 24px;
    height: 24px;
    color: white;
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
  
  @media (max-width: 992px) and (min-width: 768px) {
    width: 44px;
    height: 44px;
    
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

// Charts section styling
const ChartCard = styled(StatCard)`
  padding: 0;
  overflow: hidden;
  border-left: none;
  border-top: none;
  
  @media (max-width: 768px) {
    width: 100%;
    overflow-x: auto;
  }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  
  @media (max-width: 768px) {
    padding: 16px 20px;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
  }
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const ChartBody = styled.div`
  padding: 20px 24px;
`;

const ChartContainer = styled.div`
  height: 350px;
  width: 100%;
  
  @media (max-width: 768px) {
    height: 300px;
  }
  
  @media (max-width: 480px) {
    height: 250px;
  }
`;

const ChartOptions = styled.div`
  display: flex;
  gap: 10px;
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }
`;

const ChartOption = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active 
    ? props.theme.colors.accent.primary 
    : props.theme.colors.bg.secondary};
  color: ${props => props.active 
    ? props.theme.colors.text.inverse 
    : props.theme.colors.text.secondary};
  border: 1px solid ${props => props.active 
    ? props.theme.colors.accent.primary 
    : props.theme.colors.border.primary};
  border-radius: 24px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: ${props => props.theme.fontSizes.xs};
    flex: 1;
  }
  
  &:hover {
    border-color: ${props => props.theme.colors.accent.primary};
    background: ${props => props.active 
      ? props.theme.colors.accent.secondary 
      : props.theme.colors.bg.hover};
    color: ${props => props.active 
      ? props.theme.colors.text.inverse 
      : props.theme.colors.accent.primary};
    transform: translateY(-2px);
  }
`;

const ChartTabs = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${withOpacity(COLORS.BORDER.DEFAULT, 0.2)}; /* Dominant light color com transparência */
  margin-bottom: 16px;
  
  @media (max-width: 480px) {
    flex-wrap: wrap;
    gap: 4px;
  }
`;

const ChartTab = styled.button<{ active: boolean }>`
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.accent.primary : 'transparent'};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.medium};
  color: ${props => props.active ? props.theme.colors.accent.primary : props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: ${props => props.theme.fontSizes.xs};
  }
  
  @media (max-width: 480px) {
    padding: 8px 12px;
    flex-grow: 1;
    text-align: center;
  }
  
  &:hover {
    color: ${props => props.theme.colors.accent.primary};
  }
`;

// Keyword insights section
const KeywordTable = styled.div`
  background: ${props => props.theme.components.card.bg};
  border-radius: 16px;
  box-shadow: ${props => props.theme.components.card.shadow};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  animation: ${fadeIn} 0.8s ease-out forwards;
  margin-top: 32px;
  width: 100%;
  position: relative;
  border: 1px solid ${props => props.theme.components.card.border};
  
  @media (max-width: 768px) {
    margin-top: 24px;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    margin-top: 20px;
    border-radius: 8px;
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 2fr 1.2fr 1.5fr;
  padding: 16px 24px;
  background: ${props => props.theme.components.card.bg};
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  font-weight: 600;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  min-width: 1000px;
  
  @media (max-width: 1200px) {
    display: none;
  }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: 12px;
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 2fr 1.2fr 1.5fr;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border.divider};
  align-items: center;
  transition: all 0.2s ease;
  min-width: 1000px;
  
  &:hover {
    background-color: ${props => props.theme.colors.bg.hover};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 1200px) {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px 20px;
  }
  
  @media (max-width: 768px) {
    min-width: 950px;
    padding: 12px 16px;
  }
`;

const TableCell = styled.div`
  display: flex;
  align-items: center;
  
  @media (max-width: 1200px) {
    flex: 1 0 50%;
    &:first-child {
      flex: 1 0 100%;
      font-weight: 600;
      margin-bottom: 8px;
    }
  }
`;

const KeywordCell = styled(TableCell)`
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const NumericCell = styled(TableCell)`
  font-weight: 600;
  color: ${props => props.theme.colors.text.secondary};
`;

// Video links styling
const VideoLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  @media (max-width: 1200px) {
    gap: 6px;
  }
  
  @media (max-width: 768px) {
    gap: 4px;
  }
`;

const VideoLink = styled.a`
  color: ${props => props.theme.colors.text.link};
  font-size: 14px;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(4px);
    color: ${props => props.theme.colors.text.linkHover};
  }
  
  svg {
    margin-right: 6px;
    font-size: 0.9rem;
    color: ${props => props.theme.colors.text.link};
  }
  
  @media (max-width: 1200px) {
    font-size: 12px;
  }
  
  @media (max-width: 768px) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

// Tags styling
const CategoryTag = styled.span`
  background: ${props => props.theme.colors.accent.primary};
  color: ${props => props.theme.colors.text.inverse};
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
  box-shadow: ${props => props.theme.shadows.sm};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
  
  @media (max-width: 1200px) {
    padding: 5px 10px;
    font-size: 11px;
  }
  
  @media (max-width: 768px) {
    padding: 4px 8px;
    max-width: 80px;
  }
`;

const AudienceTag = styled.span`
  background-color: ${props => props.theme.colors.bg.tertiary};
  color: ${props => props.theme.colors.text.primary};
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
  
  @media (max-width: 1200px) {
    padding: 3px 8px;
    font-size: 11px;
  }
  
  @media (max-width: 768px) {
    padding: 2px 6px;
    max-width: 100px;
  }
`;

// Quick stat components
const QuickStatRow = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const QuickStat = styled.div`
  flex: 1;
  padding: 20px;
  background: ${props => props.theme.components.card.bg};
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  text-align: center;
  animation: ${fadeIn} 0.6s ease-out forwards;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  @media (max-width: 768px) {
    padding: 16px;
    border-radius: 16px;
    margin-bottom: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 14px;
  }
`;

const QuickStatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['3xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 8px;
`;

const QuickStatLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const IconStack = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 12px;
`;

const IconCircle = styled.div<{ size: number; color: string; index: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  background: ${props => props.color};
  opacity: ${props => 0.2 + (props.index * 0.2)};
  animation: ${pulse} 3s infinite;
  animation-delay: ${props => props.index * 0.5}s;
`;

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${props => props.theme.colors.primary};
  font-size: 24px;
  z-index: 2;
`;

// Content header section for cards
const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 20px;
  }
`;

const ContentTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    color: ${props => props.theme.colors.accent.primary};
  }
  
  @media (max-width: 768px) {
    font-size: ${props => props.theme.fontSizes.lg};
  }
  
  @media (max-width: 480px) {
    font-size: ${props => props.theme.fontSizes.md};
    gap: 8px;
  }
`;

// Search and filter components
const SearchBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    width: 100%;
    margin-bottom: 16px;
    flex-direction: row;
    align-items: center;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
`;

const SearchInput = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  @media (max-width: 768px) {
    max-width: 70%;
  }
  
  @media (max-width: 480px) {
    max-width: 100%;
    width: 100%;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.darkGrey};
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid ${props => props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

// Tipos e configurações para os cards serão definidos dinamicamente com base nos dados reais

// Component types
type TimeframeType = 'day' | 'week' | 'month' | 'year';
type DataViewType = 'overview' | 'performance' | 'traffic' | 'keywords';

// Helper function to render icons safely
const renderIcon = (iconName: string) => {
  const Icon = FaIcons[iconName as keyof typeof FaIcons] as IconType;
  // Use the imported IconComponent helper instead of direct createElement
  return Icon ? <IconComponent icon={Icon} /> : null;
};

// Main component
const Overview: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentProject, hasProjects, projectIntegrations, onboardingStep, setCurrentProject } = useProject();
  const { t } = useLanguage();
  const [activeChart, setActiveChart] = useState<'line' | 'bar'>('line');
  const [activeMetrics, setActiveMetrics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [greeting, setGreeting] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  // Função para buscar o nome do usuário
  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Tentamos obter o nome do usuário
        const name = user.user_metadata?.name || user.email?.split('@')[0] || '';
        setUserName(name);
      }
    } catch (error) {
      console.error("Erro ao buscar nome do usuário:", error);
    }
  };
  
  // Função para determinar o cumprimento com base no horário
  const getGreeting = () => {
    const now = new Date();
    const hours = now.getHours();
    
    let greetingText = '';
    
    // Determinar o cumprimento com base na hora do dia
    if (hours >= 5 && hours < 12) {
      greetingText = 'Good morning';
    } else if (hours >= 12 && hours < 18) {
      greetingText = 'Good afternoon';
    } else {
      greetingText = 'Good evening';
    }
    
    // Adicionar variações especiais para momentos específicos
    if (hours >= 0 && hours < 5) {
      greetingText = 'Working late';
    } else if (hours === 12) {
      greetingText = 'Time for lunch';
    } else if (hours >= 22) {
      greetingText = 'Late hours productivity';
    }
    
    setGreeting(greetingText);
  };
  
  // Chamar a função de cumprimento quando o componente montar
  useEffect(() => {
    getGreeting();
    fetchUserName();
    
    // Atualizar o cumprimento a cada minuto para casos de transição entre períodos
    const intervalId = setInterval(() => {
      getGreeting();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Use o hook personalizado para buscar dados do Supabase
  const { 
    loading, 
    error, 
    statsData, 
    performanceData, 
    weeklyPerformanceData,
    trafficSources, 
    keywordsTable, 
    timeframe,
    setTimeframe,
    hasValidData
  } = useDashboardData();
  
  // Function to handle new project creation
  const handleAddProject = async (project: any) => {
    console.log("Função handleAddProject chamada", project);
    
    try {
      // Get current user email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.email) {
        console.error("User not authenticated");
        return;
      }
      
      // Format the description field properly
      const formattedDescription = `Company or product name: ${project.company} Audience description: ${project.audience}`;
      
      const { data, error } = await supabase
        .from('Projeto')
        .insert([{ 
          "Project name": project.name,
          "description service": formattedDescription,
          "url service": project.link,
          "Keywords": project.keywords,
          "User id": currentUser.id,
          "user": currentUser.email
        }])
        .select();
      
      if (error) {
        console.error("Erro ao inserir projeto no Supabase:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        // Update current project to the newly created one
        console.log("Projeto criado com sucesso:", data[0]);
        setCurrentProject(data[0]);
      }
      
      // Fechar o modal
      setShowProjectModal(false);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      alert("Erro ao criar projeto. Por favor, tente novamente.");
    }
  };
  
  // States originais que ainda são necessários
  const [dataView, setDataView] = useState<DataViewType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // LED Animation States
  const [activeLeds, setActiveLeds] = useState<Record<number, boolean>>({
    0: false, // Reach
    1: false, // Activities
    2: false, // Total Engagements
    3: false  // LEDs
  });
  
  // Função para lidar com ações dos estados vazios
  const handleEmptyStateAction = () => {
    switch (onboardingStep) {
      case 1: // Precisa criar projeto
        setShowProjectModal(true);
        break;
      case 2: // Precisa configurar integração
        // Redirecionar para página de integrações
        // Usando window.location.href para forçar uma recarga completa da página
        window.location.href = '/integrations';
        break;
      case 3: // Aguardando dados
        // Não faz nada, só mostra o estado atual
        break;
    }
  };

  // Função para lidar com a criação de projeto
  const handleProjectCreated = async (project: any) => {
    try {
      // Get current user email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.email) {
        console.error("User not authenticated");
        return;
      }
      
      // Format the description field properly
      const formattedDescription = `Company or product name: ${project.company} Audience description: ${project.audience}`;
      
      const { data, error } = await supabase
        .from('Projeto')
        .insert([{ 
          "Project name": project.name,
          "description service": formattedDescription,
          "url service": project.link,
          "Keywords": project.keywords,
          "User id": currentUser.id,
          "user": currentUser.email
        }])
        .select();
      
      if (error) throw error;
      
      setShowProjectModal(false);
      window.location.reload(); // Recarregar a página para atualizar os estados
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };
  
  // Data flow animation - more subtle and professional tech-inspired sequence
  useEffect(() => {
    // Initial delay to start animation after component mounts
    const startDelay = setTimeout(() => {
      // Professional data flow effect
      const sequence = [
        // Standard flow pattern - sequential activation
        () => setActiveLeds(prev => ({ ...prev, 0: true, 1: false, 2: false, 3: false })),
        () => setActiveLeds(prev => ({ ...prev, 0: true, 1: true, 2: false, 3: false })),
        () => setActiveLeds(prev => ({ ...prev, 0: true, 1: true, 2: true, 3: false })),
        () => setActiveLeds(prev => ({ ...prev, 0: true, 1: true, 2: true, 3: true })),
        
        // Hold the complete data path briefly 
        () => setActiveLeds(prev => ({ ...prev, 0: true, 1: true, 2: true, 3: true })),
        
        // Sequential deactivation
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: true, 2: true, 3: true })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: true, 3: true })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: false, 3: true })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: false, 3: false })),
        
        // Brief pause
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: false, 3: false })),

        // Secondary data processing pattern - shows individual processing
        () => setActiveLeds(prev => ({ ...prev, 0: true, 1: false, 2: false, 3: false })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: true, 2: false, 3: false })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: true, 3: false })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: false, 3: true })),
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: false, 3: false })),

        // End of processing cycle
        () => setActiveLeds(prev => ({ ...prev, 0: false, 1: false, 2: false, 3: false }))
      ];
      
      // More professional timing sequence (in ms)
      const timings = [
        0,     // Start at Reach
        800,   // Activate Activities
        1600,  // Activate Total Engagements
        2400,  // Activate LEDs
        
        4000,  // Hold complete data path
        
        5500,  // Start sequential shutdown
        6000,  // Continue shutdown 
        6500,  // Continue shutdown
        7000,  // Complete shutdown
        
        9000,  // Pause before next pattern
        
        11000, // Individual component processing - Reach
        12000, // Individual component processing - Activities
        13000, // Individual component processing - Total Engagements
        14000, // Individual component processing - LEDs
        15000, // End individual processing
        
        18000  // Reset for next cycle
      ];
      
      // Setup the animation sequence
      const timers = sequence.map((action, index) => 
        setTimeout(action, timings[index])
      );
      
      // Create an interval to repeat the entire sequence
      const interval = setInterval(() => {
        sequence.forEach((action, index) => 
          setTimeout(action, timings[index])
        );
      }, 20000); // Repeat every 20 seconds for a more professional, less distracting cycle
      
      // Cleanup all timers on component unmount
      return () => {
        clearTimeout(startDelay);
        timers.forEach(timer => clearTimeout(timer));
        clearInterval(interval);
      };
    }, 3000); // Longer initial delay for a less distracting start
    
    return () => clearTimeout(startDelay);
  }, []);
  
  // Modern business-focused loading animation
  const GlowPulse = keyframes`
    0% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
    50% { box-shadow: 0 0 40px rgba(33, 150, 243, 0.5); }
    100% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
  `;

  const CountUp = keyframes`
    from { width: 0%; }
    to { width: 100%; }
  `;
  
  const DealPulse = keyframes`
    0% { transform: scale(0.96); }
    50% { transform: scale(1); }
    100% { transform: scale(0.96); }
  `;

  const DataFlow = keyframes`
    0% { stroke-dashoffset: 1000; }
    100% { stroke-dashoffset: 0; }
  `;

  const LoadingAnimation = styled.div`
    width: 100%;
    height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    background: ${props => props.theme.components.card.bg};
    overflow: hidden;
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes progress {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.7; }
      50% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.7; }
    }
    
    @keyframes glow {
      0% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
      50% { box-shadow: 0 0 40px rgba(33, 150, 243, 0.5); }
      100% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
    }
  `;

  const LoadingPulse = keyframes`
    0% { transform: scale(0.95); opacity: 0.7; }
    50% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.7; }
  `;

  const LoadingBars = keyframes`
    0% { height: 5%; }
    50% { height: 85%; }
    100% { height: 5%; }
  `;
  
  const StockTicker = keyframes`
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  `;

  const LoadingText = styled.div`
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #1976D2;
    margin-bottom: 40px;
    background: linear-gradient(90deg, #1976D2, #2196F3, #00BCD4, #0288D1);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ${css`${shimmer}`} 2s linear infinite;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #2196F3, transparent);
      animation: ${CountUp} 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
    }
  `;

  const LoadingChart = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 6px;
    height: 150px;
    width: 300px;
    padding: 20px;
    position: relative;
    background: rgba(236, 239, 241, 0.3);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    perspective: 1000px;
    transform-style: preserve-3d;
    transform: rotateX(10deg);
  `;

  const LoadingBar = styled.div<{ delay: number }>`
    width: 16px;
    background: linear-gradient(180deg, #1976D2, #2196F3);
    border-radius: 4px 4px 0 0;
    animation: ${LoadingBars} 1.3s ease-in-out infinite;
    animation-delay: ${props => props.delay}s;
    box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
    position: relative;
    z-index: 2;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 0 0 4px 4px;
    }
  `;

  const LeadCount = styled.div`
    position: absolute;
    top: -30px;
    right: 20px;
    font-size: 24px;
    font-weight: 700;
    color: #1976D2;
    background: #E3F2FD;
    padding: 3px 12px;
    border-radius: 20px;
    border: 2px solid rgba(33, 150, 243, 0.3);
    box-shadow: 0 2px 10px rgba(33, 150, 243, 0.15);
    animation: ${DealPulse} 2s ease-in-out infinite;
    
    &::before {
      content: 'LEADS';
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      font-weight: 600;
      color: #1976D2;
      letter-spacing: 1px;
    }
  `;

  const StockTickerContainer = styled.div`
    position: absolute;
    bottom: 20px;
    left: 0;
    width: 100%;
    height: 32px;
    overflow: hidden;
    background: rgba(33, 150, 243, 0.05);
    border-top: 1px solid rgba(33, 150, 243, 0.1);
    border-bottom: 1px solid rgba(33, 150, 243, 0.1);
  `;

  const StockTickerContent = styled.div`
    display: flex;
    gap: 40px;
    padding: 0 20px;
    white-space: nowrap;
    animation: ${StockTicker} 20s linear infinite;
    width: fit-content;
  `;

  const StockItem = styled.div`
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: #424242;
    
    span {
      margin-left: 6px;
      font-weight: 700;
      color: #4CAF50;
    }
    
    &.negative span {
      color: #F44336;
    }
  `;

  const LoadingPie = styled.div`
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: conic-gradient(
      #1976D2 0% 15%,
      #4CAF50 15% 32%,
      #00BCD4 32% 48%,
      #FFC107 48% 64%,
      #FF5722 64% 80%,
      #9C27B0 80% 90%,
      #E91E63 90% 100%
    );
    position: relative;
    margin-top: 30px;
    animation: ${LoadingPulse} 2s ease-in-out infinite, ${GlowPulse} 4s ease-in-out infinite;
    box-shadow: 0 5px 25px rgba(33, 150, 243, 0.3);
    transform-style: preserve-3d;
    transform: perspective(800px) rotateY(15deg);
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 65px;
      height: 65px;
      background: ${props => props.theme.components.card.bg};
      border-radius: 50%;
      box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    &::before {
      content: '72%';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      font-weight: 700;
      color: #1976D2;
      z-index: 2;
    }
  `;

  const LoadingDot = styled.div`
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.theme.colors.accent.primary};
    filter: blur(1px);
    box-shadow: 0 0 8px ${props => props.theme.colors.accent.primary}99;
  `;

  const LoadingRipple = keyframes`
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  `;

  const LoadingRing = styled.div`
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    border: 2px solid rgba(33, 150, 243, 0.1);
    
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: #2196F3;
      border-right-color: #2196F3;
      animation: spin 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  const BusinessMetric = styled.div`
    position: absolute;
    padding: 10px 15px;
    background: ${props => props.theme.components.card.bg};
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: #424242;
    border-left: 3px solid #1976D2;
    animation: ${DealPulse} 3s ease-in-out infinite;
    z-index: 10;
    
    span {
      font-size: 18px;
      font-weight: 700;
      color: #1976D2;
      margin-top: 4px;
    }
  `;

  // Definir as animações fora do render
  const getRandomDotStyles = (i: number) => {
    const topPos = Math.random() * 70 + 15;
    const leftPos = Math.random() * 70 + 15;
    const opacity = Math.random() * 0.5 + 0.3;
    const scale = Math.random() * 1.5 + 0.5;
    const delay = Math.random() * 2;
    const duration = Math.random() * 2 + 1;
    
    return {
      top: `${topPos}%`,
      left: `${leftPos}%`,
      opacity,
      transform: `scale(${scale})`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`
    };
  };

  // Partículas com animações pre-definidas
  const LoadingDotAnimated = styled(LoadingDot)`
    animation: ${LoadingRipple} linear infinite;
  `;

  // Shimmer effect foi movido para inline para simplificar o código

  // Gráficos de amostra para animação de carregamento
  const samplePerformanceData = [
    { name: 'Jan', views: 400, engagement: 240, leads: 100 },
    { name: 'Feb', views: 300, engagement: 139, leads: 80 },
    { name: 'Mar', views: 500, engagement: 280, leads: 150 },
    { name: 'Apr', views: 280, engagement: 190, leads: 70 },
    { name: 'May', views: 390, engagement: 230, leads: 120 },
    { name: 'Jun', views: 490, engagement: 340, leads: 180 }
  ];
  
  // Estado para controlar o progresso de carregamento
  const [loadProgress, setLoadProgress] = useState(0);
  
  const sampleTrafficData = [
    { name: 'YouTube', value: 400, color: theme.colors.accent.primary },
    { name: 'Facebook', value: 300, color: theme.colors.accent.secondary },
    { name: 'Instagram', value: 300, color: theme.colors.accent.tertiary },
    { name: 'TikTok', value: 200, color: theme.colors.status.warning },
    { name: 'Twitter', value: 100, color: theme.colors.status.info }
  ];
  
  // Animação de progresso de carregamento
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadProgress((prev) => {
          const increment = 5 + Math.random() * 15; // Incremento entre 5 e 20
          const next = prev + increment;
          
          // Não deixa o progresso passar de 95% durante o carregamento
          return Math.min(next, 95);
        });
      }, 800);
      
      return () => clearInterval(interval);
    } else {
      // Quando o carregamento terminar, completa rapidamente até 100%
      setLoadProgress(100);
    }
  }, [loading]);
  
  // Renderização condicional com base no estado de onboarding
  // Se o usuário estiver em qualquer etapa do onboarding, apenas mostrar a EmptyState relevante
  // e esconder todo o resto do dashboard para um fluxo mais focado
  if (onboardingStep < 4) {
    // Animações para o fundo, copiadas do componente Login
    const waveAnimation = keyframes`
      0% {
        transform: translateX(-100%) scaleY(1);
      }
      50% {
        transform: translateX(-50%) scaleY(0.9);
      }
      100% {
        transform: translateX(0%) scaleY(1);
      }
    `;

    const lightBeamAnimation = keyframes`
      0% {
        opacity: 0;
        transform: translateX(-100%) skewX(-15deg);
      }
      20% {
        opacity: 0.7;
      }
      40% {
        opacity: 0.5;
      }
      60% {
        opacity: 0.7;
      }
      80% {
        opacity: 0.2;
      }
      100% {
        opacity: 0;
        transform: translateX(100%) skewX(-15deg);
      }
    `;

    const energyPulse = keyframes`
      0% {
        opacity: 0.4;
        box-shadow: 0 0 10px #4E0EB3,
                  0 0 20px #2D1D42;
      }
      50% {
        opacity: 0.8;
        box-shadow: 0 0 20px #4E0EB3,
                  0 0 40px #2D1D42,
                  0 0 60px #4E0EB3;
      }
      100% {
        opacity: 0.4;
        box-shadow: 0 0 10px #4E0EB3,
                  0 0 20px #2D1D42;
      }
    `;

    // Container principal de onboarding
    const OnboardingContainer = styled.div`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100%;
      padding: 20px;
      position: relative;
      overflow: hidden;
    `;

    // Removidos elementos de animação de fundo
    const WaveElement = styled.div`
      display: none;
    `;

    // Removidos raios de luz
    const LightBeam = styled.div`
      display: none;
    `;

    // Animação para os fios de luz
    const glowLine = keyframes`
      0% {
        opacity: 0.3;
        box-shadow: 0 0 4px rgba(78, 14, 179, 0.5);
      }
      50% {
        opacity: 0.7;
        box-shadow: 0 0 8px rgba(78, 14, 179, 0.8), 0 0 12px rgba(45, 29, 66, 0.5);
      }
      100% {
        opacity: 0.3;
        box-shadow: 0 0 4px rgba(78, 14, 179, 0.5);
      }
    `;

    // Fios de conexão que aparecem atrás dos elementos
    const ConnectionLine = styled.div`
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${props => props.theme.colors.primary};
      animation: ${energyPulse} 4s ease-in-out infinite;
      z-index: 0;
      pointer-events: none;
      opacity: 0.6;
      box-shadow: 0 0 10px rgba(78, 14, 179, 0.3);
      
      &::before, &::after {
        content: '';
        position: absolute;
        height: 1px;
        background: linear-gradient(90deg, 
          rgba(78, 14, 179, 0.1) 0%, 
          rgba(78, 14, 179, 0.3) 50%, 
          rgba(78, 14, 179, 0.1) 100%
        );
        opacity: 0.4;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
      }
      
      &::before {
        left: -100%;
        width: 120px;
      }
      
      &::after {
        right: -100%;
        width: 150px;
      }
      
      &:nth-child(1) {
        top: 10%;
        left: 8%;
        animation-delay: 0.5s;
        width: 4px;
        height: 4px;
      }
      
      &:nth-child(2) {
        top: 30%;
        right: 12%;
        animation-delay: 1.5s;
        width: 5px;
        height: 5px;
      }
      
      &:nth-child(3) {
        top: 70%;
        left: 15%;
        animation-delay: 1s;
        width: 4px;
        height: 4px;
      }
      
      &:nth-child(4) {
        top: 88%;
        right: 22%;
        animation-delay: 2s;
        width: 3px;
        height: 3px;
      }
      
      &:nth-child(5) {
        top: 50%;
        left: 30%;
        animation-delay: 0.7s;
        width: 3px;
        height: 3px;
      }
      
      &:nth-child(6) {
        top: 20%;
        left: 40%;
        animation-delay: 1.2s;
        width: 4px;
        height: 4px;
      }
      
      &:nth-child(7) {
        top: 35%;
        left: 70%;
        animation-delay: 0.9s;
        width: 4px;
        height: 4px;
      }
      
      &:nth-child(8) {
        top: 80%;
        left: 60%;
        animation-delay: 1.8s;
        width: 3px;
        height: 3px;
      }
    `;

    // Nós de energia que pulsam com luz
    const EnergyNode = styled.div`
      display: none;
    `;

    // Wrapper para o conteúdo visível, acima das animações
    const ContentWrapper = styled.div`
      width: 100%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
    `;
    
    // Etapa 1: Criar projeto - Redirecionar para a página dedicada
    if (onboardingStep === 1 && !hasProjects) {
      // Redirecionar para a página dedicada de criação de projeto
      // somente se não tiver projetos
      navigate('/create-project');
      return null;
    }
    
    // Etapa 2: Configurar integrações
    if (onboardingStep === 2) {
      return (
        <OnboardingContainer>
          {/* Conteúdo principal */}
          <ContentWrapper>
            <EmptyState 
              type="integration" 
              onAction={handleEmptyStateAction}
              currentStep={onboardingStep} 
            />
          </ContentWrapper>
        </OnboardingContainer>
      );
    }
    
    // Etapa 3: Aguardando dados
    if (onboardingStep === 3) {
      return (
        <OnboardingContainer>
          {/* Conteúdo principal */}
          <ContentWrapper>
            <EmptyState 
              type="data" 
              onAction={handleEmptyStateAction}
              currentStep={onboardingStep} 
            />
            <div style={{
              width: '100%',
              background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(240, 240, 250, 0.4)',
              borderRadius: '8px',
              padding: '4px',
              margin: '15px 0',
              boxShadow: theme.name === 'dark' ? 'inset 0 1px 3px rgba(0, 0, 0, 0.5)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 2
            }}>
              <ShimmerBar />
              <div style={{
                textAlign: 'center',
                marginTop: '10px',
                fontSize: '14px',
                color: theme.colors.text.secondary,
                position: 'relative',
                zIndex: 2
              }}>
                Analisando menções...
              </div>
            </div>
          </ContentWrapper>
        </OnboardingContainer>
      );
    }
    
    return null; // Nunca deve chegar aqui, mas precaução
  }
  
  // Mostrar animação de carregamento com gráficos interativos
  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        backgroundColor: theme.colors.bg.primary,
        zIndex: 9999 
      }}>
        <PageContainer style={{ height: '100%' }}>
        <LoadingAnimation style={{ 
          background: theme.name === 'dark' 
            ? `linear-gradient(180deg, ${theme.colors.bg.primary} 0%, ${theme.colors.bg.secondary} 100%)`
            : 'linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%)',
          boxShadow: theme.name === 'dark' ? '0 10px 50px rgba(0, 0, 0, 0.5)' : '0 10px 50px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Texto removido para melhor responsividade */}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            width: '100%',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '12px'
          }}>
            {/* Gráfico animado de área à esquerda */}
            <div style={{
              width: '48%',
              minWidth: '280px',
              height: '280px',
              background: theme.name === 'dark' ? theme.components.card.bg : '#ffffff',
              borderRadius: '12px',
              boxShadow: theme.name === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.06)',
              padding: '12px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <ShimmerOverlay className="loading-shimmer" />
              
              <h3 style={{ marginBottom: '12px', color: theme.colors.text.primary, fontSize: '14px' }}>Performance Overview</h3>
              
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={samplePerformanceData}>
                  <defs>
                    <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.colors.accent.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={theme.colors.accent.primary} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.colors.accent.secondary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={theme.colors.accent.secondary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.primary} />
                  <XAxis dataKey="name" tick={{ fill: theme.colors.text.secondary }} />
                  <YAxis tick={{ fill: theme.colors.text.secondary }} />
                  <Tooltip 
                    contentStyle={{
                      background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${theme.colors.border.primary}`,
                      borderRadius: '8px',
                      boxShadow: theme.colors.shadow.md
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="videos" 
                    stroke={theme.colors.accent.primary} 
                    fill="url(#colorVideos)" 
                    activeDot={{ r: 8 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke={theme.colors.accent.secondary} 
                    fill="url(#colorEngagement)" 
                    activeDot={{ r: 8 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Gráfico de pizza à direita */}
            <div style={{
              width: '48%',
              minWidth: '280px',
              height: '280px',
              background: theme.name === 'dark' ? theme.components.card.bg : '#ffffff',
              borderRadius: '12px',
              boxShadow: theme.name === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.06)',
              padding: '12px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <ShimmerOverlay className="loading-shimmer" />
              
              <h3 style={{ marginBottom: '12px', color: theme.colors.text.primary, fontSize: '14px' }}>Traffic Sources</h3>
              
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={sampleTrafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sampleTrafficData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${theme.colors.border.primary}`,
                      borderRadius: '8px',
                      boxShadow: theme.colors.shadow.md
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Barra de progresso de carregamento */}
          <div style={{
            width: '90%',
            maxWidth: '600px',
            margin: '24px auto 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '100%',
              height: '6px',
              background: theme.colors.border.primary,
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                height: '100%',
                width: `${loadProgress}%`,
                background: `linear-gradient(90deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                borderRadius: '3px',
                boxShadow: `0 0 10px ${theme.colors.accent.primary}33`,
                transition: 'width 0.5s ease-out'
              }} />
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.colors.text.secondary,
              fontWeight: 500
            }}>
              {`${Math.round(loadProgress)}%`}
            </div>
          </div>
          
          {/* Partículas sutis e elegantes */}
          {[...Array(8)].map((_, i) => (
            <LoadingDotAnimated 
              key={i}
              style={{
                ...getRandomDotStyles(i),
                opacity: 0.2,
                boxShadow: `0 0 12px ${theme.colors.accent.primary}4D`
              }}
            />
          ))}
        </LoadingAnimation>
      </PageContainer>
      </div>
    );
  }
  
  // Animação de erro moderna
  const ErrorAnimation = keyframes`
    0% { transform: scale(1); }
    10% { transform: scale(1.1); }
    20% { transform: scale(1); }
    100% { transform: scale(1); }
  `;

  const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 70vh;
    text-align: center;
    padding: 50px 20px;
    position: relative;
    overflow: hidden;
  `;

  const ErrorIcon = styled.div`
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff5252, #d32f2f);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30px;
    position: relative;
    animation: ${ErrorAnimation} 2s ease-in-out infinite;
    box-shadow: 0 10px 30px rgba(211, 47, 47, 0.3);
    
    &::before, &::after {
      content: '';
      position: absolute;
      background: ${props => props.theme.components.card.bg};
      border-radius: 4px;
    }
    
    &::before {
      width: 10px;
      height: 50px;
      transform: rotate(45deg);
    }
    
    &::after {
      width: 10px;
      height: 50px;
      transform: rotate(-45deg);
    }
  `;

  const ErrorTitle = styled.h3`
    font-size: 28px;
    font-weight: 600;
    color: ${props => props.theme.name === 'dark' ? '#ff6b6b' : '#d32f2f'};
    margin-bottom: 15px;
  `;

  const ErrorMessage = styled.div`
    font-size: 16px;
    color: ${props => props.theme.colors.text.secondary};
    max-width: 500px;
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(211, 47, 47, 0.05)'};
    padding: 20px;
    border-radius: 12px;
    border-left: 4px solid ${props => props.theme.name === 'dark' ? '#ff6b6b' : '#d32f2f'};
    text-align: left;
    position: relative;
    
    &::before {
      content: '!';
      position: absolute;
      top: -10px;
      left: -12px;
      width: 24px;
      height: 24px;
      background: ${props => props.theme.name === 'dark' ? '#ff6b6b' : '#d32f2f'};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
  `;

  const ErrorParticle = styled.div`
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(211, 47, 47, 0.3)'};
  `;

  // Helper para gerar estilos aleatórios para partículas de erro
  const getRandomErrorParticleStyles = (i: number) => {
    const topPos = Math.random() * 70 + 15;
    const leftPos = Math.random() * 80 + 10;
    const opacity = Math.random() * 0.5 + 0.3;
    const scale = Math.random() * 1.5 + 0.5;
    const delay = Math.random() * 2;
    const duration = Math.random() * 3 + 2;
    
    return {
      top: `${topPos}%`,
      left: `${leftPos}%`,
      opacity,
      transform: `scale(${scale})`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`
    };
  };

  // Partículas com animações pre-definidas
  const ErrorParticleAnimated = styled(ErrorParticle)`
    animation: ${LoadingRipple} linear infinite;
  `;

  // Mostrar erro com animação moderna
  if (error) {
    return (
      <PageContainer>
        <ErrorContainer>
          <ErrorIcon />
          <ErrorTitle>Error Loading Data</ErrorTitle>
          <ErrorMessage>{error}</ErrorMessage>
          
          {/* Partículas de erro */}
          {[...Array(12)].map((_, i) => (
            <ErrorParticleAnimated
              key={i}
              style={getRandomErrorParticleStyles(i)}
            />
          ))}
        </ErrorContainer>
      </PageContainer>
    );
  }
  
  // Animação para "nenhum projeto" moderna
  const EmptyAnimation = keyframes`
    0% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
    100% { transform: translateY(0); }
  `;

  const EmptyContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 70vh;
    text-align: center;
    padding: 50px 20px;
    background: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(103, 58, 183, 0.01)'};
    border-radius: 16px;
    position: relative;
    overflow: hidden;
  `;

  const EmptyIcon = styled.div`
    width: 150px;
    height: 150px;
    margin-bottom: 30px;
    position: relative;
    animation: ${EmptyAnimation} 3s ease-in-out infinite;
    display: flex;
    justify-content: center;
    align-items: center;
    
    svg {
      width: 100%;
      height: 100%;
      color: ${props => props.theme.name === 'dark' ? '#00a9db' : '#673AB7'};
      opacity: 0.7;
    }
  `;

  const EmptyTitle = styled.h3`
    font-size: 28px;
    font-weight: 600;
    background: linear-gradient(90deg, ${props => props.theme.name === 'dark' ? '#00a9db' : '#673AB7'}, #2196F3);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 15px;
  `;

  const EmptyMessage = styled.p`
    font-size: 18px;
    color: ${props => props.theme.colors.text.secondary};
    margin-bottom: 30px;
  `;

  const EmptyButton = styled.button`
    padding: 12px 24px;
    background: linear-gradient(135deg, ${props => props.theme.name === 'dark' ? '#00a9db' : '#673AB7'} 0%, #2196F3 100%);
    color: white;
    border: none;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px ${props => props.theme.name === 'dark' ? 'rgba(0, 169, 219, 0.3)' : 'rgba(103, 58, 183, 0.3)'};
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px ${props => props.theme.name === 'dark' ? 'rgba(0, 169, 219, 0.4)' : 'rgba(103, 58, 183, 0.4)'};
    }
  `;

  const GridPattern = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: linear-gradient(${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(103, 58, 183, 0.03)'} 1px, transparent 1px),
                     linear-gradient(90deg, ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(103, 58, 183, 0.03)'} 1px, transparent 1px);
    background-size: 20px 20px;
    z-index: -1;
  `;

  const Dots = styled.div`
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.theme.name === 'dark' ? 'rgba(0, 169, 219, 0.2)' : 'rgba(103, 58, 183, 0.2)'};
  `;

  // Helper para gerar estilos aleatórios para pontos decorativos
  const getRandomDotPosition = (i: number) => {
    const topPos = Math.random() * 90 + 5;
    const leftPos = Math.random() * 90 + 5;
    const opacity = Math.random() * 0.7 + 0.1;
    const scale = Math.random() * 1.5 + 0.5;
    
    return {
      top: `${topPos}%`,
      left: `${leftPos}%`,
      opacity,
      transform: `scale(${scale})`
    };
  };

  // Se não houver projeto selecionado
  if (!currentProject) {
    return (
      <PageContainer>
        <EmptyContainer>
          
          <EmptyIcon>
            <IconComponent icon={FaIcons.FaProjectDiagram} />
          </EmptyIcon>
          
          <EmptyTitle>No Project Selected</EmptyTitle>
          <EmptyMessage>Select a project to view the dashboard data.</EmptyMessage>
          
          <EmptyButton 
            onClick={() => {
              console.log("Botão Create New Project clicado");
              setShowProjectModal(true);
            }}
          >
            <IconComponent icon={FaIcons.FaPlus} style={{ marginRight: '8px' }} />
            Create New Project
          </EmptyButton>
          
          {/* Pontos decorativos */}
          {[...Array(20)].map((_, i) => (
            <Dots
              key={i}
              style={getRandomDotPosition(i)}
            />
          ))}
        </EmptyContainer>
        
        {/* Project Modal */}
        <ProjectModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSave={handleAddProject}
        />
      </PageContainer>
    );
  }
  
  // Configuração dos cards com dados reais
  const statsCards = [
    {
      id: 1,
      title: 'Channels',
      value: statsData.reach.value,
      icon: 'FaFileAlt',
      color: COLORS.INFO, // Azul padrão do sistema para canais
      description: 'Active channels',
      trend: statsData.reach.trend
    },
    {
      id: 2,
      title: 'Videos',
      value: statsData.activities.value,
      icon: 'FaComments',
      color: '#9C27B0', // Roxo para vídeos
      description: 'Total videos',
      trend: statsData.activities.trend
    },
    {
      id: 3,
      title: 'Total Mentions',
      value: statsData.engagements.value,
      icon: 'FaStar',
      color: COLORS.WARNING, // Laranja padrão para menções totais
      description: 'All time mentions',
      trend: statsData.engagements.trend
    },
    {
      id: 4,
      title: 'Today\'s Mentions',
      value: statsData.leads.value,
      icon: 'FaUserCheck',
      color: COLORS.SUCCESS, // Verde padrão do sistema para menções de hoje
      description: 'Mentions today',
      trend: statsData.leads.trend
    }
  ];
  
  // Filter keywords based on search term
  const filteredKeywords = keywordsTable.filter(keyword => 
    searchTerm === '' || 
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    keyword.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <PageContainer>
      <DashboardHeader>
        <PageTitle>
          <div>
            <IconComponent icon={FaIcons.FaChartPie} />
          </div>
          Overview
        </PageTitle>
        
        {/* Componente de saudação */}
        <GreetingContainer>
          <TimeIcon>
            <IconComponent icon={
              greeting.includes('morning') ? FaIcons.FaSun :
              greeting.includes('afternoon') ? FaIcons.FaCloud :
              greeting.includes('evening') ? FaIcons.FaMoon :
              greeting.includes('late') ? FaIcons.FaMoon :
              greeting.includes('lunch') ? FaIcons.FaUtensils :
              FaIcons.FaClock
            } />
          </TimeIcon>
          <GreetingText>
            <strong>{greeting}</strong>, {userName || currentProject?.name?.split(' ')[0] || ''}
          </GreetingText>
        </GreetingContainer>
        
        <ActionButtons>
          <Button variant="outline">
            <IconComponent icon={FaIcons.FaFileExport} />
            Export
          </Button>
          <Button 
            variant="primary"
            onClick={() => {
              console.log("Botão New Project no header clicado");
              setShowProjectModal(true);
            }}
          >
            <IconComponent icon={FaIcons.FaPlus} />
            New Project
          </Button>
        </ActionButtons>
      </DashboardHeader>
      
      {/* Stats Overview Grid */}
      <OverviewGrid>
        {statsCards.map((stat, index) => {          
          return (
            <StatCard 
              key={stat.id} 
              gridSpan={3} 
              cardIndex={index}
              active={!!activeLeds[index as keyof typeof activeLeds]}
            >
            {/* Card inner energy effect */}
            <CardEnergyEffect 
              index={index} 
              active={!!activeLeds[index as keyof typeof activeLeds]} 
            />
            
            {/* LED Animation Elements */}
            {index < 3 && (
              <>
                {/* LED Signal Dot */}
                <LedSignalDot 
                  index={index} 
                  active={!!activeLeds[index as keyof typeof activeLeds]} 
                />
                
                {/* Connection Line */}
                <LedConnectionLine 
                  index={index} 
                  active={!!activeLeds[index as keyof typeof activeLeds] && 
                         !!activeLeds[(index + 1) as keyof typeof activeLeds]} 
                />
                
                {/* Flow Particle */}
                <FlowParticle 
                  index={index} 
                  active={!!activeLeds[index as keyof typeof activeLeds] && 
                         !!activeLeds[(index + 1) as keyof typeof activeLeds]} 
                />
              </>
            )}
            
            {/* Last card only needs the signal dot */}
            {index === 3 && (
              <LedSignalDot 
                index={index} 
                active={!!activeLeds[index as keyof typeof activeLeds]} 
              />
            )}
            
            <StatDisplay>
              <StatContent>
                <StatCardTitle>
                  {stat.title}
                </StatCardTitle>
                {/* StatValue without any color-changing effects */}
                <StatValue>
                  {stat.value}
                </StatValue>
                <StatLabel>
                  {stat.description}
                </StatLabel>
              </StatContent>
              <StatIconContainer>
                <StatIcon 
                  bgColor={stat.color} 
                  animationDelay={`${index * 0.2}s`}
                >
                  {stat.title === 'Total Mentions' && <IconComponent icon={FaIcons.FaStar} />}
                  {stat.title === 'Today\'s Mentions' && <IconComponent icon={FaIcons.FaCalendarDay} />}
                  {stat.title === 'Videos' && <IconComponent icon={FaIcons.FaVideo} />}
                  {stat.title === 'Channels' && <IconComponent icon={FaIcons.FaBroadcastTower} />}
                </StatIcon>
              </StatIconContainer>
            </StatDisplay>
          </StatCard>
            );
          })}
        
        <StatCard 
          gridSpan={6}
          style={{ borderTop: 'none' }}
        >
          <StatCardTitle>
            <IconComponent icon={FaIcons.FaChartPie} />
            Main Channels <span style={{ 
              fontSize: '15px', 
              fontWeight: 'normal', 
              marginLeft: '8px',
              color: theme.colors.text.secondary,
              opacity: 0.9
            }}>
              Top Mentions by Channel
            </span>
          </StatCardTitle>
          <ChartContainer style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                  label={(props: PieLabelRenderProps) => {
                    const RADIAN = Math.PI / 180;
                    const { cx, cy, midAngle, outerRadius, name, value } = props;
                    // Calculando a posição do rótulo fora do gráfico
                    const sin = Math.sin(-RADIAN * midAngle);
                    const cos = Math.cos(-RADIAN * midAngle);
                    
                    // Aumentando a distância em 30px além do raio externo
                    const labelRadius = Number(outerRadius) + 30;
                    const x = Number(cx) + labelRadius * cos;
                    const y = Number(cy) + labelRadius * sin;
                    
                    // Truncar nomes longos
                    const displayName = String(name).length > 15 ? `${String(name).substring(0, 15)}...` : name;
                    
                    // Ajustar o ancoramento do texto com base na posição
                    const textAnchor = cos >= 0 ? 'start' : 'end';
                    
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill={theme.colors.text.primary} 
                        textAnchor={textAnchor}
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight={500}
                      >
                        {`${displayName}: ${value}`}
                      </text>
                    );
                  }}
                  labelLine={(props: any) => {
                    const RADIAN = Math.PI / 180;
                    const { cx, cy, midAngle, outerRadius } = props;
                    
                    const sin = Math.sin(-RADIAN * midAngle);
                    const cos = Math.cos(-RADIAN * midAngle);
                    
                    // Ponto inicial na borda do gráfico
                    const x1 = Number(cx) + Number(outerRadius) * cos;
                    const y1 = Number(cy) + Number(outerRadius) * sin;
                    
                    // Ponto final próximo à label (20px antes)
                    const labelRadius = Number(outerRadius) + 25;
                    const x2 = Number(cx) + labelRadius * cos;
                    const y2 = Number(cy) + labelRadius * sin;
                    
                    return <path d={`M${x1},${y1}L${x2},${y2}`} stroke="#666" strokeDasharray="3,3" />;
                  }}
                  isAnimationActive={true}
                >
                  {trafficSources.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}`, 'Mentions']}
                  contentStyle={{
                    background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${theme.colors.border.primary}`,
                    borderRadius: '8px',
                    boxShadow: theme.shadows.md,
                    color: theme.colors.text.primary
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </StatCard>
        
        <StatCard 
          gridSpan={6}
          style={{ borderTop: 'none' }}
        >
          <StatCardTitle>
            <IconComponent icon={FaIcons.FaChartBar} />
            Weekly Performance
          </StatCardTitle>
          <ChartContainer style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.border.divider} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${theme.colors.border.primary}`,
                    borderRadius: '8px',
                    boxShadow: theme.shadows.md,
                    color: theme.colors.text.primary
                  }}
                />
                <Legend />
                <Bar dataKey="videos" name="Videos" fill={theme.name === 'dark' ? '#42A5F5' : '#1976D2'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="engagement" name="Engagement" fill={theme.name === 'dark' ? '#FFB74D' : '#FF5722'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" name="Mentions" fill={theme.name === 'dark' ? '#66BB6A' : '#2E7D32'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </StatCard>
      </OverviewGrid>
      
      {/* Weekly Performance Chart - Simplified Version */}
      <ChartCard gridSpan={12}>
        <ChartHeader>
          <ChartTitle>
            <IconComponent icon={FaIcons.FaChartLine} />
            Weekly Performance
          </ChartTitle>
        </ChartHeader>
        
        <ChartBody>
          <ChartContainer>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={weeklyPerformanceData} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.border.divider} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: theme.name === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${theme.colors.border.primary}`,
                    borderRadius: '8px',
                    boxShadow: theme.shadows.md,
                    color: theme.colors.text.primary
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="videos" 
                  name="Videos"
                  stroke={theme.name === 'dark' ? '#42A5F5' : '#2196F3'} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: theme.name === 'dark' ? '#42A5F5' : '#2196F3' }}
                  activeDot={{ r: 8, strokeWidth: 0, fill: theme.name === 'dark' ? '#42A5F5' : '#2196F3' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engagement"
                  stroke={theme.name === 'dark' ? '#FFB74D' : '#FF7A30'} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: theme.name === 'dark' ? '#FFB74D' : '#FF7A30' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: theme.name === 'dark' ? '#FFB74D' : '#FF7A30' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke={theme.name === 'dark' ? '#66BB6A' : '#4CAF50'} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: theme.name === 'dark' ? '#66BB6A' : '#4CAF50' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: theme.name === 'dark' ? '#66BB6A' : '#4CAF50' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartBody>
      </ChartCard>
      
      <div style={{ marginTop: '40px' }}></div>
      
      {/* Keywords Insights Section */}
      <ContentHeader style={{ 
        marginBottom: '40px',
        display: 'flex', 
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between' 
      }}>
        <ContentTitle style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '12px',
          fontSize: '22px'
        }}>
          <IconComponent icon={FaIcons.FaHashtag} style={{ color: theme.colors.accent.primary }} />
          <span style={{ fontWeight: 600 }}>Keywords & Insights</span>
        </ContentTitle>
        <AddNewProjectButton 
          onClick={() => {
            console.log("Botão Add New Project clicado");
            setShowProjectModal(true);
          }}
        >
          <IconComponent icon={FaIcons.FaPlus} /> 
          Add New Project
        </AddNewProjectButton>
      </ContentHeader>
      
      {/* Spacing is now handled by the marginBottom in ContentHeader */}
      
      {/* Desktop version - table format */}
      <div style={{ display: 'none' }} className="desktop-keywords-table">
        <KeywordTable>
          <TableHeader>
            <TableCell>Keywords</TableCell>
            {/* <TableCell>Sentiment</TableCell> */}
            <TableCell>Views</TableCell>
            <TableCell>Videos</TableCell>
            <TableCell>Likes</TableCell>
            <TableCell>Top Videos</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Audience</TableCell>
          </TableHeader>
          
          {filteredKeywords.length === 0 ? (
            <TableRow>
              <div style={{ 
                gridColumn: '1 / -1', 
                padding: '40px 0', 
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <div style={{ 
                  fontSize: '48px', 
                  color: '#ccc', 
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'center' 
                }}>
                  <IconComponent icon={FaIcons.FaSearch} />
                </div>
                <h3>No keywords found</h3>
                <p>Try adjusting your search criteria</p>
              </div>
            </TableRow>
          ) : (
            filteredKeywords.map(keyword => (
              <TableRow key={keyword.id}>
                <KeywordCell>{keyword.keyword}</KeywordCell>
                {/* <TableCell>
                  <SentimentIndicator 
                    percentage={keyword.sentiment} 
                    size="small"
                    animated={true} 
                    showIcon={true}
                  />
                </TableCell> */}
                <NumericCell>{keyword.views.toLocaleString()}</NumericCell>
                <NumericCell>{keyword.videos}</NumericCell>
                <NumericCell>{keyword.likes}</NumericCell>
                <TableCell>
                  <VideoLinks>
                    {keyword.topVideos.map((video, index) => (
                      <VideoLink href="#" key={index}>
                        <IconComponent icon={FaIcons.FaPlayCircle} />
                        {video}
                      </VideoLink>
                    ))}
                  </VideoLinks>
                </TableCell>
                <TableCell>
                  <CategoryTag>{keyword.category}</CategoryTag>
                </TableCell>
                <TableCell>
                  <AudienceTag>{keyword.audience}</AudienceTag>
                </TableCell>
              </TableRow>
            ))
          )}
        </KeywordTable>
      </div>
      
      {/* Mobile version - card format */}
      <div className="mobile-keywords-cards" style={{ marginTop: '40px' }}>
        {filteredKeywords.length === 0 ? (
          <div style={{ 
            padding: '40px 0', 
            textAlign: 'center',
            color: '#6c757d',
            background: theme.name === 'dark' ? theme.components.card.bg : '#ffffff',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              fontSize: '48px', 
              color: '#ccc', 
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'center' 
            }}>
              <IconComponent icon={FaIcons.FaSearch} />
            </div>
            <h3>No keywords found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            width: '100%'
          }}>
            {filteredKeywords.map(keyword => (
              <Card 
                key={keyword.id} 
                elevation="low" 
                padding="16px" 
                fullWidth 
                style={{ 
                  marginBottom: '0',
                  /* No borders for Keywords cards */
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  height: '100%'
                }}
                className="keyword-card"
              >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    margin: '0 0 12px 0', 
                    fontWeight: 600,
                    color: theme.colors.text.primary,
                  }}>
                    {keyword.keyword}
                  </h3>
                  
                  {/* Removido bloco de Sentiment */}
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr', 
                    gap: '8px', 
                    marginBottom: '12px',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: theme.colors.accent.primary
                      }}>
                        {keyword.views.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>Views</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: theme.colors.accent.primary
                      }}>
                        {keyword.videos}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>Videos</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: theme.colors.accent.primary
                      }}>
                        {keyword.likes}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>Likes</div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    marginBottom: '12px',
                    flex: '1 0 auto'
                  }}>
                    <p style={{
                      fontSize: '13px',
                      margin: '0 0 6px 0',
                      fontWeight: 500,
                      color: theme.colors.text.secondary
                    }}>
                      Top Videos:
                    </p>
                    <VideoLinks>
                      {keyword.topVideos.slice(0, 3).map((video, index) => (
                        <VideoLink href="#" key={index} style={{
                          padding: '4px 0',
                          fontSize: '12px'
                        }}>
                          <IconComponent icon={FaIcons.FaPlayCircle} style={{ color: theme.colors.accent.primary }} />
                          {video}
                        </VideoLink>
                      ))}
                    </VideoLinks>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'row',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: 'auto'
                  }}>
                    <CategoryTag>{keyword.category}</CategoryTag>
                    <AudienceTag>{keyword.audience}</AudienceTag>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Project Modal */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleAddProject}
      />
    </PageContainer>
  );
};

export default Overview;