import React, { useState } from 'react';
import styled from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

// Page title with improved styling
const PageContainer = styled.div`
  padding: 16px;
`;

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 12px;
    color: ${props => props.theme.colors.primary};
  }
`;

// Improved tab design
const TabContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  background: #f0f0f5;
  border-radius: ${props => props.theme.radius.pill};
  padding: 5px;
  width: fit-content;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 10px 20px;
  background: ${props => props.active ? props.theme.colors.white : 'transparent'};
  border: none;
  border-radius: ${props => props.theme.radius.pill};
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.normal};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active ? props.theme.shadows.sm : 'none'};
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.white : 'rgba(255, 255, 255, 0.5)'};
  }
`;

// Mentions container with modern design
const MentionsContainer = styled(Card)`
  border-radius: ${props => props.theme.radius.lg};
  overflow: hidden;
`;

const MentionsTable = styled.div`
  width: 100%;
  border-spacing: 0;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2.5fr 1fr 2.5fr 3fr 1fr;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  font-size: ${props => props.theme.fontSizes.sm};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2.5fr 1fr 2.5fr 3fr 1fr;
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  align-items: stretch;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: rgba(135, 97, 197, 0.05);
  }
  
  &:last-child {
    border-bottom: none;
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

const VideoThumbnailWrapper = styled.div`
  position: relative;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
`;

const VideoThumbnail = styled.div`
  width: 210px;
  height: 120px;
  background-color: #000;
  border-radius: ${props => props.theme.radius.md};
  overflow: hidden;
  position: relative;
  box-shadow: ${props => props.theme.shadows.md};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-left: 24px solid white;
    border-bottom: 12px solid transparent;
    opacity: 0.9;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    transition: all 0.3s ease;
  }
  
  &:hover::after {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: 210px;
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
`;

const LedScoreBadge = styled.div<{ score: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  color: white;
  font-weight: ${props => props.theme.fontWeights.bold};
  font-size: 1.3rem;
  background: ${props => {
    // Dynamic gradient based on score
    if (props.score >= 80) return 'linear-gradient(135deg, #00C781 0%, #82ffc9 100%)';
    if (props.score >= 60) return 'linear-gradient(135deg, #99C781 20%, #d4ffaa 100%)';
    if (props.score >= 40) return 'linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)';
    if (props.score >= 20) return 'linear-gradient(135deg, #FF8C40 0%, #ffb27e 100%)';
    return 'linear-gradient(135deg, #FF4040 0%, #ff9b9b 100%)';
  }};
  box-shadow: ${props => props.theme.shadows.md};
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: ${props => props.theme.shadows.lg};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    background: transparent;
    border: 2px solid transparent;
    opacity: 0.5;
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
  border-radius: ${props => props.theme.radius.md};
  padding: 16px;
  width: 90%;
  position: relative;
  box-shadow: ${props => props.theme.shadows.sm};
  border-left: 4px solid ${props => 
    props.status === 'scheduled' ? props.theme.colors.warning : 
    props.status === 'posted' ? props.theme.colors.success : 
    props.theme.colors.tertiary};
`;

const ResponseStatusBadge = styled.div<{ status?: string }>`
  position: absolute;
  top: -10px;
  right: 15px;
  padding: 4px 12px;
  border-radius: ${props => props.theme.radius.pill};
  font-size: ${props => props.theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: ${props => props.theme.fontWeights.semiBold};
  color: white;
  background: ${props => 
    props.status === 'scheduled' ? props.theme.colors.warning : 
    props.status === 'posted' ? props.theme.colors.success : 
    props.theme.colors.tertiary};
  box-shadow: ${props => props.theme.shadows.sm};
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 4px;
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

// Analytics section styles
const AnalyticsSection = styled.div`
  margin-top: 30px;
  padding: 24px;
  background: white;
  border-radius: ${props => props.theme.radius.lg};
  box-shadow: ${props => props.theme.shadows.md};
`;

const AnalyticsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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

const ChartSection = styled.div`
  display: flex;
  height: 300px;
  background: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.radius.md};
  border: 1px solid ${props => props.theme.colors.lightGrey};
  overflow: hidden;
  position: relative;
`;

const ChartBars = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  width: 100%;
  padding: 20px;
`;

const ChartBar = styled.div<{ height: number; color: string }>`
  width: 40px;
  height: ${props => props.height}%;
  background: ${props => props.color};
  border-radius: 8px 8px 0 0;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scaleY(1.05);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
  
  &::after {
    content: '${props => props.height}%';
    position: absolute;
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: ${props => props.theme.colors.darkGrey};
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
  mention: typeof mentionsData[0] | null;
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
  const [activeTab, setActiveTab] = useState('posted');
  const [data, setData] = useState(mentionsData);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentMention, setCurrentMention] = useState<typeof mentionsData[0] | null>(null);
  const [timeframe, setTimeframe] = useState('week');
  
  const renderTypeCell = (mention: typeof mentionsData[0]) => {
    if (mention.type === 'Led Score') {
      return (
        <TypeCell>
          <LedScoreWrapper>
            <LedScoreLabel>{mention.type}</LedScoreLabel>
            <LedScoreBadge score={mention.score}>
              {mention.score}%
            </LedScoreBadge>
          </LedScoreWrapper>
        </TypeCell>
      );
    }
    
    return (
      <TypeCell>
        <LedScoreWrapper>
          <LedScoreLabel>{mention.type}</LedScoreLabel>
          <LedScoreBadge score={mention.score}>
            {mention.score}%
          </LedScoreBadge>
        </LedScoreWrapper>
      </TypeCell>
    );
  };
  
  const handleEditClick = (mention: typeof mentionsData[0]) => {
    setCurrentMention(mention);
    setEditModalOpen(true);
  };
  
  const handleSaveResponse = (id: number, newText: string) => {
    setData(prevData => 
      prevData.map(mention => 
        mention.id === id 
          ? { ...mention, response: { ...mention.response, text: newText }} 
          : mention
      )
    );
  };
  
  const handleToggleFavorite = (id: number) => {
    setData(prevData => 
      prevData.map(mention => 
        mention.id === id 
          ? { ...mention, favorite: !mention.favorite } 
          : mention
      )
    );
  };
  
  const filteredData = data.filter(mention => {
    if (activeTab === 'scheduled') return mention.response.status === 'scheduled';
    if (activeTab === 'posted') return mention.response.status === 'posted';
    if (activeTab === 'favorites') return mention.favorite;
    return true;
  });
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
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
            
            {filteredData.length === 0 ? (
              <TableRow style={{ justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ gridColumn: '1 / span 5', textAlign: 'center', color: '#6c757d' }}>
                  <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>
                    <IconComponent icon={FaIcons.FaInbox} />
                  </div>
                  <p>No {activeTab} mentions found</p>
                </div>
              </TableRow>
            ) : (
              filteredData.map(mention => (
                <TableRow key={mention.id}>
                  <VideoCell>
                    <VideoThumbnailWrapper>
                      <VideoThumbnail>
                        <img 
                          src={`https://i.ytimg.com/vi/${mention.video.id}/maxresdefault.jpg`} 
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
                      <ResponseStatusBadge status={mention.response.status}>
                        {mention.response.status === 'scheduled' ? (
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
                      <ActionButton 
                        variant="favorite" 
                        title={mention.favorite ? "Remove from favorites" : "Add to favorites"}
                        onClick={() => handleToggleFavorite(mention.id)}
                      >
                        <IconComponent icon={mention.favorite ? FaIcons.FaHeart : FaIcons.FaRegHeart} />
                      </ActionButton>
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
                onClick={() => setTimeframe('day')}
              >
                Day
              </TimeframeButton>
              <TimeframeButton 
                active={timeframe === 'week'} 
                onClick={() => setTimeframe('week')}
              >
                Week
              </TimeframeButton>
              <TimeframeButton 
                active={timeframe === 'month'} 
                onClick={() => setTimeframe('month')}
              >
                Month
              </TimeframeButton>
              <TimeframeButton 
                active={timeframe === 'year'} 
                onClick={() => setTimeframe('year')}
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
              <StatValue>248</StatValue>
              <StatLabel>Total Mentions</StatLabel>
              <StatTrend increasing>
                <IconComponent icon={FaIcons.FaArrowUp} />
                12% from last week
              </StatTrend>
            </StatCard>
            
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #00C781 0%, #82ffc9 100%)`}>
                <IconComponent icon={FaIcons.FaCheck} />
              </StatIcon>
              <StatValue>189</StatValue>
              <StatLabel>Responded Mentions</StatLabel>
              <StatTrend increasing>
                <IconComponent icon={FaIcons.FaArrowUp} />
                8% from last week
              </StatTrend>
            </StatCard>
            
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #FFAA15 0%, #ffd67e 100%)`}>
                <IconComponent icon={FaIcons.FaClock} />
              </StatIcon>
              <StatValue>59</StatValue>
              <StatLabel>Pending Responses</StatLabel>
              <StatTrend>
                <IconComponent icon={FaIcons.FaArrowDown} />
                4% from last week
              </StatTrend>
            </StatCard>
            
            <StatCard>
              <StatIcon color={`linear-gradient(135deg, #9575CD 0%, #4facfe 100%)`}>
                <IconComponent icon={FaIcons.FaPercentage} />
              </StatIcon>
              <StatValue>76%</StatValue>
              <StatLabel>Response Rate</StatLabel>
              <StatTrend increasing>
                <IconComponent icon={FaIcons.FaArrowUp} />
                3% from last week
              </StatTrend>
            </StatCard>
          </StatsGrid>
          
          <ChartSection>
            <ChartBars>
              <ChartBar height={65} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
              <ChartBar height={78} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
              <ChartBar height={52} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
              <ChartBar height={91} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
              <ChartBar height={44} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
              <ChartBar height={59} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
              <ChartBar height={86} color={`linear-gradient(180deg, #673AB7 0%, #8561C5 100%)`} />
            </ChartBars>
          </ChartSection>
          <ChartLabels>
            <ChartLabel>Mon</ChartLabel>
            <ChartLabel>Tue</ChartLabel>
            <ChartLabel>Wed</ChartLabel>
            <ChartLabel>Thu</ChartLabel>
            <ChartLabel>Fri</ChartLabel>
            <ChartLabel>Sat</ChartLabel>
            <ChartLabel>Sun</ChartLabel>
          </ChartLabels>
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