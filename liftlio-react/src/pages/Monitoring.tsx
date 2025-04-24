import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { COLORS, withOpacity } from '../styles/colors';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import Card from '../components/Card';
import ButtonUI from '../components/ui/Button';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { useProject } from '../context/ProjectContext';
import { supabase, callRPC } from '../lib/supabaseClient';
import Spinner from '../components/ui/Spinner';

// Shared styled components
const PageContainer = styled.div`
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
  background-color: ${COLORS.DOMINANT}; /* Dominant color (60%) - Cinza médio */
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${COLORS.ACCENT}; /* Accent color (10%) - Azul naval escuro */
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 16px;
    color: #FF0000; /* YouTube red - keeping this as it's platform-specific */
    font-size: 32px;
  }
`;

// Enhanced tab navigation
const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 32px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: ${COLORS.BORDER.DEFAULT};
  }
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  position: relative;
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  color: ${props => props.active ? COLORS.ACCENT : COLORS.TEXT.SECONDARY};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: ${props => props.theme.fontSizes.md};
  
  &:hover {
    color: ${COLORS.ACCENT};
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.active ? COLORS.ACCENT : 'transparent'};
    z-index: 1;
    transition: all 0.3s ease;
  }
`;

const TabIcon = styled.span`
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

// Modern stats cards grid
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 40px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  padding: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
`;

const StatCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #f9fafb;
`;

const StatLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #666;
  display: flex;
  align-items: center;
`;

const StatIconContainer = styled.div<{ color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: ${props => `${props.color}15`};
  color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 18px;
  }
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #333;
  padding: 20px 20px 16px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(247, 250, 255, 0.5));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 1366px) {
    font-size: 24px;
  }
  
  @media (max-width: 992px) {
    font-size: 22px;
  }
`;

const StatChange = styled.div<{ positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.error};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-top: 8px;
`;

const StatLineSpacer = styled.div`
  height: 1px;
  background: ${props => props.theme.colors.lightGrey};
  margin: 16px 0;
`;

const MinimalTrendLine = styled.div`
  height: 40px;
  margin-top: 8px;
`;

// Chart sections styling
const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ChartBody = styled.div`
  padding: 20px 0;
`;

// Modern time selector
const TimeSelector = styled.div`
  display: flex;
  background: ${props => props.theme.colors.tertiary};
  border-radius: ${props => props.theme.radius.pill};
  padding: 4px;
`;

const TimeOption = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? props.theme.colors.secondary : 'transparent'}; /* White (30%) if active */
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.active ? props.theme.shadows.sm : 'none'};
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

// Channel list styling
const ChannelsContainer = styled.div`
  margin-bottom: 32px;
`;

const ChannelsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.primary};
  margin: 0;
`;

const ChannelList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 16px;
`;

// Create a wrapper div that can accept onClick and other interactive props
const ChannelCardWrapper = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 24px;
  border: none;
  border-radius: ${props => props.theme.radius.lg};
  background-color: ${props => props.theme.colors.white};
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.1);
  }
`;

// Criar header do card com badge de status
const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

// Melhorar a estilização do ChannelBadge conforme imagem
const ChannelBadge = styled.div<{ status: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => 
    props.status === 'active' ? '#e6f7ee' : 
    props.status === 'pending' ? '#FFF8E6' : 
    '#f5f5f5'};
  color: ${props => 
    props.status === 'active' ? '#34C759' : 
    props.status === 'pending' ? '#FF9500' : 
    '#999'};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

// Score badge conforme imagem
const ScoreBadge = styled.div`
  background: rgba(52, 199, 89, 0.1);
  color: #34C759;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
    font-size: 12px;
  }
`;

// Layout principal do card (conteúdo)
const CardContent = styled.div`
  display: flex;
  align-items: flex-start;
`;

// Área para a imagem do canal
const ChannelImageWrapper = styled.div`
  margin-right: 16px;
`;

// Imagem do canal em círculo
const ChannelImage = styled.div<{ imageUrl?: string }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-image: ${props => props.imageUrl ? `url(${props.imageUrl})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  background-color: ${props => !props.imageUrl ? '#f5f5f5' : 'transparent'};
  
  svg {
    font-size: 24px;
  }
`;

// Container das informações do canal
const ChannelInfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

// Nome do canal
const ChannelName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
`;

// Grid de estatísticas em duas colunas
const ChannelStatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
`;

// Linha de estatística
const StatRow = styled.div`
  display: flex;
  align-items: center;
`;

// Ícone de estatística
const StatIcon = styled.div`
  color: #666;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    font-size: 16px;
  }
`;

// Texto de estatística
const StatText = styled.div`
  font-size: 14px;
  color: #666;
`;

// Área para o botão "Click to view channel videos"
const ActionArea = styled.div`
  margin-top: 20px;
  display: flex;
  align-items: center;
  color: #007BFF;
  font-size: 14px;
  font-weight: 500;
  
  svg {
    margin-right: 8px;
  }
`;

// Adicionar background cinza apenas para a lateral da foto
const ChannelIconWrapper = styled.div`
  position: relative;
  margin-right: 24px; /* Aumentar margem para dar mais espaço */
  padding: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -100%; /* Estender até a borda esquerda */
    width: calc(100% + 84px); /* Largura ajustada para ocupar toda área esquerda */
    background: #f2f2f2;
    border-radius: ${props => props.theme.radius.lg} 0 0 ${props => props.theme.radius.lg};
    z-index: 0;
  }
`;

// Ajustar ChannelIcon para ser maior
const ChannelIcon = styled.div`
  width: 80px; /* Aumentar de 64px para 80px */
  height: 80px; /* Aumentar de 64px para 80px */
  background: linear-gradient(to right, #f0f0f0, #e0e0e0);
  background-size: cover;
  background-position: center;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px; /* Aumentar de 24px para 30px */
  flex-shrink: 0;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  overflow: hidden;
  position: relative;
  z-index: 1;
`;

const ChannelInfo = styled.div`
  flex: 1;
  min-width: 0; /* Evitar que ultrapasse o container */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding-top: 6px; /* Adicionar um pequeno padding no topo para alinhar com o ícone maior */
`;

const ChannelStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, auto); /* Reduzir de 3 para 2 colunas */
  gap: 16px 24px; /* Aumentar o espaçamento entre as estatísticas */
  align-items: center;
`;

// Melhorar a visualização dos itens de estatística - Manter os tooltips, mas restaurar a estrutura original
const ChannelStatItem = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.md}; /* Aumentar de sm para md */
  position: relative;
  cursor: help;
  
  svg {
    margin-right: 8px; /* Aumentar de 6px para 8px */
    font-size: 16px; /* Aumentar de 14px para 16px */
    color: ${props => props.theme.colors.primary};
  }
  
  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
    margin-bottom: 8px;
  }
  
  &:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    margin-bottom: 3px;
    z-index: 10;
  }
`;

// Adicionar um componente de tooltip para melhorar a UX
const CustomTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.text};
  color: white;
  padding: 6px 10px;
  border-radius: ${props => props.theme.radius.sm};
  font-size: ${props => props.theme.fontSizes.xs};
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 4px;
    border-style: solid;
    border-color: ${props => props.theme.colors.text} transparent transparent transparent;
  }
`;

const TooltipContainer = styled.div`
  position: relative;
  
  &:hover ${CustomTooltip} {
    opacity: 1;
    visibility: visible;
    bottom: calc(100% + 10px);
  }
`;

// Modificar EngagementPill para mostrar o score de relevância
const EngagementPill = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}22, ${props => props.theme.colors.primary}44);
  color: ${props => props.theme.colors.primary};
  padding: 6px 14px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-left: auto;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  
  svg {
    margin-right: 6px;
    font-size: 14px;
  }
`;

// Estilo para o popup de confirmação
const StatusPopup = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupContent = styled.div`
  background: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  width: 400px;
  max-width: 90%;
  box-shadow: ${props => props.theme.shadows.lg};
  text-align: center;
`;

const PopupTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  margin-bottom: 16px;
  color: ${props => props.theme.colors.primary};
`;

const PopupText = styled.p`
  margin-bottom: 24px;
  color: ${props => props.theme.colors.darkGrey};
`;

const PopupActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const StatusToggleButton = styled(ButtonUI)`
  min-width: 120px;
`;

// Video performance section
const VideoTable = styled.div`
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
`;

// Atualizar o grid para as colunas terem tamanhos mais adequados
const VideoTableHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 3fr) 100px 100px 100px 150px 100px;
  padding: 16px 24px;
  background: ${props => props.theme.colors.lightGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
  color: ${props => props.theme.colors.primary};
  text-transform: uppercase;
  font-size: ${props => props.theme.fontSizes.sm};
  letter-spacing: 0.5px;
  
  > div {
    display: flex;
  align-items: center;
    height: 100%;
    
    &:first-child {
      justify-content: flex-start;
      padding-left: 8px;
    }
    
    &:not(:first-child) {
      justify-content: center;
      text-align: center;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: -12px;
        top: 0;
        bottom: 0;
        height: 100%;
        width: 1px;
        background-color: ${props => props.theme.colors.tertiary};
      }
    }
  }
`;

const VideoTitle = styled.div`
  display: flex;
  align-items: flex-start;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
  padding-right: 16px;
  height: 100%;
`;

const VideoThumbnail = styled.div`
  width: 120px;
  height: 67px; // Mantém a proporção 16:9
  border-radius: 8px;
  margin-right: 16px;
  flex-shrink: 0;
  overflow: hidden;
  
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease-in-out;
  }
`;

// Atualizar o grid para as linhas
const VideoTableRow = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 3fr) 100px 100px 100px 150px 100px;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
  align-items: center;
  transition: all 0.2s ease;
  
  > div {
    height: 100%;
    display: flex;
    align-items: center;
    
    &:first-child {
      align-items: flex-start;
    }
    
    &:not(:first-child) {
      position: relative;
      justify-content: center;
      text-align: center;
      
      &::before {
    content: '';
    position: absolute;
        left: -12px;
        top: 0;
        bottom: 0;
        height: 100%;
        width: 1px;
        background-color: ${props => props.theme.colors.tertiary}80;
      }
    }
  }
  
  &:hover {
    background: ${props => props.theme.colors.tertiary}20;
    
    ${VideoThumbnail} {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const VideoTitleText = styled.div`
  display: flex;
  flex-direction: column;
  color: ${props => props.theme.colors.primary};
`;

// Permitir que o título principal quebre mais linhas (atualizar a definição existente)
const VideoMainTitle = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

// Ajustar o alinhamento das estatísticas
const VideoStat = styled.div`
  color: ${props => props.theme.colors.primary};
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.md};
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 0 8px;
`;

const VideoStatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.regular};
  margin-top: 4px;
`;

// Filter and search components
const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 10px 16px;
  background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.secondary};
  color: ${props => props.active ? props.theme.colors.secondary : props.theme.colors.darkGrey};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.tertiary};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.regular};
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    margin-right: 8px;
  }
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey}20;
    border-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.primary};
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 350px;
`;

const SearchInput = styled.input`
  padding: 10px 16px 10px 42px;
  border: 1px solid ${props => props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.md};
  width: 100%;
  font-size: ${props => props.theme.fontSizes.sm};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.darkGrey};
  pointer-events: none;
`;

const VideoBadge = styled.span<{ type: string }>`
  display: inline-flex;
  padding: 2px 8px;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radius.pill};
  margin-left: 12px;
  background: ${props => 
    props.type === 'new' ? props.theme.colors.successLight : 
    props.type === 'trending' ? props.theme.colors.warningLight : 
    props.theme.colors.infoLight};
  color: ${props => 
    props.type === 'new' ? props.theme.colors.success : 
    props.type === 'trending' ? props.theme.colors.warning : 
    props.theme.colors.info};
`;

// Action buttons
const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

// Extend the Button component with some additional styling
const ActionButton = styled(ButtonUI)`
  /* Using leftIcon/rightIcon props for icon positioning */
`;

// Interface for channel details
interface ChannelDetails {
  id: number;
  name?: string;
  Nome?: string;               // Coluna real da tabela
  channel_name?: string;       // Vindo da RPC
  subscriber_count?: string | number;  // Coluna real da tabela e da RPC
  subscribers?: string;        // Para compatibilidade
  view_count?: string | number;       // Coluna real da tabela e da RPC
  views?: string;              // Para compatibilidade
  category?: string;
  status?: string;
  is_active?: boolean;         // Coluna real da tabela - controla o status
  last_video?: string;         // Da RPC
  lastVideo?: string;          // Para compatibilidade
  engagement_rate?: string | number;  // Coluna real da tabela e da RPC
  engagementRate?: string;     // Para compatibilidade
  project_id?: string | number;
  Projeto?: number;            // Coluna real da tabela
  channel_id?: string;         // Coluna real da tabela - YouTube channel ID
  
  // Novos campos da API atualizada
  imagem?: string;             // URL da imagem do canal
  raw_subscriber_count?: number; // Número bruto de inscritos (sem formatação)
  video_count?: number;        // Número de vídeos
  custom_url?: string;         // URL personalizada do canal
  description?: string;        // Descrição do canal
  total_mensagens_postadas?: number; // Número total de mensagens postadas
  avg_relevance_score?: number; // Score médio de relevância
}

// Default empty array for channels
const defaultChannels: ChannelDetails[] = [];

// Enhanced engagement data
const engagementData = [
  { date: 'Jan', comments: 145, likes: 1250, views: 25000, subscribers: 250 },
  { date: 'Feb', comments: 165, likes: 1560, views: 28000, subscribers: 310 },
  { date: 'Mar', comments: 180, likes: 1980, views: 32000, subscribers: 370 },
  { date: 'Apr', comments: 220, likes: 2150, views: 38000, subscribers: 450 },
  { date: 'May', comments: 310, likes: 2840, views: 45000, subscribers: 620 },
  { date: 'Jun', comments: 290, likes: 2650, views: 42000, subscribers: 580 },
  { date: 'Jul', comments: 350, likes: 3100, views: 50000, subscribers: 800 }
];

// Video performance data with badges
const videoPerformanceData = [
  { 
    id: 1,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'LED Project Tutorial', 
    views: 145000, 
    comments: 1250, 
    likes: 12500, 
    retention: 68,
    badge: 'trending'
  },
  { 
    id: 2,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'RGB Light Setup Guide', 
    views: 98000, 
    comments: 820, 
    likes: 8900, 
    retention: 72,
    badge: null
  },
  { 
    id: 3,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'Best LEDs for 2025', 
    views: 210000, 
    comments: 1850, 
    likes: 18200, 
    retention: 65,
    badge: 'new'
  },
  { 
    id: 4,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'Smart LED Installation', 
    views: 85000, 
    comments: 740, 
    likes: 7600, 
    retention: 70,
    badge: null
  },
  { 
    id: 5,
    thumbnail: 'https://via.placeholder.com/160x90',
    name: 'LED Troubleshooting', 
    views: 120000, 
    comments: 1340, 
    likes: 10800, 
    retention: 63,
    badge: null
  }
];

// Content distribution data
const contentDistributionData = [
  { name: 'Tutorials', value: 35 },
  { name: 'Reviews', value: 25 },
  { name: 'Vlogs', value: 15 },
  { name: 'Shorts', value: 15 },
  { name: 'Live Streams', value: 10 },
];

// Sample radar chart data
const performanceMetricsData = [
  {
    category: 'Watch Time',
    current: 75,
    benchmark: 60,
  },
  {
    category: 'Engagement',
    current: 85,
    benchmark: 70,
  },
  {
    category: 'CTR',
    current: 62,
    benchmark: 55,
  },
  {
    category: 'Audience Retention',
    current: 68,
    benchmark: 65,
  },
  {
    category: 'Subscriber Conversion',
    current: 55,
    benchmark: 50,
  },
];

// Add more styled components for the channel header
const ChannelHeaderSection = styled.div`
  margin-bottom: 24px;
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const ChannelHeaderBanner = styled.div`
  height: 140px;
  background: linear-gradient(120deg, ${COLORS.ACCENT}, ${withOpacity(COLORS.ACCENT, 0.6)});
  position: relative;
`;

const ChannelHeaderContent = styled.div`
  display: flex;
  padding: 0 24px 24px;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ChannelHeaderAvatar = styled.div<{ imageUrl: string }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid white;
  background-image: url(${props => props.imageUrl});
  background-size: cover;
  background-position: center;
  margin-top: -60px;
  box-shadow: ${props => props.theme.shadows.md};
  flex-shrink: 0;
  position: relative;
  
  @media (max-width: 768px) {
    margin-bottom: 16px;
  }
`;

const ChannelHeaderInfo = styled.div`
  flex: 1;
  margin-left: 24px;
  
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const ChannelHeaderTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  
  svg {
    margin-left: 8px;
    color: #FF0000;
  }
`;

const ChannelHeaderMetrics = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const ChannelHeaderMetric = styled.div`
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
    color: ${COLORS.ACCENT};
  }
  
  span {
    font-weight: ${props => props.theme.fontWeights.medium};
  }
`;

const ChannelHeaderDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(transparent, white);
    pointer-events: none;
  }
`;

const ChannelHeaderUrl = styled.a`
  display: inline-flex;
  align-items: center;
  color: ${COLORS.ACCENT};
  font-size: ${props => props.theme.fontSizes.sm};
  text-decoration: none;
  margin-top: 12px;
  
  svg {
    margin-right: 6px;
  }
  
  &:hover {
    text-decoration: underline;
  }
`;

// Ajustar o estilo da descrição para ocupar menos espaço
const VideoDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  opacity: 0.9;
`;

// Ajustar o botão para ocupar menos espaço vertical
const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  padding: 2px 0;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-top: 4px;
  opacity: 0.8;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

// Adicionar um modal para visualizar detalhes completos do vídeo
const VideoDetailModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  width: 80%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid ${props => props.theme.colors.tertiary};
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.colors.darkGrey};
  padding: 0;
  margin: 0;
  line-height: 1;
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ModalTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin: 0 0 8px;
  color: ${props => props.theme.colors.primary};
`;

const ModalThumbnail = styled.div`
  width: 100%;
  position: relative;
  padding-top: 56.25%; /* Proporção 16:9 (9/16 = 0.5625 = 56.25%) */
  border-radius: ${props => props.theme.radius.md};
  overflow: hidden;
  margin-bottom: 24px;
  background-color: #000;
  
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain; /* Garante que a imagem mantenha a proporção sem cortes */
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    border-top: 16px solid transparent;
    border-left: 28px solid white;
    border-bottom: 16px solid transparent;
    opacity: 0.9;
    pointer-events: none;
  }
`;

const ModalDescription = styled.div`
  font-size: ${props => props.theme.fontSizes.md};
  line-height: 1.6;
  color: ${props => props.theme.colors.darkGrey};
  margin-bottom: 24px;
  padding: 16px;
  background: ${props => props.theme.colors.tertiary}20;
  border-radius: ${props => props.theme.radius.md};
  max-height: 200px;
  overflow-y: auto;
`;

const ModalStats = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const ModalStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ModalStatValue = styled.div`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.primary};
`;

const ModalStatLabel = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  margin-top: 4px;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
`;

const ModalActionButton = styled(ButtonUI)`
  min-width: 120px;
`;

// Adicionar interface para tipo de comentário
interface VideoComment {
  id_comentario: number;
  author_name: string;
  like_count: number;
  text_original: string;
  total_reply_count: number;
  lead_score: string;
  project_id: number;
  justificativa_comentario: string;
  id_mensagem?: number;
  mensagem?: string;
  respondido?: boolean;
  comentario_principal_id?: number;
  justificativa_mensagem?: string;
  proxima_postagem?: string;
  status?: string;
  published_at?: string;
  updated_at?: string;
}

// Componentes para exibição de comentários
const CommentsContainer = styled.div`
  margin-top: 20px;
`;

const CommentCard = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  padding: 20px;
  margin-bottom: 16px;
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const CommentAuthor = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: #333;
  display: flex;
  align-items: center;

  svg {
    margin-right: 8px;
    color: #666;
  }
`;

const CommentStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const CommentStat = styled.div`
  display: flex;
  align-items: center;
  color: #666;
  font-size: 14px;
  
  svg {
    margin-right: 4px;
    font-size: 14px;
  }
`;

const CommentScore = styled.div`
  background: #f5f5f5;
  color: #444;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 12px;
  }
`;

const CommentText = styled.div`
  font-size: 15px;
  line-height: 1.5;
  color: #444;
  margin-bottom: 16px;
  white-space: pre-wrap;
`;

const JustificationButton = styled.button`
  background: ${props => props.theme.colors.lightGrey};
  border: none;
  border-radius: ${props => props.theme.radius.sm};
  padding: 6px 12px;
  font-size: 12px;
  color: ${props => props.theme.colors.darkGrey};
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
  
  &:hover {
    background: ${props => props.theme.colors.primary}20;
    color: ${props => props.theme.colors.primary};
  }
`;

const JustificationPopup = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const JustificationContent = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  max-width: 600px;
  width: 90%;
  padding: 24px;
  box-shadow: ${props => props.theme.shadows.lg};
`;

const JustificationHeader = styled.div`
  font-weight: 600;
  font-size: 18px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const JustificationText = styled.div`
  font-size: 15px;
  line-height: 1.6;
  color: #444;
  white-space: pre-wrap;
  padding: 16px;
  background: #f9f9f9;
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 16px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const ResponseCard = styled.div`
  background: #f5f9ff;
  border-left: 3px solid ${props => props.theme.colors.primary};
  padding: 16px;
  margin-left: 24px;
  margin-top: 12px;
  border-radius: 0 ${props => props.theme.radius.md} ${props => props.theme.radius.md} 0;
`;

const ResponseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ResponseTitle = styled.div`
  font-weight: 500;
  font-size: 14px;
  color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
  }
`;

const ResponseStatus = styled.div<{ status?: string }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: ${props => 
    props.status === 'posted' ? '#e6f7ee' : 
    props.status === 'pending' ? '#FFF8E6' : 
    '#f5f5f5'};
  color: ${props => 
    props.status === 'posted' ? '#34C759' : 
    props.status === 'pending' ? '#FF9500' : 
    '#999'};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const ResponseText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: #555;
  margin-bottom: 12px;
`;

const ResponseFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #888;
`;

const CommentsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const CommentsTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 10px;
    color: ${props => props.theme.colors.primary};
  }
`;

const VideoDetailsSection = styled.div`
  margin-bottom: 32px;
`;

// Adicionar um componente de tooltip reutilizável sem modificar o código existente
const InfoTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          opacity: 0,
          visibility: 'hidden',
          transition: 'opacity 0.2s, visibility 0.2s',
          pointerEvents: 'none',
          zIndex: 10,
        }}
        className="tooltip-text"
      >
        {text}
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: 'rgba(0, 0, 0, 0.8) transparent transparent transparent',
          }}
        ></div>
      </div>
      <style>{`
        div:hover > .tooltip-text {
          opacity: 1;
          visibility: visible;
        }
      `}</style>
    </div>
  );
};

// Implementar um StatText destacado em verde para certos elementos
const HighlightedStatText = styled(StatText)`
  color: #34C759;
  font-weight: 600;
`;

// Adicionar estilos para métricas agrupadas
const StatSubItem = styled.div`
  display: flex;
  align-items: center;
  margin: 0;
  padding: 12px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  background: white;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(247, 250, 255, 0.7);
  }
`;

const StatSubIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  
  svg {
    font-size: 14px;
    color: #666;
  }
`;

const StatSubContent = styled.div`
  flex: 1;
`;

const StatSubLabel = styled.div`
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
`;

const StatSubValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

// Adicionar interface para dados das categorias de conteúdo
interface ContentCategory {
  content_category: string;
  total_videos: number;
  total_views: string;
  total_likes: string;
  media_relevancia: string;
}

// Component implementation
const YoutubeMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [timeframe, setTimeframe] = useState('month');
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [channels, setChannels] = useState<ChannelDetails[]>(defaultChannels);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [selectedChannelForToggle, setSelectedChannelForToggle] = useState<ChannelDetails | null>(null);
  const [isStatusPopupOpen, setIsStatusPopupOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [metricsData, setMetricsData] = useState<{ 
    total_views: number, 
    total_likes: number, 
    media: string, 
    posts: number,
    total_channels: number,
    total_videos: number
  } | null>(null);
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [videoComments, setVideoComments] = useState<any[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [channelVideoCount, setChannelVideoCount] = useState<{[key: number]: number}>({});
  const [selectedChannelDetails, setSelectedChannelDetails] = useState<any>(null);
  const [isLoadingChannelDetails, setIsLoadingChannelDetails] = useState(false);
  const [selectedVideoForDetail, setSelectedVideoForDetail] = useState<any>(null);
  const [currentVideoComments, setCurrentVideoComments] = useState<VideoComment[]>([]);
  const [showJustification, setShowJustification] = useState<boolean>(false);
  const [currentJustification, setCurrentJustification] = useState<{ title: string; text: string } | null>(null);
  const { currentProject } = useProject();
  const [contentCategories, setContentCategories] = useState<ContentCategory[]>([]);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!currentProject?.id) return;
      
      const id_projeto = currentProject.id;
      try {
        const data = await callRPC('get_project_metrics', { id_projeto });
        
        if (data && data.length > 0) {
          setMetricsData(data[0]);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };
    
    const fetchChannelDetails = async () => {
      if (!currentProject?.id) return;
      
      setIsLoadingChannels(true);
      try {
        const data = await callRPC('get_channel_details', { 
          id_projeto: currentProject.id 
        });
        
        if (data && Array.isArray(data) && data.length > 0) {
          // Process channels to ensure all required fields are available
          const processedChannels = data.map(channel => {
            // Set status based on is_active if not already set
            if (channel.is_active !== undefined && channel.status === undefined) {
              channel.status = channel.is_active ? 'active' : 'inactive';
            }
            
            // Default to active if neither is defined
            if (channel.status === undefined && channel.is_active === undefined) {
              channel.status = 'active';
            }
            
            // Calculate engagement rate if not provided by RPC
            if (!channel.engagement_rate && !channel.engagementRate) {
              const subscriberCount = parseInt(channel.subscriber_count || channel.subscribers || '0', 10);
              const viewCount = parseInt(channel.view_count || channel.views || '0', 10);
              
              // Simple engagement calculation if we have both metrics
              if (subscriberCount > 0 && viewCount > 0) {
                const ratio = (viewCount / subscriberCount) * 100;
                channel.engagement_rate = ratio > 100 ? '100%' : `${ratio.toFixed(1)}%`;
              } else {
                channel.engagement_rate = '0%';
              }
            }
            
            return channel;
          });
          
          setChannels(processedChannels);
          
          // Fetch video counts for each channel
          processedChannels.forEach(channel => {
            fetchChannelVideoCount(channel.id);
          });
          
        } else {
          setChannels(defaultChannels);
        }
      } catch (error) {
        console.error('Error fetching channel details:', error);
        setChannels(defaultChannels);
      } finally {
        setIsLoadingChannels(false);
      }
    };
    
    const fetchContentCategories = async () => {
      if (!currentProject?.id) return;
      
      try {
        const data = await callRPC('get_top_content_categories', { 
          id_projeto: currentProject.id 
        });
        
        if (data && Array.isArray(data)) {
          console.log('Content categories data:', data);
          setContentCategories(data);
        } else {
          console.log('No content categories found or invalid data format');
          setContentCategories([]);
        }
      } catch (error) {
        console.error('Error fetching content categories:', error);
        setContentCategories([]);
      }
    };
    
    fetchMetrics();
    fetchChannelDetails();
    fetchContentCategories(); // Adicionar chamada para a nova função
  }, [currentProject]);
  
  // Function to fetch and store video count for a channel
  const fetchChannelVideoCount = async (channelId: number) => {
    try {
      const data = await callRPC('get_videos_by_channel_id', {
        canal_id: channelId
      });
      
      if (data && Array.isArray(data)) {
        setChannelVideoCount(prev => ({
          ...prev,
          [channelId]: data.length
        }));
      }
    } catch (error) {
      console.error(`Error fetching video count for channel ${channelId}:`, error);
    }
  };
  
  // Função para alternar o status ativo/inativo de um canal usando o ID
  const toggleChannelStatus = async (channel: ChannelDetails, currentStatus: boolean) => {
    try {
      setIsUpdatingStatus(true);
      
      // Usando o ID do canal para a atualização (mais seguro e confiável)
      const channelId = channel.id;
      const channelName = channel.channel_name || channel.name || channel.Nome;
      
      if (!channelId) {
        console.error('Channel ID not found:', channel);
        alert('Channel ID not found. Cannot update status.');
        return null;
      }
      
      console.log('Updating channel:', channelName);
      console.log('Channel ID:', channelId);
      console.log('Current status:', currentStatus);
      console.log('New status will be:', !currentStatus);
      
      // Garantir que estamos trabalhando com um boolean para o campo is_active
      const newStatus = !currentStatus;
      
      // Atualizar pelo ID do canal (mais seguro)
      const { data, error } = await supabase
        .from('Canais do youtube')
        .update({ is_active: newStatus })
        .eq('id', channelId)
        .select();
      
      // Verificar o resultado
      if (error) {
        console.error('Error updating channel:', error.message);
        console.error('Error details:', error);
        alert(`Error updating channel: ${error.message}`);
      } else {
        console.log('Channel updated successfully:', data);
        
        // Atualiza a lista de canais após a mudança bem-sucedida
        if (currentProject?.id) {
          try {
            // Busca os dados atualizados usando a RPC
            const refreshedData = await callRPC('get_channel_details', { 
              id_projeto: currentProject.id 
            });
            
            if (refreshedData && Array.isArray(refreshedData)) {
              setChannels(refreshedData);
              console.log('Channel list updated successfully');
            }
          } catch (refreshError) {
            console.error('Error refreshing channel list:', refreshError);
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error during toggle operation:', error);
      alert('Failed to update channel status. Check console for details.');
      return null;
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusPopupOpen(false);
    }
  };
  
  // Generate random trend data for stats
  const generateTrendData = (baseline: number, variance: number = 0.1, points: number = 10) => {
    const data = [];
    let current = baseline;
    
    for (let i = 0; i < points; i++) {
      const change = baseline * variance * (Math.random() * 2 - 1);
      current += change;
      data.push(current);
    }
    
    return data;
  };
  
  // Function to fetch videos for a specific channel
  const fetchChannelVideos = async (channelId: number) => {
    if (!channelId || !currentProject?.id) return;
    
    setIsLoadingVideos(true);
    try {
      // Use the RPC helper function to call get_videos_by_channel_id
      const data = await callRPC('get_videos_by_channel_id', {
        canal_id: channelId
      });
      
      if (data && Array.isArray(data)) {
        console.log('Channel videos data:', JSON.stringify(data, null, 2));
        
        // Process data to ensure videos have thumbnail URLs
        const processedVideos = data.map(video => {
          // Identificar qual ID do vídeo usar (video_id_youtube ou video_id)
          const youtubeVideoId = video.video_id_youtube || video.video_id || video.id_video || '';
          
          if (youtubeVideoId) {
            console.log('Video YouTube ID encontrado:', youtubeVideoId);
            return {
              ...video,
              // Garantir que temos o ID do YouTube em um campo consistente
              video_id_youtube: youtubeVideoId,
              // Adicionar a URL da thumbnail
              thumbnailUrl: getYouTubeThumbnailUrl(youtubeVideoId)
            };
          } else {
            console.warn('Video sem ID do YouTube:', video);
            return {
              ...video,
              thumbnailUrl: getThumbnailUrl(video)
            };
          }
        });
        
        setChannelVideos(processedVideos);
      } else {
        console.error('Invalid data format received for channel videos');
        setChannelVideos([]);
      }
    } catch (error) {
      console.error('Error in channel videos fetch operation:', error);
      setChannelVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  };
  
  // Função para buscar comentários do vídeo selecionado
  const fetchVideoComments = async (videoId: number) => {
    console.log('Buscando comentários para o vídeo ID:', videoId);
    setIsLoadingComments(true);
    try {
      // Certificar-se de que estamos usando o ID correto da tabela de vídeos
      if (!videoId) {
        console.error('ID do vídeo inválido:', videoId);
        setCurrentVideoComments([]);
        setIsLoadingComments(false);
        return;
      }

      // Tentar encontrar o vídeo nos dados para debug
      const videoData = channelVideos.find(v => v.id === videoId);
      console.log('DEBUG - Dados completos do vídeo:', videoData);
      
      // Ver se há outros IDs disponíveis que possam ser usados
      const possibleIds = {
        id: videoId,
        video_id: videoData?.video_id,
        video_id_youtube: videoData?.video_id_youtube,
        id_video: videoData?.id_video
      };
      console.log('DEBUG - Possíveis IDs para usar na consulta:', possibleIds);
      
      // Fazer a chamada RPC com o ID padrão
      console.log('Chamando RPC com video_id_param:', videoId);
      const data = await callRPC('get_comments_and_messages_by_video_id', {
        video_id_param: videoId
      });
      
      console.log('Resposta da RPC:', data);
      
      // Se não há dados, tentar com outros IDs possíveis
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('Nenhum comentário encontrado com ID padrão. Tentando outros IDs...');
        
        // Se temos um video_id diferente do id, tentar com ele
        if (videoData?.video_id && videoData.video_id !== videoId) {
          console.log('Tentando com video_id:', videoData.video_id);
          const dataWithVideoId = await callRPC('get_comments_and_messages_by_video_id', {
            video_id_param: videoData.video_id
          });
          console.log('Resposta usando video_id:', dataWithVideoId);
          
          if (dataWithVideoId && Array.isArray(dataWithVideoId) && dataWithVideoId.length > 0) {
            setCurrentVideoComments(dataWithVideoId);
            setIsLoadingComments(false);
            return;
          }
        }
        
        // Tentar com o video_id_youtube
        if (videoData?.video_id_youtube) {
          console.log('Tentando com video_id_youtube:', videoData.video_id_youtube);
          const dataWithYoutubeId = await callRPC('get_comments_by_youtube_video_id', {
            youtube_video_id: videoData.video_id_youtube
          });
          console.log('Resposta usando video_id_youtube:', dataWithYoutubeId);
          
          if (dataWithYoutubeId && Array.isArray(dataWithYoutubeId) && dataWithYoutubeId.length > 0) {
            setCurrentVideoComments(dataWithYoutubeId);
            setIsLoadingComments(false);
            return;
          }
        }
      }
      
      if (data) {
        console.log('Comentários do vídeo recebidos:', data);
        setCurrentVideoComments(Array.isArray(data) ? data : []);
      } else {
        console.log('Nenhum comentário encontrado para o vídeo ID:', videoId);
        setCurrentVideoComments([]);
      }
    } catch (error) {
      console.error('Erro ao buscar comentários do vídeo:', error);
      setCurrentVideoComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };
  
  // Function to fetch detailed channel information
  const fetchChannelDetails = async (channelId: string) => {
    if (!channelId) {
      console.log('fetchChannelDetails: Channel ID não fornecido');
      return;
    }
    
    console.log('Iniciando fetchChannelDetails com channel_id:', channelId);
    setIsLoadingChannelDetails(true);
    try {
      const data = await callRPC('call_youtube_channel_details', {
        channel_id: channelId
      });
      
      console.log('Resposta detalhada da API de canal:', data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Primeiro item da resposta:', data[0]);
        if (data[0].call_youtube_channel_details) {
          console.log('Detalhes encontrados, atualizando selectedChannelDetails');
          setSelectedChannelDetails(data[0].call_youtube_channel_details);
        } else {
          console.error('Campo call_youtube_channel_details não encontrado no retorno da API');
          setSelectedChannelDetails(null);
        }
      } else {
        console.error('Formato de dados inválido ou vazio para detalhes do canal');
        setSelectedChannelDetails(null);
      }
    } catch (error) {
      console.error('Erro ao buscar informações detalhadas do canal:', error);
      setSelectedChannelDetails(null);
    } finally {
      setIsLoadingChannelDetails(false);
    }
  };

  // Function to handle channel selection - update to also fetch channel details
  const handleChannelSelect = (channelId: number) => {
    console.log('Canal selecionado, ID:', channelId);
    setSelectedChannel(channelId);
    setSelectedVideo(null); // Clear selected video
    fetchChannelVideos(channelId);
    
    // Get the channel data
    const selectedChannelData = channels.find(c => c.id === channelId);
    console.log('Dados do canal encontrado:', selectedChannelData);
    
    if (selectedChannelData) {
      // Verificar os dados disponíveis no console
      console.log('Subscriber count:', selectedChannelData.raw_subscriber_count);
      console.log('View count raw:', selectedChannelData.view_count);
      
      // Extrair valores numéricos das estatísticas formatadas
      let viewCount = '0';
      if (selectedChannelData.view_count) {
        if (typeof selectedChannelData.view_count === 'string') {
          // Extrair apenas o valor numérico (1.8M -> 1800000)
          if (selectedChannelData.view_count.includes('M')) {
            const numPart = parseFloat(selectedChannelData.view_count.replace(/[^0-9.]/g, ''));
            viewCount = (numPart * 1000000).toString();
          } else if (selectedChannelData.view_count.includes('K')) {
            const numPart = parseFloat(selectedChannelData.view_count.replace(/[^0-9.]/g, ''));
            viewCount = (numPart * 1000).toString();
          } else {
            viewCount = selectedChannelData.view_count.replace(/[^0-9]/g, '');
          }
        } else {
          viewCount = selectedChannelData.view_count.toString();
        }
      }
      
      // Usar diretamente os dados que já temos ao invés de fazer uma chamada adicional
      const channelDetails = {
        title: selectedChannelData.channel_name || 'YouTube Channel',
        description: selectedChannelData.description || '',
        statistics: {
          subscriberCount: selectedChannelData.raw_subscriber_count?.toString() || 
                          (typeof selectedChannelData.subscriber_count === 'string' ? 
                            selectedChannelData.subscriber_count.replace(/[^0-9]/g, '') : 
                            selectedChannelData.subscriber_count?.toString()) || 
                          '0',
          viewCount: viewCount,
          videoCount: selectedChannelData.video_count?.toString() || '0'
        },
        thumbnails: {
          high: { url: selectedChannelData.imagem || 'https://via.placeholder.com/150' },
          medium: { url: selectedChannelData.imagem || 'https://via.placeholder.com/150' },
          default: { url: selectedChannelData.imagem || 'https://via.placeholder.com/150' }
        },
        country: 'US', // Alterado para corresponder aos dados reais que mostram US
        customUrl: selectedChannelData.custom_url || null
      };
      
      console.log('Usando dados do canal para o cabeçalho:', channelDetails);
      setSelectedChannelDetails(channelDetails);
    }
    
    // If in Overview or Channels tab, switch to Videos tab
    if (activeTab === 'overview' || activeTab === 'channels') {
      setActiveTab('videos');
    }
  };
  
  // Function to select a video
  const handleVideoSelect = async (videoId: number) => {
    console.log('Vídeo selecionado, ID:', videoId);
    setActiveTab('comments');
    
    // Encontrar o vídeo selecionado nos dados
    const video = channelVideos.find(v => v.id === videoId);
    console.log('Dados do vídeo encontrado:', video);
    setSelectedVideo(video || null);
    
    // Buscar comentários do vídeo
    await fetchVideoComments(videoId);
  };
  
  // Helper function to format numbers
  const formatNumber = (num: string | number | undefined): string => {
    if (!num) return '0';
    
    const numValue = typeof num === 'string' ? parseInt(num, 10) : num;
    
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    
    return numValue.toString();
  };
  
  // Função para gerar URL de thumbnail do YouTube
  const getYouTubeThumbnailUrl = (videoId: string) => {
    if (!videoId) return 'https://placehold.co/640x360/5F27CD/FFFFFF?text=No+Image';
    
    // Formato de alta qualidade (maxresdefault)
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  };
  
  // Adicionar esta função de utilidade para gerar URLs de thumbnail
  const getThumbnailUrl = (video: any) => {
    // Se temos o ID do vídeo do YouTube, usamos para gerar a URL da thumbnail
    if (video.video_id_youtube) {
      return `https://i.ytimg.com/vi/${video.video_id_youtube}/hqdefault.jpg`;
    }
    
    // Fallback para uma imagem estática com base na primeira letra do título
    const videoTitle = video.nome_do_video || video.title || "Untitled";
    const firstLetter = videoTitle.charAt(0).toUpperCase();
    
    // Geramos cores diferentes com base na primeira letra do título
    const colors = ['#5F27CD', '#2D98DA', '#FF9F43', '#EE5253', '#10AC84', '#222F3E', '#5F27CD'];
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    
    // Returna uma URL para uma imagem de placeholder personalizada
    return `https://placehold.co/640x360/${colors[colorIndex].replace('#', '')}/${firstLetter === videoTitle.charAt(0) ? 'FFFFFF' : '333333'}?text=${encodeURIComponent(firstLetter)}`;
  };
  
  // Função para mostrar popup de justificativa
  const showJustificationPopup = (title: string, text: string) => {
    setCurrentJustification({ title, text });
    setShowJustification(true);
  };
  
  // Filtrar comentários para exibir apenas aqueles com status "posted"
  const filteredComments = currentVideoComments.filter(comment => comment.status === 'posted');
  
  // Atualizar a transformação de dados para o gráfico de distribuição de conteúdo
  // Implementar uma função para processar os dados de categoria para o gráfico de pizza
  const getContentDistributionData = () => {
    if (!contentCategories || contentCategories.length === 0) {
      // Dados de exemplo caso não existam categorias
      return [
        { name: 'Tutorials', value: 35 },
        { name: 'Reviews', value: 25 },
        { name: 'Live Streams', value: 15 },
        { name: 'Shorts', value: 15 },
        { name: 'Vlogs', value: 10 }
      ];
    }
    
    // Calcular o total de vídeos para porcentagens
    const totalVideos = contentCategories.reduce((sum, category) => sum + category.total_videos, 0);
    
    // Mapear os dados das categorias para o formato do gráfico
    return contentCategories.map(category => {
      // Não precisamos mais truncar os nomes agora que removemos as legendas
      const displayName = category.content_category;
      
      // Calcular a porcentagem baseada no número de vídeos
      const percentage = Math.round((category.total_videos / totalVideos) * 100);
      
      return {
        name: displayName,
        fullName: category.content_category, // Nome completo para o tooltip
        value: percentage,
        videos: category.total_videos,
        views: category.total_views,
        likes: category.total_likes,
        relevance: category.media_relevancia
      };
    });
  };
  
  return (
    <PageContainer>
      <PageTitle>
        <IconComponent icon={FaIcons.FaYoutube} />
        YouTube Monitoring
      </PageTitle>
      
      <TabsContainer>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          <TabIcon><IconComponent icon={FaIcons.FaChartLine} /></TabIcon>
          Overview
        </Tab>
        <Tab active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}>
          <TabIcon><IconComponent icon={FaIcons.FaYoutube} /></TabIcon>
          Channels
        </Tab>
        {selectedChannel !== null && (
        <Tab active={activeTab === 'videos'} onClick={() => setActiveTab('videos')}>
          <TabIcon><IconComponent icon={FaIcons.FaVideo} /></TabIcon>
          Videos
            <ChannelBadge 
              style={{ 
                marginLeft: '16px',
                display: 'inline-flex',
                justifyContent: 'center',
                minWidth: '24px'
              }} 
              status="active"
            >
              {channelVideos.length}
            </ChannelBadge>
        </Tab>
        )}
        {selectedVideo !== null && (
        <Tab active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
          <TabIcon><IconComponent icon={FaIcons.FaComment} /></TabIcon>
          Comments
            <ChannelBadge 
              style={{ 
                marginLeft: '16px',
                display: 'inline-flex',
                justifyContent: 'center',
                minWidth: '24px'
              }} 
              status="active"
            >
              {filteredComments.length}
            </ChannelBadge>
        </Tab>
        )}
      </TabsContainer>
      
      {activeTab === 'overview' && (
        <>
          <StatsGrid>
            {/* Card 1: Engajamento do Público */}
            <StatCard>
              <StatCardHeader>
                <StatLabel>Audience Engagement</StatLabel>
                <StatIconContainer color="#5856D6">
                  <IconComponent icon={FaIcons.FaUsers} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue style={{ 
                background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.05), rgba(88, 86, 214, 0.15))', 
                color: '#5856D6'
              }}>
                {metricsData ? (metricsData.total_views >= 1000000 ? `${(metricsData.total_views / 1000000).toFixed(1)}M` : `${(metricsData.total_views / 1000).toFixed(0)}K`) : '0'} Views
              </StatValue>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(88, 86, 214, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaHeart} style={{ color: '#FF2D55' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Total Likes</StatSubLabel>
                  <StatSubValue>{metricsData ? (metricsData.total_likes >= 1000000 ? `${(metricsData.total_likes / 1000000).toFixed(1)}M` : `${(metricsData.total_likes / 1000).toFixed(0)}K`) : '0'}</StatSubValue>
                </StatSubContent>
              </StatSubItem>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(88, 86, 214, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaChartPie} style={{ color: '#5856D6' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Engagement Rate</StatSubLabel>
                  <StatSubValue style={{ color: '#5856D6', fontWeight: '700' }}>{metricsData?.media ? `${parseFloat(metricsData.media).toFixed(1)}%` : '0%'}</StatSubValue>
                </StatSubContent>
              </StatSubItem>
            </StatCard>
            
            {/* Card 2: Canais e Alcance */}
            <StatCard>
              <StatCardHeader>
                <StatLabel>Channel Overview</StatLabel>
                <StatIconContainer color="#007AFF">
                  <IconComponent icon={FaIcons.FaYoutube} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue style={{ 
                background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.05), rgba(0, 122, 255, 0.15))', 
                color: '#007AFF'
              }}>
                {metricsData?.total_channels || '0'} Channels
              </StatValue>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(0, 122, 255, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaVideo} style={{ color: '#007AFF' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Monitored Videos</StatSubLabel>
                  <StatSubValue>{metricsData?.total_videos || '0'}</StatSubValue>
                </StatSubContent>
              </StatSubItem>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(0, 122, 255, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaGlobe} style={{ color: '#5AC8FA' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Avg Videos per Channel</StatSubLabel>
                  <StatSubValue style={{ color: '#007AFF', fontWeight: '700' }}>
                    {metricsData?.total_channels && metricsData.total_videos 
                      ? (metricsData.total_videos / metricsData.total_channels).toFixed(1) 
                      : '0'}
                  </StatSubValue>
                </StatSubContent>
              </StatSubItem>
            </StatCard>
            
            {/* Card 3: Comentários & Interações */}
            <StatCard>
              <StatCardHeader>
                <StatLabel>Comments & Interactions</StatLabel>
                <StatIconContainer color="#34C759">
                  <IconComponent icon={FaIcons.FaComments} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue style={{ 
                background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.05), rgba(52, 199, 89, 0.15))', 
                color: '#34C759'
              }}>
                {metricsData?.posts.toLocaleString() || '0'} Comments
              </StatValue>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(52, 199, 89, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaReplyAll} style={{ color: '#34C759' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Avg Comments per Video</StatSubLabel>
                  <StatSubValue style={{ color: '#34C759', fontWeight: '700' }}>
                    {metricsData?.posts && metricsData.total_videos 
                      ? (metricsData.posts / metricsData.total_videos).toFixed(1) 
                      : '0'}
                  </StatSubValue>
                </StatSubContent>
              </StatSubItem>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(52, 199, 89, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaThumbsUp} style={{ color: '#FF9500' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Likes per 1000 Views</StatSubLabel>
                  <StatSubValue>
                    {metricsData?.total_likes && metricsData.total_views 
                      ? ((metricsData.total_likes / metricsData.total_views) * 1000).toFixed(1) 
                      : '0'}
                  </StatSubValue>
                </StatSubContent>
              </StatSubItem>
            </StatCard>
            
            {/* Card 4: Performance & Analytics */}
            <StatCard>
              <StatCardHeader>
                <StatLabel>Performance Analytics</StatLabel>
                <StatIconContainer color="#FF9500">
                  <IconComponent icon={FaIcons.FaChartLine} />
                </StatIconContainer>
              </StatCardHeader>
              <StatValue style={{ 
                background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.05), rgba(255, 149, 0, 0.15))', 
                color: '#FF9500'
              }}>
                Content Metrics
              </StatValue>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(255, 149, 0, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaEye} style={{ color: '#FF9500' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Avg Views per Video</StatSubLabel>
                  <StatSubValue style={{ color: '#FF9500', fontWeight: '700' }}>
                    {metricsData?.total_views && metricsData.total_videos
                      ? formatNumber(Math.round(metricsData.total_views / metricsData.total_videos))
                      : '0'}
                  </StatSubValue>
                </StatSubContent>
              </StatSubItem>
              
              <StatSubItem>
                <StatSubIcon style={{ backgroundColor: 'rgba(255, 149, 0, 0.08)' }}>
                  <IconComponent icon={FaIcons.FaBullseye} style={{ color: '#FF2D55' }} />
                </StatSubIcon>
                <StatSubContent>
                  <StatSubLabel>Engagement Score</StatSubLabel>
                  <StatSubValue style={{ 
                    color: '#34C759', 
                    fontWeight: '700' 
                  }}>
                    {metricsData ? 
                      (((parseFloat(metricsData.media) * 20) + 
                      (metricsData.total_videos > 0 ? 40 : 0) + 
                      (metricsData.posts > 10 ? 40 : metricsData.posts * 4))).toFixed(0) + '/100'
                      : '0/100'}
                  </StatSubValue>
                </StatSubContent>
              </StatSubItem>
            </StatCard>
          </StatsGrid>
          
          <ChartRow>
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaChartArea} />
                  Engagement Metrics
                </ChartTitle>
                <TimeSelector>
                  <TimeOption active={timeframe === 'week'} onClick={() => setTimeframe('week')}>Week</TimeOption>
                  <TimeOption active={timeframe === 'month'} onClick={() => setTimeframe('month')}>Month</TimeOption>
                  <TimeOption active={timeframe === 'quarter'} onClick={() => setTimeframe('quarter')}>Quarter</TimeOption>
                  <TimeOption active={timeframe === 'year'} onClick={() => setTimeframe('year')}>Year</TimeOption>
                </TimeSelector>
              </ChartHeader>
              
              <ChartBody>
                <div style={{ height: 300, width: '100%', padding: '0 16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={engagementData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5856D6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#5856D6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF9500" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#FF9500" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34C759" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#34C759" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF2D55" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#FF2D55" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        name="Views" 
                        stroke="#5856D6" 
                        fillOpacity={1}
                        fill="url(#colorViews)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="likes" 
                        name="Likes" 
                        stroke="#FF9500" 
                        fillOpacity={1}
                        fill="url(#colorLikes)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="comments" 
                        name="Comments" 
                        stroke="#34C759" 
                        fillOpacity={1}
                        fill="url(#colorComments)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="subscribers" 
                        name="New Subscribers" 
                        stroke="#FF2D55" 
                        fillOpacity={1}
                        fill="url(#colorSubscribers)" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartBody>
            </ChartContainer>
            
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaChartPie} />
                  Content Distribution
                </ChartTitle>
              </ChartHeader>
              
              <ChartBody>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getContentDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${percent * 100}%`}
                      >
                        {getContentDistributionData().map((entry, index) => {
                          const COLORS = ['#5856D6', '#FF9500', '#34C759', '#FF2D55', '#007AFF', '#5AC8FA', '#BF5AF2', '#FF3B30'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{
                                background: 'white',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #f0f0f0',
                                maxWidth: '280px'
                              }}>
                                <div>
                                  <p style={{ 
                                    margin: '0 0 8px', 
                                    fontWeight: 'bold', 
                                    fontSize: '14px', 
                                    color: '#333',
                                    wordWrap: 'break-word'
                                  }}>
                                    {data.fullName}
                                  </p>
                                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
                                    <strong>Videos:</strong> {data.videos} ({data.value}%)
                                  </p>
                                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
                                    <strong>Views:</strong> {data.views}
                                  </p>
                                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
                                    <strong>Likes:</strong> {data.likes}
                                  </p>
                                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
                                    <strong>Relevance:</strong> {data.relevance}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartBody>
            </ChartContainer>
          </ChartRow>
          
          <ChartRow>
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaPlay} />
                  Top Performing Videos
                </ChartTitle>
              </ChartHeader>
              
              <VideoTable>
                <VideoTableHeader>
                  <div>Video</div>
                  <div>Views</div>
                  <div>Comments</div>
                  <div>Likes</div>
                  <div>Retention</div>
                </VideoTableHeader>
                
                {videoPerformanceData.map((video) => (
                  <VideoTableRow key={video.id}>
                    <VideoTitle>
                      <VideoThumbnail>
                        <img src={video.thumbnail} alt={video.name} />
                      </VideoThumbnail>
                      <VideoTitleText>
                        {video.name}
                        {video.badge && (
                          <VideoBadge type={video.badge}>
                            {video.badge === 'new' ? 'New' : 'Trending'}
                          </VideoBadge>
                        )}
                      </VideoTitleText>
                    </VideoTitle>
                    <VideoStat>
                      {(video.views / 1000).toFixed(0)}K
                    </VideoStat>
                    <VideoStat>
                      {(video.comments / 1000).toFixed(1)}K
                    </VideoStat>
                    <VideoStat>
                      {(video.likes / 1000).toFixed(1)}K
                    </VideoStat>
                    <VideoStat>
                      {video.retention}%
                    </VideoStat>
                  </VideoTableRow>
                ))}
              </VideoTable>
            </ChartContainer>
            
            <ChartContainer>
              <ChartHeader>
                <ChartTitle>
                  <IconComponent icon={FaIcons.FaBullseye} />
                  Performance Metrics
                </ChartTitle>
              </ChartHeader>
              
              <ChartBody>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} width={500} height={300} data={performanceMetricsData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Your Channel" dataKey="current" stroke="#5856D6" fill="#5856D6" fillOpacity={0.5} />
                      <Radar name="Industry Benchmark" dataKey="benchmark" stroke="#FF9500" fill="#FF9500" fillOpacity={0.3} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </ChartBody>
            </ChartContainer>
          </ChartRow>
        </>
      )}
      
      {activeTab === 'channels' && (
        <>
          <FilterBar>
            <FilterGroup>
              <FilterButton active={channelFilter === 'all'} onClick={() => setChannelFilter('all')}>
                <IconComponent icon={FaIcons.FaListUl} />
                All Channels
              </FilterButton>
              <FilterButton active={channelFilter === 'active'} onClick={() => setChannelFilter('active')}>
                <IconComponent icon={FaIcons.FaCheck} />
                Active
              </FilterButton>
              <FilterButton active={channelFilter === 'inactive'} onClick={() => setChannelFilter('inactive')}>
                <IconComponent icon={FaIcons.FaPause} />
                Inactive
              </FilterButton>
            </FilterGroup>
            
            <SearchContainer>
              <SearchIcon>
                <IconComponent icon={FaIcons.FaSearch} />
              </SearchIcon>
              <SearchInput 
                placeholder="Search channels..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
          </FilterBar>
          
          <ChannelsContainer>
            <ChannelsHeader>
              <SectionTitle>Your Channels</SectionTitle>
            </ChannelsHeader>
            
            <ChannelList>
              {isLoadingChannels ? (
                // Loading state with 3 placeholder cards
                Array(3).fill(0).map((_, index) => (
                  <ChannelCardWrapper 
                    key={`loading-${index}`}
                    active={false}
                    onClick={() => {}}
                    style={{ opacity: 0.6 }}
                  >
                    <ChannelIconWrapper>
                    <ChannelIcon>
                      <IconComponent icon={FaIcons.FaYoutube} />
                    </ChannelIcon>
                    </ChannelIconWrapper>
                    
                    <ChannelInfo>
                      <ChannelName>Loading...</ChannelName>
                      <ChannelStatsGrid>
                        <ChannelStatItem>
                          <IconComponent icon={FaIcons.FaUser} />
                          Loading...
                        </ChannelStatItem>
                      </ChannelStatsGrid>
                    </ChannelInfo>
                  </ChannelCardWrapper>
                ))
              ) : channels.length === 0 ? (
                // Empty state
                <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
                    <IconComponent icon={FaIcons.FaYoutube} />
                  </div>
                  <h3>No YouTube channels found</h3>
                  <p>Add YouTube channels to your project to see them here</p>
                  <div style={{ marginTop: '24px' }}>
                    <ActionButton variant="primary" leftIcon={<IconComponent icon={FaIcons.FaPlus} />}>
                      Add Channel
                    </ActionButton>
                  </div>
                </div>
              ) : (
                // Actual channel data
                channels
                  .filter(channel => {
                    // Filtro por status baseado apenas no campo is_active
                    let statusMatch = false;
                    
                    if (channelFilter === 'all') {
                      statusMatch = true;
                    } else if (channelFilter === 'active') {
                      // Usar apenas o campo is_active
                      statusMatch = (channel.is_active === true);
                    } else if (channelFilter === 'inactive') {
                      // Usar apenas o campo is_active
                      statusMatch = (channel.is_active === false);
                    }
                    
                    // Filtro por nome com verificação de segurança
                    let nameMatch = searchTerm === '';
                    if (!nameMatch) {
                      const channelName = channel.channel_name || channel.name || '';
                      nameMatch = channelName.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                    
                    return statusMatch && nameMatch;
                  })
                  .map(channel => (
                  <ChannelCardWrapper 
                    key={channel.id} 
                    active={selectedChannel === channel.id}
                      onClick={() => handleChannelSelect(channel.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedChannelForToggle(channel);
                      setIsStatusPopupOpen(true);
                    }}
                  >
                      <CardHeader>
                        <InfoTooltip text="Channel relevance score based on engagement">
                          <ScoreBadge>
                            <IconComponent icon={FaIcons.FaChartLine} />
                            Score: {channel.avg_relevance_score || '0.0'}
                          </ScoreBadge>
                        </InfoTooltip>
                        
                    <ChannelBadge 
                      status={channel.is_active === true ? 'active' : 'inactive'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChannelForToggle(channel);
                        setIsStatusPopupOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {channel.is_active === true && <IconComponent icon={FaIcons.FaCheck} />}
                      {channel.is_active === false && <IconComponent icon={FaIcons.FaPause} />}
                      {channel.is_active === true ? 'Active' : 'Inactive'}
                    </ChannelBadge>
                      </CardHeader>
                      
                      <CardContent>
                        <ChannelImageWrapper>
                          <ChannelImage imageUrl={channel.imagem}>
                            {!channel.imagem && <IconComponent icon={FaIcons.FaYoutube} />}
                          </ChannelImage>
                        </ChannelImageWrapper>
                        
                        <ChannelInfoContainer>
                      <ChannelName>{channel.channel_name || channel.Nome || channel.name || 'Unnamed Channel'}</ChannelName>
                          
                          <ChannelStatsGrid>
                            <StatRow>
                              <StatIcon>
                          <IconComponent icon={FaIcons.FaUser} />
                              </StatIcon>
                              <InfoTooltip text="Total subscribers">
                                <StatText>{channel.subscriber_count}</StatText>
                              </InfoTooltip>
                            </StatRow>
                            
                            <StatRow>
                              <StatIcon>
                          <IconComponent icon={FaIcons.FaEye} />
                              </StatIcon>
                              <InfoTooltip text="Total views">
                                <StatText>{channel.view_count}</StatText>
                              </InfoTooltip>
                            </StatRow>
                            
                            <StatRow>
                              <StatIcon>
                          <IconComponent icon={FaIcons.FaClock} />
                              </StatIcon>
                              <InfoTooltip text="Last video published">
                                <StatText>{channel.last_video}</StatText>
                              </InfoTooltip>
                            </StatRow>
                            
                            <StatRow>
                              <StatIcon>
                                <IconComponent icon={FaIcons.FaVideo} />
                              </StatIcon>
                              <InfoTooltip text="Videos currently being monitored">
                                <HighlightedStatText>{channelVideoCount[channel.id] || 0} monitored videos</HighlightedStatText>
                              </InfoTooltip>
                            </StatRow>
                            
                            <StatRow>
                              <StatIcon>
                                <IconComponent icon={FaIcons.FaCommentAlt} />
                              </StatIcon>
                              <InfoTooltip text="Messages posted by Liftlio">
                                <HighlightedStatText>{channel.total_mensagens_postadas || 0} posts</HighlightedStatText>
                              </InfoTooltip>
                            </StatRow>
                          </ChannelStatsGrid>
                          
                          <ActionArea>
                            <IconComponent icon={FaIcons.FaHandPointer} />
                            Click to view channel videos
                          </ActionArea>
                        </ChannelInfoContainer>
                      </CardContent>
                  </ChannelCardWrapper>
                ))
              )}
            </ChannelList>
            
            {/* Status Toggle Popup */}
            {isStatusPopupOpen && selectedChannelForToggle && (
              <StatusPopup onClick={() => setIsStatusPopupOpen(false)}>
                <PopupContent onClick={(e) => e.stopPropagation()}>
                  <PopupTitle>
                    {selectedChannelForToggle.is_active === true
                      ? 'Deactivate Channel?' 
                      : 'Activate Channel?'}
                  </PopupTitle>
                  <PopupText>
                    {selectedChannelForToggle.is_active === true
                      ? 'This channel will no longer be monitored. You can reactivate it later.'
                      : 'This channel will be monitored again. You can deactivate it any time.'}
                  </PopupText>
                  <PopupActions>
                    <StatusToggleButton 
                      variant="ghost" 
                      onClick={() => setIsStatusPopupOpen(false)}
                      disabled={isUpdatingStatus}
                    >
                      Cancel
                    </StatusToggleButton>
                    <StatusToggleButton 
                      variant={selectedChannelForToggle.is_active === true ? "error" : "success"}
                      onClick={() => toggleChannelStatus(
                        selectedChannelForToggle, 
                        !!selectedChannelForToggle.is_active // Converter para boolean
                      )}
                      disabled={isUpdatingStatus}
                      leftIcon={<IconComponent icon={
                        isUpdatingStatus 
                          ? FaIcons.FaSpinner 
                          : selectedChannelForToggle.is_active === true
                            ? FaIcons.FaPause 
                            : FaIcons.FaCheck
                      } />}
                    >
                      {isUpdatingStatus 
                        ? "Updating..." 
                        : selectedChannelForToggle.is_active === true
                          ? "Deactivate" 
                          : "Activate"}
                    </StatusToggleButton>
                  </PopupActions>
                </PopupContent>
              </StatusPopup>
            )}
            
            <ButtonRow>
              <ActionButton 
                variant="ghost" 
                leftIcon={<IconComponent icon={FaIcons.FaSync} />}
                onClick={() => {
                  if (currentProject?.id) {
                    setIsLoadingChannels(true);
                    callRPC('get_channel_details', { 
                      id_projeto: currentProject.id 
                    })
                    .then(data => {
                      if (data && Array.isArray(data) && data.length > 0) {
                        // Process channels to ensure all required fields are available
                        const processedChannels = data.map(channel => {
                          // Set status based on is_active if not already set
                          if (channel.is_active !== undefined && channel.status === undefined) {
                            channel.status = channel.is_active ? 'active' : 'inactive';
                          }
                          
                          // Default to active if neither is defined
                          if (channel.status === undefined && channel.is_active === undefined) {
                            channel.status = 'active';
                          }
                          
                          // Calculate engagement rate if not provided by RPC
                          if (!channel.engagement_rate && !channel.engagementRate) {
                            const subscriberCount = parseInt(channel.subscriber_count || channel.subscribers || '0', 10);
                            const viewCount = parseInt(channel.view_count || channel.views || '0', 10);
                            
                            // Simple engagement calculation if we have both metrics
                            if (subscriberCount > 0 && viewCount > 0) {
                              const ratio = (viewCount / subscriberCount) * 100;
                              channel.engagement_rate = ratio > 100 ? '100%' : `${ratio.toFixed(1)}%`;
                            } else {
                              channel.engagement_rate = '0%';
                            }
                          }
                          
                          return channel;
                        });
                        
                        setChannels(processedChannels);
                      } else {
                        setChannels(defaultChannels);
                      }
                    })
                    .catch(error => {
                      console.error('Error refreshing channel details:', error);
                      setChannels(defaultChannels);
                    })
                    .finally(() => {
                      setIsLoadingChannels(false);
                    });
                  }
                }}
                disabled={isLoadingChannels}
              >
                {isLoadingChannels ? 'Refreshing...' : 'Refresh Data'}
              </ActionButton>
              <ActionButton variant="primary" leftIcon={<IconComponent icon={FaIcons.FaPlus} />}>
                Add New Channel
              </ActionButton>
            </ButtonRow>
          </ChannelsContainer>
        </>
      )}
      
      {activeTab === 'videos' && (
        <ChartContainer>
          {/* Channel Header Section */}
          {isLoadingChannelDetails ? (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <IconComponent icon={FaIcons.FaSpinner} style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }} />
              <p>Loading channel details...</p>
            </div>
          ) : selectedChannelDetails ? (
            <ChannelHeaderSection>
              <ChannelHeaderBanner />
              <ChannelHeaderContent>
                <ChannelHeaderAvatar 
                  imageUrl={selectedChannelDetails.thumbnails?.high?.url || 
                           selectedChannelDetails.thumbnails?.medium?.url || 
                           selectedChannelDetails.thumbnails?.default?.url || 
                           'https://via.placeholder.com/150'} 
                />
                <ChannelHeaderInfo>
                  <ChannelHeaderTitle>
                    {selectedChannelDetails.title || selectedChannelDetails.channel_name || 'YouTube Channel'}
                    <IconComponent icon={FaIcons.FaYoutube} />
                  </ChannelHeaderTitle>
                  
                  <ChannelHeaderMetrics>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaUser} />
                      <span>{formatNumber(selectedChannelDetails.statistics?.subscriberCount)} subscribers</span>
                    </ChannelHeaderMetric>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaEye} />
                      <span>{formatNumber(selectedChannelDetails.statistics?.viewCount)} views</span>
                    </ChannelHeaderMetric>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaVideo} />
                      <span>{formatNumber(selectedChannelDetails.statistics?.videoCount)} videos</span>
                    </ChannelHeaderMetric>
                    <ChannelHeaderMetric>
                      <IconComponent icon={FaIcons.FaGlobe} />
                      <span>Country: {selectedChannelDetails.country || 'N/A'}</span>
                    </ChannelHeaderMetric>
                  </ChannelHeaderMetrics>
                  
                  {selectedChannelDetails.description && selectedChannelDetails.description.trim() !== '' && (
                    <ChannelHeaderDescription>
                      {selectedChannelDetails.description}
                    </ChannelHeaderDescription>
                  )}
                  
                  {selectedChannelDetails.customUrl && (
                    <ChannelHeaderUrl 
                      href={`https://youtube.com/${selectedChannelDetails.customUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <IconComponent icon={FaIcons.FaExternalLinkAlt} />
                      Visit channel
                    </ChannelHeaderUrl>
                  )}
                </ChannelHeaderInfo>
              </ChannelHeaderContent>
            </ChannelHeaderSection>
          ) : null}
          
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaVideo} />
              Monitored Videos of {channels.find(c => c.id === selectedChannel)?.channel_name || "Channel"}
            </ChartTitle>
            <FilterGroup>
              <FilterButton>
                <IconComponent icon={FaIcons.FaFilter} />
                Filter
              </FilterButton>
              <FilterButton>
                <IconComponent icon={FaIcons.FaSortAmountDown} />
                Sort
              </FilterButton>
            </FilterGroup>
          </ChartHeader>
          
          {isLoadingVideos ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#666', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaSpinner} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <p>Loading videos...</p>
            </div>
          ) : channelVideos.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaVideo} />
              </div>
              <h3>No videos found for this channel</h3>
              <p>This channel hasn't uploaded any videos yet or they're not indexed</p>
            </div>
          ) : (
            <div style={{ padding: '0 20px' }}>
              <VideoTable style={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <VideoTableHeader style={{ 
                  background: `${withOpacity(COLORS.ACCENT, 0.05)}`,
                  fontWeight: 'bold' 
                }}>
              <div>Video</div>
              <div>Views</div>
              <div>Comments</div>
                  <div>Posts</div>
                  <div>Category</div>
                  <div>Relevance</div>
            </VideoTableHeader>
            
                {channelVideos.map((video: any) => {
                  const thumbnailUrl = getThumbnailUrl(video);
                  
                  return (
                    <VideoTableRow 
                      key={video.id}
                      onClick={() => handleVideoSelect(video.id)}
                      style={{ 
                        cursor: 'pointer', 
                        background: selectedVideo === video.id ? withOpacity(COLORS.ACCENT, 0.1) : 'inherit',
                        transition: 'all 0.2s ease'
                      }}
                    >
                <VideoTitle>
                  <VideoThumbnail>
                          <img 
                            src={thumbnailUrl}
                            alt={video.nome_do_video || "Video thumbnail"}
                            onError={(e) => {
                              if ((e.target as HTMLImageElement).src.includes('ytimg.com')) {
                                const videoTitle = video.nome_do_video || video.title || "Untitled";
                                const firstLetter = videoTitle.charAt(0).toUpperCase();
                                (e.target as HTMLImageElement).src = `https://placehold.co/640x360/5F27CD/FFFFFF?text=${encodeURIComponent(firstLetter)}`;
                              }
                            }}
                            style={{ 
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                  </VideoThumbnail>
                  <VideoTitleText>
                          <VideoMainTitle>{video.nome_do_video || video.title || "Untitled Video"}</VideoMainTitle>
                          
                          {video.descricao && (
                            <VideoDescription>
                              {video.descricao.length > 80 
                                ? `${video.descricao.substring(0, 80)}...` 
                                : video.descricao}
                            </VideoDescription>
                          )}
                          
                          <ExpandButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVideoForDetail(video);
                            }}
                          >
                            <IconComponent icon={FaIcons.FaExpandAlt} />
                            View full details
                          </ExpandButton>
                  </VideoTitleText>
                </VideoTitle>
                <VideoStat>
                        {video.views ? (video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views) : '0'}
                </VideoStat>
                <VideoStat>
                        {video.commets || video.comments || '0'}
                </VideoStat>
                <VideoStat>
                        {video.total_posts || 0}
                        <VideoStatLabel>Posts</VideoStatLabel>
                </VideoStat>
                <VideoStat>
                        {video.content_category || video.category || "Uncategorized"}
                      </VideoStat>
                      <VideoStat>
                        {video.relevance_score ? `${(video.relevance_score * 100).toFixed(0)}%` : '0%'}
                </VideoStat>
              </VideoTableRow>
                  );
                })}
          </VideoTable>
            </div>
          )}
          
          <ButtonRow>
            <ActionButton variant="ghost" leftIcon={<IconComponent icon={FaIcons.FaArrowLeft} />} onClick={() => setActiveTab('channels')}>
              Back to Channels
            </ActionButton>
            <ActionButton variant="ghost" leftIcon={<IconComponent icon={FaIcons.FaFileExport} />}>
              Export Data
            </ActionButton>
          </ButtonRow>
        </ChartContainer>
      )}
      
      {activeTab === 'comments' && (
        <ChartContainer>
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaComment} />
              Comments for Video: {selectedVideo?.nome_do_video || "Selected Video"}
            </ChartTitle>
          </ChartHeader>
          
          {/* Adicionar a visualização do vídeo */}
          {selectedVideo && (
            <VideoDetailsSection style={{ 
              marginBottom: '24px', 
              padding: '16px',
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row',
                gap: '20px',
                flexWrap: 'wrap'
              }}>
                <div style={{ 
                  flex: '0 0 320px',
                  marginBottom: '16px'
                }}>
                  <VideoThumbnail style={{ 
                    width: '100%', 
                    height: '180px',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={getThumbnailUrl(selectedVideo)}
                      alt={selectedVideo.nome_do_video || "Video thumbnail"}
                      onError={(e) => {
                        if ((e.target as HTMLImageElement).src.includes('ytimg.com')) {
                          const videoTitle = selectedVideo.nome_do_video || selectedVideo.title || "Untitled";
                          const firstLetter = videoTitle.charAt(0).toUpperCase();
                          (e.target as HTMLImageElement).src = `https://placehold.co/640x360/5F27CD/FFFFFF?text=${encodeURIComponent(firstLetter)}`;
                        }
                      }}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </VideoThumbnail>
                  {selectedVideo.video_id_youtube && (
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <a 
                        href={`https://www.youtube.com/watch?v=${selectedVideo.video_id_youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#5F27CD',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <IconComponent icon={FaIcons.FaYoutube} style={{ marginRight: '6px' }} />
                        Watch on YouTube
                      </a>
            </div>
                  )}
            </div>
                
                <div style={{ flex: '1 1 320px' }}>
                  <h3 style={{ 
                    margin: '0 0 12px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {selectedVideo.nome_do_video || selectedVideo.title || "Untitled Video"}
                  </h3>
                  
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <IconComponent icon={FaIcons.FaEye} style={{ marginRight: '6px' }} />
                      {selectedVideo.views ? (selectedVideo.views >= 1000 ? `${(selectedVideo.views / 1000).toFixed(1)}K` : selectedVideo.views) : '0'} views
          </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <IconComponent icon={FaIcons.FaComment} style={{ marginRight: '6px' }} />
                      {selectedVideo.commets || selectedVideo.comments || '0'} comments
                    </div>
                    
                    {selectedVideo.content_category && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        <IconComponent icon={FaIcons.FaTag} style={{ marginRight: '6px' }} />
                        {selectedVideo.content_category}
                      </div>
                    )}
                    
                    {selectedVideo.relevance_score && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontSize: '14px',
                        color: '#666',
                        background: '#f5f5f5',
                        padding: '4px 10px',
                        borderRadius: '12px'
                      }}>
                        <IconComponent icon={FaIcons.FaChartLine} style={{ marginRight: '6px' }} />
                        Relevance: {(selectedVideo.relevance_score * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  
                  {selectedVideo.descricao && (
                    <div style={{ 
                      fontSize: '14px',
                      color: '#555',
                      maxHeight: '100px',
                      overflowY: 'auto',
                      padding: '10px',
                      background: '#f9f9f9',
                      borderRadius: '6px'
                    }}>
                      {selectedVideo.descricao.length > 300 
                        ? `${selectedVideo.descricao.substring(0, 300)}...` 
                        : selectedVideo.descricao}
                    </div>
                  )}
                </div>
              </div>
            </VideoDetailsSection>
          )}
          
          <ChartHeader>
            <ChartTitle>
              <IconComponent icon={FaIcons.FaComments} />
              {filteredComments.length} Comments
            </ChartTitle>
          </ChartHeader>
          
          {isLoadingComments ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#666', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaSpinner} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <p>Loading comments...</p>
            </div>
          ) : filteredComments.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}>
                <IconComponent icon={FaIcons.FaComments} />
            </div>
              <h3>No comments found for this video</h3>
              <p>This video doesn't have any posted comments yet</p>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              {filteredComments.map(comment => (
                <div 
                  key={comment.id_comentario} 
                  style={{ 
                    padding: '15px', 
                    borderBottom: '1px solid #eee', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    background: '#fff',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 'bold' }}>{comment.author_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {comment.published_at || comment.updated_at || 'N/A'}
          </div>
                  </div>
                  <div>{comment.text_original}</div>
                  <div style={{ fontSize: '0.9rem', color: '#666', display: 'flex', gap: '10px' }}>
                    <span><IconComponent icon={FaIcons.FaThumbsUp} /> {comment.like_count}</span>
                    <span><IconComponent icon={FaIcons.FaReply} /> {comment.total_reply_count} replies</span>
                    {comment.lead_score && 
                      <span><IconComponent icon={FaIcons.FaStar} /> Score: {comment.lead_score}</span>
                    }
                    {comment.justificativa_comentario && (
                      <button 
                        onClick={() => showJustificationPopup('Comment Justification', comment.justificativa_comentario)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#5F27CD',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0',
                          fontSize: '0.9rem'
                        }}
                      >
                        <IconComponent icon={FaIcons.FaInfoCircle} style={{ marginRight: '4px' }} />
                        Justification
                      </button>
                    )}
                  </div>
                  
                  {comment.mensagem && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px', 
                      background: '#f5f8fa', 
                      borderRadius: '6px',
                      borderLeft: '3px solid #5F27CD' 
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#5F27CD', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><IconComponent icon={FaIcons.FaReply} /> Reply:</span>
                        {comment.justificativa_mensagem && (
                          <button 
                            onClick={() => showJustificationPopup('Reply Justification', comment.justificativa_mensagem || '')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#5F27CD',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0',
                              fontSize: '0.85rem'
                            }}
                          >
                            <IconComponent icon={FaIcons.FaInfoCircle} style={{ marginRight: '4px' }} />
                            Justification
                          </button>
                        )}
                      </div>
                      <div>{comment.mensagem}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                        Status: {comment.respondido ? 'Sent' : 'Pending'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <ButtonRow>
            <ActionButton variant="ghost" leftIcon={<IconComponent icon={FaIcons.FaArrowLeft} />} onClick={() => setActiveTab('videos')}>
              Back to Videos
            </ActionButton>
          </ButtonRow>
        </ChartContainer>
      )}
      
      {/* Modal para exibir detalhes completos do vídeo */}
      {selectedVideoForDetail && (
        <VideoDetailModal onClick={() => setSelectedVideoForDetail(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedVideoForDetail.nome_do_video || selectedVideoForDetail.title || "Untitled Video"}</ModalTitle>
              <ModalClose onClick={() => setSelectedVideoForDetail(null)}>×</ModalClose>
            </ModalHeader>
            <ModalBody>
              <ModalThumbnail>
                <img 
                  src={getThumbnailUrl(selectedVideoForDetail)}
                  alt={selectedVideoForDetail.nome_do_video || "Video thumbnail"}
                  onError={(e) => {
                    const videoTitle = selectedVideoForDetail.nome_do_video || selectedVideoForDetail.title || "Untitled";
                    const firstLetter = videoTitle.charAt(0).toUpperCase();
                    (e.target as HTMLImageElement).src = `https://placehold.co/1280x720/5F27CD/FFFFFF?text=${encodeURIComponent(firstLetter)}`;
                  }}
                />
              </ModalThumbnail>
              
              {selectedVideoForDetail.descricao && (
                <ModalDescription>
                  {selectedVideoForDetail.descricao}
                </ModalDescription>
              )}
              
              <ModalStats>
                <ModalStatItem>
                  <ModalStatValue>
                    {selectedVideoForDetail.views 
                      ? (selectedVideoForDetail.views >= 1000 
                          ? `${(selectedVideoForDetail.views / 1000).toFixed(1)}K` 
                          : selectedVideoForDetail.views) 
                      : '0'}
                  </ModalStatValue>
                  <ModalStatLabel>Views</ModalStatLabel>
                </ModalStatItem>
                
                <ModalStatItem>
                  <ModalStatValue>
                    {selectedVideoForDetail.commets || selectedVideoForDetail.comments || '0'}
                  </ModalStatValue>
                  <ModalStatLabel>Comments</ModalStatLabel>
                </ModalStatItem>
                
                <ModalStatItem>
                  <ModalStatValue>
                    {selectedVideoForDetail.relevance_score 
                      ? `${(selectedVideoForDetail.relevance_score * 100).toFixed(0)}%` 
                      : '0%'}
                  </ModalStatValue>
                  <ModalStatLabel>Relevance</ModalStatLabel>
                </ModalStatItem>
              </ModalStats>
              
              {selectedVideoForDetail.target_audience && (
                <div>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px' }}>Target Audience</h4>
                  <p style={{ color: '#666', marginBottom: '16px' }}>{selectedVideoForDetail.target_audience}</p>
                </div>
              )}
              
              <ModalActions>
                <ModalActionButton 
                  variant="ghost" 
                  leftIcon={<IconComponent icon={FaIcons.FaTimes} />}
                  onClick={() => setSelectedVideoForDetail(null)}
                >
                  Close
                </ModalActionButton>
                
                {selectedVideoForDetail.video_id_youtube && (
                  <ModalActionButton 
                    variant="primary" 
                    leftIcon={<IconComponent icon={FaIcons.FaYoutube} />}
                    onClick={() => {
                      window.open(`https://www.youtube.com/watch?v=${selectedVideoForDetail.video_id_youtube}`, '_blank');
                    }}
                  >
                    Watch on YouTube
                  </ModalActionButton>
                )}
              </ModalActions>
            </ModalBody>
          </ModalContent>
        </VideoDetailModal>
      )}
      
      {/* Popup de justificativa */}
      {showJustification && currentJustification && (
        <JustificationPopup onClick={() => setShowJustification(false)}>
          <JustificationContent onClick={(e) => e.stopPropagation()}>
            <JustificationHeader>
              {currentJustification.title}
              <CloseButton onClick={() => setShowJustification(false)}>
                <IconComponent icon={FaIcons.FaTimes} />
              </CloseButton>
            </JustificationHeader>
            
            <JustificationText>{currentJustification.text}</JustificationText>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ButtonUI 
                variant="ghost" 
                onClick={() => setShowJustification(false)}
              >
                Close
              </ButtonUI>
            </div>
          </JustificationContent>
        </JustificationPopup>
      )}
    </PageContainer>
  );
};

export default YoutubeMonitoring;