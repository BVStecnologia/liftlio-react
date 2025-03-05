import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import * as FaIcons from 'react-icons/fa';
import { IconType } from 'react-icons';
import Card from '../components/Card';
import SentimentIndicator from '../components/SentimentIndicator';
import { IconComponent } from '../utils/IconHelper';

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

// Page container with max width and centering
const PageContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
  position: relative;
  overflow: hidden;
  
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
  margin-bottom: 32px;
  animation: ${fadeIn} 0.5s ease-out forwards;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 20px;
    padding: 0 4px;
  }
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['3xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
  
  @media (max-width: 768px) {
    font-size: ${props => props.theme.fontSizes['2xl']};
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    font-size: ${props => props.theme.fontSizes.xl};
    gap: 8px;
  }
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
        background: ${props.theme.colors.gradient.primary};
        color: white;
        border: none;
        box-shadow: ${props.theme.shadows.sm};
        
        &:hover {
          box-shadow: ${props.theme.shadows.md};
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'secondary') {
      return css`
        background: ${props.theme.colors.gradient.secondary};
        color: white;
        border: none;
        box-shadow: ${props.theme.shadows.sm};
        
        &:hover {
          box-shadow: ${props.theme.shadows.md};
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'outline') {
      return css`
        background: transparent;
        color: ${props.theme.colors.primary};
        border: 1px solid ${props.theme.colors.primary};
        
        &:hover {
          background: ${props.theme.colors.primary}10;
          transform: translateY(-2px);
        }
      `;
    } else {
      return css`
        background: transparent;
        color: ${props.theme.colors.darkGrey};
        border: 1px solid ${props.theme.colors.grey};
        
        &:hover {
          background: ${props.theme.colors.lightGrey};
          border-color: ${props.theme.colors.darkGrey};
          color: ${props.theme.colors.text};
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

// Enhanced stat card
const StatCard = styled.div<{ gridSpan?: number }>`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  padding: 24px;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  grid-column: span ${props => props.gridSpan || 3};
  animation: ${fadeIn} 0.6s ease-out forwards;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  @media (max-width: 1200px) {
    grid-column: span ${props => Math.min(props.gridSpan || 3, 6)};
  }
  
  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const StatCardTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.darkGrey};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const StatDisplay = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.fontSizes['4xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  background: ${props => props.theme.colors.gradient.primary};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
`;

const StatGrowth = styled.div<{ positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.error};
  background-color: ${props => props.positive ? 'rgba(0, 201, 136, 0.1)' : 'rgba(255, 64, 87, 0.1)'};
  padding: 4px 8px;
  border-radius: ${props => props.theme.radius.pill};
  margin-left: 12px;
  
  svg {
    margin-right: 4px;
  }
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  align-items: center;
`;

const StatIconContainer = styled.div`
  position: relative;
`;

const StatIcon = styled.div<{ bgColor: string; animationDelay?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${props => props.theme.radius.lg};
  background: ${props => props.bgColor};
  color: white;
  font-size: 1.5rem;
  box-shadow: ${props => props.theme.shadows.md};
  position: relative;
  overflow: hidden;
  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${props => props.animationDelay || '0s'};
  
  &::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    background: linear-gradient(90deg, 
      rgba(255,255,255,0) 0%, 
      rgba(255,255,255,0.3) 50%, 
      rgba(255,255,255,0) 100%);
    background-size: 200% 100%;
    animation: ${shimmer} 3s infinite linear;
    z-index: 1;
  }
  
  svg {
    position: relative;
    z-index: 2;
  }
`;

// Charts section styling
const ChartCard = styled(StatCard)`
  padding: 0;
  overflow: hidden;
  
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
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  
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
  color: ${props => props.theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    color: ${props => props.theme.colors.primary};
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
  background: ${props => props.active ? props.theme.colors.primary : 'white'};
  color: ${props => props.active ? 'white' : props.theme.colors.darkGrey};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey};
  border-radius: ${props => props.theme.radius.pill};
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
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey}20;
    color: ${props => props.active ? 'white' : props.theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const ChartTabs = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
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
  border-bottom: 3px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.medium};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
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
    color: ${props => props.theme.colors.primary};
  }
`;

// Keyword insights section
const KeywordTable = styled.div`
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  overflow-x: auto;
  animation: ${fadeIn} 0.8s ease-out forwards;
  margin-top: 32px;
  
  @media (max-width: 768px) {
    margin-top: 24px;
    border-radius: ${props => props.theme.radius.md};
  }
  
  @media (max-width: 480px) {
    margin-top: 20px;
    border-radius: ${props => props.theme.radius.sm};
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 2fr 1.2fr 1.5fr;
  padding: 16px 24px;
  background: ${props => props.theme.colors.background};
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
  
  @media (max-width: 1200px) {
    display: none;
  }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: ${props => props.theme.fontSizes.xs};
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 2fr 1.2fr 1.5fr;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  align-items: center;
  transition: all 0.2s ease;
  min-width: 1000px;
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
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
      font-weight: ${props => props.theme.fontWeights.semiBold};
      margin-bottom: 8px;
    }
  }
`;

const KeywordCell = styled(TableCell)`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
`;

const NumericCell = styled(TableCell)`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.darkGrey};
`;

// Video links styling
const VideoLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VideoLink = styled.a`
  color: ${props => props.theme.colors.primary};
  font-size: ${props => props.theme.fontSizes.sm};
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(4px);
    color: ${props => props.theme.colors.secondary};
  }
  
  svg {
    margin-right: 6px;
    font-size: 0.9rem;
  }
`;

// Tags styling
const CategoryTag = styled.span`
  background: ${props => props.theme.colors.gradient.primary};
  color: white;
  padding: 6px 12px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  display: inline-block;
  box-shadow: ${props => props.theme.shadows.sm};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
`;

const AudienceTag = styled.span`
  background-color: ${props => props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.darkGrey};
  padding: 4px 10px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
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
  background: white;
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
  }
`;

const ContentTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: ${props => props.theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    color: ${props => props.theme.colors.primary};
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
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const SearchInput = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  @media (max-width: 768px) {
    max-width: 100%;
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

// Enhanced data objects
const statsCards = [
  {
    id: 1,
    title: 'Total Engagements',
    value: '55',
    icon: 'FaComments',
    color: 'linear-gradient(135deg, #673AB7 0%, #9575CD 100%)',
    description: 'Engagements posted',
    trend: { value: '+12%', positive: true }
  },
  {
    id: 2,
    title: 'LEDs',
    value: '0',
    icon: 'FaVideo',
    color: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
    description: 'LEDs Posted',
    trend: null
  },
  {
    id: 3,
    title: 'Activities',
    value: '128',
    icon: 'FaChartLine',
    color: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
    description: 'Total activities this month',
    trend: { value: '+28%', positive: true }
  },
  {
    id: 4,
    title: 'Reach',
    value: '8.9K',
    icon: 'FaUsers',
    color: 'linear-gradient(135deg, #2196F3 0%, #03A9F4 100%)',
    description: 'People reached',
    trend: { value: '+5%', positive: true }
  }
];

// Sample data for charts and graphs
const chartData = [
  { name: 'Feb 24', views: 15000, engagement: 7000, leads: 1200 },
  { name: 'Feb 25', views: 13000, engagement: 6000, leads: 1000 },
  { name: 'Feb 26', views: 12000, engagement: 7500, leads: 1300 },
  { name: 'Feb 27', views: 13500, engagement: 8000, leads: 1400 },
  { name: 'Feb 28', views: 16000, engagement: 9500, leads: 1800 },
  { name: 'Mar 1', views: 19000, engagement: 11000, leads: 2100 },
  { name: 'Mar 2', views: 22000, engagement: 13000, leads: 2700 },
];

const pieChartData = [
  { name: 'YouTube', value: 55, color: '#FF0000' },
  { name: 'Google', value: 25, color: '#4285F4' },
  { name: 'Social Media', value: 15, color: '#4CAF50' },
  { name: 'Direct', value: 5, color: '#FFC107' },
];

const keywordsData = [
  {
    id: 1,
    keyword: 'ai product reviews',
    sentiment: 82.5,
    views: 23221,
    videos: 4,
    likes: 97,
    comments: 8,
    topVideos: ['AI Product Review Guide', 'Best AI Products 2025', 'AI Tools Comparison'],
    category: 'AI Content Creation',
    audience: 'Affiliate marketers'
  },
  {
    id: 2,
    keyword: 'ai affiliate marketing',
    sentiment: 83.75,
    views: 138917,
    videos: 4,
    likes: 1400,
    comments: 48,
    topVideos: ['AI Affiliate Marketing Guide', 'Passive Income with AI', '$5K/Month AI Strategy'],
    category: 'AI-Powered Affiliate',
    audience: 'Affiliate marketers'
  },
  {
    id: 3,
    keyword: 'passive income with ai',
    sentiment: 68.75,
    views: 119477,
    videos: 4,
    likes: 1281,
    comments: 48,
    topVideos: ['Passive Income Strategies', 'AI Automation for Income', 'Recurring Revenue with AI'],
    category: 'AI Business Strategy',
    audience: 'Digital entrepreneur'
  },
  {
    id: 4,
    keyword: 'ai copywriting tools',
    sentiment: 76.25,
    views: 84312,
    videos: 3,
    likes: 923,
    comments: 37,
    topVideos: ['Best AI Writing Tools', 'AI Copywriting Guide', 'Content Creation with AI'],
    category: 'AI Tools',
    audience: 'Content creators'
  }
];

// Component types
type ChartType = 'area' | 'line' | 'bar';
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
  // States
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeframe, setTimeframe] = useState<TimeframeType>('week');
  const [dataView, setDataView] = useState<DataViewType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter keywords based on search term
  const filteredKeywords = keywordsData.filter(keyword => 
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
          Dashboard Overview
        </PageTitle>
        <ActionButtons>
          <Button variant="ghost">
            <IconComponent icon={FaIcons.FaCalendarAlt} />
            Mar 2025
          </Button>
          <Button variant="outline">
            <IconComponent icon={FaIcons.FaFileExport} />
            Export
          </Button>
          <Button variant="primary">
            <IconComponent icon={FaIcons.FaPlus} />
            New Project
          </Button>
        </ActionButtons>
      </DashboardHeader>
      
      {/* Stats Overview Grid */}
      <OverviewGrid>
        {statsCards.map((stat, index) => (
          <StatCard key={stat.id} gridSpan={3}>
            <StatDisplay>
              <StatContent>
                <StatCardTitle>
                  {stat.title}
                </StatCardTitle>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>
                  {stat.description}
                  {stat.trend && (
                    <StatGrowth positive={stat.trend.positive}>
                      <IconComponent icon={stat.trend.positive ? FaIcons.FaArrowUp : FaIcons.FaArrowDown} />
                      {stat.trend.value}
                    </StatGrowth>
                  )}
                </StatLabel>
              </StatContent>
              <StatIconContainer>
                <StatIcon 
                  bgColor={stat.color} 
                  animationDelay={`${index * 0.2}s`}
                >
                  <IconComponent icon={FaIcons[stat.icon as keyof typeof FaIcons]} />
                </StatIcon>
              </StatIconContainer>
            </StatDisplay>
          </StatCard>
        ))}
        
        <StatCard gridSpan={6}>
          <StatCardTitle>
            <IconComponent icon={FaIcons.FaChartPie} />
            Traffic Sources
          </StatCardTitle>
          <ChartContainer style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </StatCard>
        
        <StatCard gridSpan={6}>
          <StatCardTitle>
            <IconComponent icon={FaIcons.FaChartBar} />
            Weekly Performance
          </StatCardTitle>
          <ChartContainer style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-4)} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="views" name="Views" fill="#673AB7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="engagement" name="Engagement" fill="#FF9800" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" name="Leads" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </StatCard>
      </OverviewGrid>
      
      {/* Performance Analytics Chart */}
      <ChartCard gridSpan={12}>
        <ChartHeader>
          <ChartTitle>
            <IconComponent icon={FaIcons.FaChartLine} />
            Performance Analytics
          </ChartTitle>
          <ChartOptions>
            <ChartOption 
              active={timeframe === 'week'} 
              onClick={() => setTimeframe('week')}
            >
              Week
            </ChartOption>
            <ChartOption 
              active={timeframe === 'month'} 
              onClick={() => setTimeframe('month')}
            >
              Month
            </ChartOption>
            <ChartOption 
              active={timeframe === 'year'} 
              onClick={() => setTimeframe('year')}
            >
              Year
            </ChartOption>
          </ChartOptions>
        </ChartHeader>
        
        <ChartBody>
          <ChartTabs>
            <ChartTab 
              active={chartType === 'area'} 
              onClick={() => setChartType('area')}
            >
              Area Chart
            </ChartTab>
            <ChartTab 
              active={chartType === 'line'} 
              onClick={() => setChartType('line')}
            >
              Line Chart
            </ChartTab>
            <ChartTab 
              active={chartType === 'bar'} 
              onClick={() => setChartType('bar')}
            >
              Bar Chart
            </ChartTab>
          </ChartTabs>
          
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#673AB7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#673AB7" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9800" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#FF9800" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    name="Views"
                    stroke="#673AB7" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: "#673AB7" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    name="Engagement"
                    stroke="#FF9800" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorEngagement)" 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    name="Leads"
                    stroke="#4CAF50" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorLeads)" 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    name="Views"
                    stroke="#673AB7" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: "#673AB7" }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: "#673AB7" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    name="Engagement"
                    stroke="#FF9800" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: "#FF9800" }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#FF9800" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    name="Leads"
                    stroke="#4CAF50" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: "#4CAF50" }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#4CAF50" }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="views" name="Views" fill="#673AB7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engagement" name="Engagement" fill="#FF9800" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" name="Leads" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </ChartBody>
      </ChartCard>
      
      {/* Keywords Insights Section */}
      <ContentHeader>
        <ContentTitle>
          <IconComponent icon={FaIcons.FaHashtag} />
          Keywords & Insights
        </ContentTitle>
        <SearchBar>
          <SearchInput>
            <SearchIcon>
              <IconComponent icon={FaIcons.FaSearch} />
            </SearchIcon>
            <Input 
              type="text" 
              placeholder="Search keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchInput>
          <Button variant="ghost">
            <IconComponent icon={FaIcons.FaFilter} />
            Filter
          </Button>
        </SearchBar>
      </ContentHeader>
      
      <KeywordTable>
        <TableHeader>
          <TableCell>Keywords</TableCell>
          <TableCell>Sentiment</TableCell>
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
              <TableCell>
                <SentimentIndicator 
                  percentage={keyword.sentiment} 
                  size="small"
                  animated={true} 
                  showIcon={true}
                />
              </TableCell>
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
    </PageContainer>
  );
};

export default Overview;