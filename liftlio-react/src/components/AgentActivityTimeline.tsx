import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { IconType } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import * as BiIcons from 'react-icons/bi';
import * as RiIcons from 'react-icons/ri';
import * as IoIcons from 'react-icons/io5';
import { IconComponent } from '../utils/IconHelper';

// Interface for agent activity data
export interface AgentActivityData {
  taskId?: string;
  taskType?: string;
  status?: string;
  durationSeconds?: number;
  startedAt?: string;
  completedAt?: string;
  actionsResult?: string;
  success?: boolean;
}

interface AgentActivityTimelineProps {
  activity?: AgentActivityData;
  variant?: 'compact' | 'full';
  className?: string;
}

// Parse the actions from the result text
interface ParsedAction {
  text: string;
  completed: boolean;
  icon: IconType;
  category: 'navigation' | 'watch' | 'engage' | 'comment' | 'success';
}

// Function to parse actions from result text
const parseActions = (actionsResult: string): ParsedAction[] => {
  if (!actionsResult) return [];

  const lines = actionsResult.split('\n');
  const actions: ParsedAction[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for completed actions (with checkmarks)
    const isCompleted = trimmed.startsWith('✅') || trimmed.startsWith('- ✅');
    const cleanText = trimmed.replace(/^[-•]\s*/, '').replace(/^✅\s*/, '').trim();

    if (!cleanText || cleanText.length < 3) continue;

    // Skip JSON-like content
    if (cleanText.startsWith('{') || cleanText.startsWith('"')) continue;

    // Determine icon and category based on action text
    let icon: IconType = FaIcons.FaCheck;
    let category: ParsedAction['category'] = 'success';

    const lowerText = cleanText.toLowerCase();

    if (lowerText.includes('visited') || lowerText.includes('channel page') || lowerText.includes('navigat')) {
      icon = RiIcons.RiCompassLine;
      category = 'navigation';
    } else if (lowerText.includes('browsed') || lowerText.includes('videos tab')) {
      icon = BiIcons.BiFolder;
      category = 'navigation';
    } else if (lowerText.includes('watch') || lowerText.includes('warm-up') || lowerText.includes('video')) {
      icon = FaIcons.FaPlay;
      category = 'watch';
    } else if (lowerText.includes('liked') || lowerText.includes('like')) {
      icon = FaIcons.FaHeart;
      category = 'engage';
    } else if (lowerText.includes('comment') || lowerText.includes('posted') || lowerText.includes('reply')) {
      icon = FaIcons.FaComment;
      category = 'comment';
    } else if (lowerText.includes('scroll')) {
      icon = BiIcons.BiMouse;
      category = 'navigation';
    } else if (lowerText.includes('click')) {
      icon = BiIcons.BiPointer;
      category = 'engage';
    }

    // Only add if it looks like a real action (not metadata)
    if (isCompleted && cleanText.length > 5 && !cleanText.includes(':') && !cleanText.includes('=')) {
      actions.push({
        text: cleanText,
        completed: isCompleted,
        icon,
        category
      });
    }
  }

  return actions;
};

// Format duration in a human-readable way
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// Styled Components
const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled(motion.div)<{ $variant: 'compact' | 'full' }>`
  background: ${props => props.theme.name === 'dark'
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(30, 30, 35, 0.6) 100%)'
    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(248, 248, 250, 0.8) 100%)'};
  border-radius: ${props => props.$variant === 'compact' ? '8px' : '12px'};
  padding: ${props => props.$variant === 'compact' ? '10px 12px' : '16px 20px'};
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.15)'
    : 'rgba(139, 92, 246, 0.12)'};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(139, 92, 246, 0.6),
      transparent
    );
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
  }
`;

const Header = styled.div<{ $variant: 'compact' | 'full' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.$variant === 'compact' ? '8px' : '12px'};
  gap: 8px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AgentIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
`;

const HeaderTitle = styled.div<{ $variant: 'compact' | 'full' }>`
  font-size: ${props => props.$variant === 'compact' ? '11px' : '12px'};
  font-weight: 600;
  color: ${props => props.theme.name === 'dark' ? '#A78BFA' : '#7C3AED'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusBadge = styled.div<{ $success: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  background: ${props => props.$success
    ? 'rgba(34, 197, 94, 0.15)'
    : 'rgba(239, 68, 68, 0.15)'};
  color: ${props => props.$success ? '#22C55E' : '#EF4444'};

  svg {
    font-size: 10px;
  }
`;

const DurationBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.05)'};
  color: ${props => props.theme.colors.text.secondary};

  svg {
    font-size: 10px;
    color: ${props => props.theme.name === 'dark' ? '#A78BFA' : '#7C3AED'};
  }
`;

const TimelineContainer = styled.div<{ $variant: 'compact' | 'full' }>`
  display: flex;
  flex-direction: ${props => props.$variant === 'compact' ? 'row' : 'column'};
  gap: ${props => props.$variant === 'compact' ? '4px' : '6px'};
  ${props => props.$variant === 'compact' && `
    flex-wrap: wrap;
    align-items: center;
  `}
`;

const ActionItem = styled(motion.div)<{ $variant: 'compact' | 'full'; $category: ParsedAction['category'] }>`
  display: flex;
  align-items: center;
  gap: ${props => props.$variant === 'compact' ? '4px' : '8px'};
  padding: ${props => props.$variant === 'compact' ? '4px 6px' : '6px 10px'};
  border-radius: ${props => props.$variant === 'compact' ? '6px' : '8px'};
  font-size: ${props => props.$variant === 'compact' ? '10px' : '12px'};
  color: ${props => props.theme.colors.text.primary};
  background: ${props => {
    const baseOpacity = props.theme.name === 'dark' ? '0.12' : '0.08';
    switch (props.$category) {
      case 'navigation': return `rgba(59, 130, 246, ${baseOpacity})`;
      case 'watch': return `rgba(168, 85, 247, ${baseOpacity})`;
      case 'engage': return `rgba(236, 72, 153, ${baseOpacity})`;
      case 'comment': return `rgba(34, 197, 94, ${baseOpacity})`;
      default: return `rgba(107, 114, 128, ${baseOpacity})`;
    }
  }};
  border: 1px solid ${props => {
    const baseOpacity = props.theme.name === 'dark' ? '0.2' : '0.15';
    switch (props.$category) {
      case 'navigation': return `rgba(59, 130, 246, ${baseOpacity})`;
      case 'watch': return `rgba(168, 85, 247, ${baseOpacity})`;
      case 'engage': return `rgba(236, 72, 153, ${baseOpacity})`;
      case 'comment': return `rgba(34, 197, 94, ${baseOpacity})`;
      default: return `rgba(107, 114, 128, ${baseOpacity})`;
    }
  }};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px ${props => {
      switch (props.$category) {
        case 'navigation': return 'rgba(59, 130, 246, 0.2)';
        case 'watch': return 'rgba(168, 85, 247, 0.2)';
        case 'engage': return 'rgba(236, 72, 153, 0.2)';
        case 'comment': return 'rgba(34, 197, 94, 0.2)';
        default: return 'rgba(107, 114, 128, 0.2)';
      }
    }};
  }
`;

const ActionIcon = styled.div<{ $category: ParsedAction['category'] }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: ${props => {
    switch (props.$category) {
      case 'navigation': return '#3B82F6';
      case 'watch': return '#A855F7';
      case 'engage': return '#EC4899';
      case 'comment': return '#22C55E';
      default: return '#6B7280';
    }
  }};
`;

const ActionText = styled.span<{ $variant: 'compact' | 'full' }>`
  white-space: ${props => props.$variant === 'compact' ? 'nowrap' : 'normal'};
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${props => props.$variant === 'compact' ? '120px' : 'none'};
`;

const NoActivityMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
  font-style: italic;

  svg {
    font-size: 14px;
    opacity: 0.5;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const MoreActionsIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  color: ${props => props.theme.colors.text.secondary};
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
`;

const SummaryStats = styled.div<{ $variant: 'compact' | 'full' }>`
  display: flex;
  gap: ${props => props.$variant === 'compact' ? '8px' : '12px'};
  margin-top: ${props => props.$variant === 'compact' ? '8px' : '12px'};
  padding-top: ${props => props.$variant === 'compact' ? '8px' : '12px'};
  border-top: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)'};
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: ${props => props.theme.colors.text.secondary};

  svg {
    font-size: 10px;
    color: ${props => props.theme.name === 'dark' ? '#A78BFA' : '#7C3AED'};
  }

  span {
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
  }
`;

const AgentActivityTimeline: React.FC<AgentActivityTimelineProps> = ({
  activity,
  variant = 'compact',
  className
}) => {
  // Parse actions from the result text
  const parsedActions = useMemo(() => {
    if (!activity?.actionsResult) return [];
    return parseActions(activity.actionsResult);
  }, [activity?.actionsResult]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const byCategory = {
      navigation: 0,
      watch: 0,
      engage: 0,
      comment: 0,
      success: 0
    };

    parsedActions.forEach(action => {
      byCategory[action.category]++;
    });

    return byCategory;
  }, [parsedActions]);

  // If no activity data, show placeholder
  if (!activity || !activity.actionsResult) {
    return (
      <Container
        $variant={variant}
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Header $variant={variant}>
          <HeaderLeft>
            <AgentIcon>
              <IconComponent icon={RiIcons.RiRobotLine} />
            </AgentIcon>
            <HeaderTitle $variant={variant}>Liftlio</HeaderTitle>
          </HeaderLeft>
        </Header>
        <NoActivityMessage>
          <IconComponent icon={IoIcons.IoHourglassOutline} />
          Waiting for agent action...
        </NoActivityMessage>
      </Container>
    );
  }

  const displayActions = variant === 'compact' ? parsedActions.slice(0, 4) : parsedActions;
  const hasMoreActions = variant === 'compact' && parsedActions.length > 4;

  return (
    <Container
      $variant={variant}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header $variant={variant}>
        <HeaderLeft>
          <AgentIcon>
            <IconComponent icon={RiIcons.RiRobotLine} />
          </AgentIcon>
          <HeaderTitle $variant={variant}>Liftlio</HeaderTitle>
          <StatusBadge $success={activity.success ?? false}>
            <IconComponent icon={activity.success ? FaIcons.FaCheckCircle : FaIcons.FaTimesCircle} />
            {activity.success ? 'commented' : 'failed'}
          </StatusBadge>
        </HeaderLeft>
      </Header>

      <TimelineContainer $variant={variant}>
        {displayActions.map((action, index) => (
          <ActionItem
            key={index}
            $variant={variant}
            $category={action.category}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <ActionIcon $category={action.category}>
              <IconComponent icon={action.icon} />
            </ActionIcon>
            <ActionText $variant={variant}>{action.text}</ActionText>
          </ActionItem>
        ))}

        {hasMoreActions && (
          <MoreActionsIndicator>
            +{parsedActions.length - 4} more
          </MoreActionsIndicator>
        )}
      </TimelineContainer>

      {variant === 'full' && parsedActions.length > 0 && (
        <SummaryStats $variant={variant}>
          {stats.navigation > 0 && (
            <StatItem>
              <IconComponent icon={RiIcons.RiCompassLine} />
              <span>{stats.navigation}</span> navigations
            </StatItem>
          )}
          {stats.watch > 0 && (
            <StatItem>
              <IconComponent icon={FaIcons.FaPlay} />
              <span>{stats.watch}</span> watched
            </StatItem>
          )}
          {stats.engage > 0 && (
            <StatItem>
              <IconComponent icon={FaIcons.FaHeart} />
              <span>{stats.engage}</span> engagements
            </StatItem>
          )}
          {stats.comment > 0 && (
            <StatItem>
              <IconComponent icon={FaIcons.FaComment} />
              <span>{stats.comment}</span> comments
            </StatItem>
          )}
        </SummaryStats>
      )}
    </Container>
  );
};

export default AgentActivityTimeline;
