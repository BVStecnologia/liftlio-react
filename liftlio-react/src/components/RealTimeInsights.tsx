import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

// Animações
const slideIn = keyframes`
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`;

// Container de notificações
const NotificationContainer = styled.div`
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
`;

// Card de notificação
const NotificationCard = styled(motion.div)<{ type: 'success' | 'warning' | 'info' | 'achievement' }>`
  background: ${props => {
    switch(props.type) {
      case 'success': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'achievement': return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      default: return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }
  }};
  color: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.5);
    animation: ${props => props.type === 'achievement' ? pulse : 'none'} 2s infinite;
  }

  &:hover {
    transform: translateX(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  }
`;

const NotificationIcon = styled.div<{ isAchievement?: boolean }>`
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  flex-shrink: 0;
  animation: ${props => props.isAchievement ? shake : 'none'} 0.5s ease-in-out;
`;

const NotificationContent = styled.div`
  flex: 1;
`;

const NotificationTitle = styled.h4`
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NotificationMessage = styled.p`
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.95;
`;

const NotificationTime = styled.span`
  font-size: 11px;
  opacity: 0.7;
  margin-top: 8px;
  display: block;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

// Badge de conquista
const AchievementBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
`;

// Floating Insight Widget
const FloatingInsight = styled(motion.div)`
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: ${props => props.theme.name === 'dark'
    ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)'};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 350px;
  z-index: 999;
`;

const InsightIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  animation: ${pulse} 2s infinite;
`;

const InsightText = styled.div`
  flex: 1;
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  line-height: 1.4;
  
  strong {
    color: ${props => props.theme.colors.primary};
    font-weight: 700;
  }
`;

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'achievement';
  title: string;
  message: string;
  icon: React.ReactNode;
  timestamp: Date;
}

interface RealTimeInsightsProps {
  projectId: number;
  supabase: any;
}

const RealTimeInsights: React.FC<RealTimeInsightsProps> = ({ projectId, supabase }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentInsight, setCurrentInsight] = useState<string>('');
  const [showInsight, setShowInsight] = useState(false);

  // Insights dinâmicos baseados em dados
  const insights = [
    "Your organic traffic is up <strong>32%</strong> this week!",
    "Videos optimized by Liftlio get <strong>3x more views</strong>",
    "<strong>Peak traffic</strong> expected in 2 hours based on patterns",
    "Your best performing content is from <strong>YouTube</strong>",
    "Conversion rate improved <strong>18%</strong> after SEO optimization",
    "<strong>15 new visitors</strong> from Google in the last hour",
    "Mobile traffic represents <strong>65%</strong> of your audience",
    "Average session time increased to <strong>4m 23s</strong>",
  ];

  useEffect(() => {
    // Notificações e insights desativados
    // Para reativar, descomente o código abaixo
    /*
    const insightInterval = setInterval(() => {
      const randomInsight = insights[Math.floor(Math.random() * insights.length)];
      setCurrentInsight(randomInsight);
      setShowInsight(true);
      
      setTimeout(() => setShowInsight(false), 10000);
    }, 15000);

    const notificationInterval = setInterval(() => {
      const types: Array<'success' | 'warning' | 'info' | 'achievement'> = ['success', 'warning', 'info', 'achievement'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: randomType,
        title: getNotificationTitle(randomType),
        message: getNotificationMessage(randomType),
        icon: getNotificationIcon(randomType),
        timestamp: new Date()
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, 3));
      
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 10000);
    }, 30000);

    return () => {
      clearInterval(insightInterval);
      clearInterval(notificationInterval);
    };
    */
  }, [projectId]);

  const getNotificationTitle = (type: string) => {
    switch(type) {
      case 'success': return 'Traffic Spike Detected!';
      case 'warning': return 'Attention Needed';
      case 'achievement': return 'New Achievement!';
      default: return 'New Insight Available';
    }
  };

  const getNotificationMessage = (type: string) => {
    switch(type) {
      case 'success': return '25 new organic visitors arrived in the last 5 minutes from Google Search';
      case 'warning': return 'Page load time increased to 3.2s. Consider optimization.';
      case 'achievement': return 'You reached 10,000 organic visits this month! 🎉';
      default: return 'Your content is trending in Brazil with +45% engagement';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'success': return <IconComponent icon={FaIcons.FaArrowUp} />;
      case 'warning': return <IconComponent icon={FaIcons.FaBell} />;
      case 'achievement': return <IconComponent icon={FaIcons.FaStar} />;
      default: return <IconComponent icon={FaIcons.FaChartLine} />;
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <>
      {/* Notificações desativadas - remova este comentário para reativar */}
      {/* <NotificationContainer>
        <AnimatePresence>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              type={notification.type}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={() => removeNotification(notification.id)}
            >
              <NotificationIcon isAchievement={notification.type === 'achievement'}>
                {notification.icon}
              </NotificationIcon>
              <NotificationContent>
                <NotificationTitle>
                  {notification.title}
                  {notification.type === 'achievement' && (
                    <AchievementBadge>
                      <IconComponent icon={FaIcons.FaFire} /> NEW
                    </AchievementBadge>
                  )}
                </NotificationTitle>
                <NotificationMessage>{notification.message}</NotificationMessage>
                <NotificationTime>{formatTime(notification.timestamp)}</NotificationTime>
              </NotificationContent>
              <CloseButton onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}>
                <IconComponent icon={FaIcons.FaTimes} style={{ fontSize: '12px' }} />
              </CloseButton>
            </NotificationCard>
          ))}
        </AnimatePresence>
      </NotificationContainer> */}

      {/* Floating Insight desativado - remova este comentário para reativar */}
      {/* <AnimatePresence>
        {showInsight && (
          <FloatingInsight
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <InsightIcon>
              <IconComponent icon={FaIcons.FaRocket} />
            </InsightIcon>
            <InsightText dangerouslySetInnerHTML={{ __html: currentInsight }} />
          </FloatingInsight>
        )}
      </AnimatePresence> */}
    </>
  );
};

export default RealTimeInsights;