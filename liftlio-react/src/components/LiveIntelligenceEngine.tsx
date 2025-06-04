import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlay, 
  FaYoutube, 
  FaChartLine, 
  FaCommentDots,
  FaUsers,
  FaDollarSign,
  FaRocket,
  FaEye,
  FaCheckCircle,
  FaBolt,
  FaClock,
  FaCheck
} from 'react-icons/fa';
import { 
  BsLightningFill,
  BsCheckCircleFill,
  BsGraphUpArrow
} from 'react-icons/bs';
import { useLanguage } from '../context/LanguageContext';

interface TimelineItem {
  title: string;
  description: string;
  iconName: 'youtube' | 'lightning' | 'chart' | 'comment' | 'graph' | 'dollar';
  demo?: {
    type: 'video' | 'analysis' | 'comment' | 'results';
    content?: any;
  };
}

// Função para renderizar ícones com segurança
const renderIcon = (iconName: string) => {
  const iconMap: { [key: string]: any } = {
    youtube: FaYoutube,
    lightning: BsLightningFill,
    chart: FaChartLine,
    comment: FaCommentDots,
    graph: BsGraphUpArrow,
    dollar: FaDollarSign,
    play: FaPlay,
    users: FaUsers,
    rocket: FaRocket,
    check: FaCheck,
    checkCircle: FaCheckCircle,
    checkFill: BsCheckCircleFill,
    eye: FaEye,
    bolt: FaBolt,
    clock: FaClock
  };
  
  const IconComponent = iconMap[iconName];
  return IconComponent ? React.createElement(IconComponent) : null;
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 4rem 2rem;
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 5rem;
`;

const Title = styled(motion.h1)`
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
`;

const Subtitle = styled(motion.p)`
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  color: ${props => props.theme.textSecondary};
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  opacity: 0.9;
`;

const TimelineWrapper = styled.div`
  position: relative;
  max-width: 900px;
  margin: 0 auto;
`;

const TimelineLine = styled.div`
  position: absolute;
  left: 50px;
  top: 50px;
  bottom: 50px;
  width: 4px;
  background: linear-gradient(180deg, 
    rgba(102, 126, 234, 0.2) 0%, 
    rgba(102, 126, 234, 0.5) 50%, 
    rgba(118, 75, 162, 0.5) 100%
  );
  
  @media (min-width: 768px) {
    left: 50%;
    transform: translateX(-50%);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    transform-origin: top;
    transform: scaleY(var(--progress, 0));
    transition: transform 0.5s ease;
  }
`;

const TimelineSection = styled(motion.div)`
  margin-bottom: 3rem;
  position: relative;
  display: flex;
  align-items: flex-start;
  
  @media (min-width: 768px) {
    &:nth-child(even) {
      flex-direction: row-reverse;
      
      .timeline-content {
        text-align: right;
      }
    }
  }
`;

const TimelineMarker = styled(motion.div)<{ isActive: boolean }>`
  position: relative;
  width: 60px;
  height: 60px;
  min-width: 60px;
  background: ${props => props.isActive 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : props.theme.cardBackground};
  border: 4px solid ${props => props.isActive
    ? 'transparent'
    : props.theme.cardBorder};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all 0.3s ease;
  box-shadow: ${props => props.isActive 
    ? '0 0 30px rgba(102, 126, 234, 0.5)' 
    : '0 2px 10px rgba(0,0,0,0.1)'};
  
  svg {
    color: ${props => props.isActive ? 'white' : '#667eea'};
    font-size: 24px;
  }
  
  &:hover {
    transform: scale(1.1);
    cursor: pointer;
  }
`;

const TimelineContent = styled.div`
  flex: 1;
  padding: 0 2rem;
  
  @media (min-width: 768px) {
    max-width: calc(50% - 100px);
  }
`;


const StepTitle = styled.h3`
  font-size: 1.5rem;
  color: ${props => props.theme.text};
  margin-bottom: 1rem;
  font-weight: 700;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.textSecondary};
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const DemoContainer = styled(motion.div)`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.03)' 
    : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  z-index: 1;
  margin-top: 1rem;
`;

const VideoPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const VideoThumb = styled.div`
  width: 120px;
  height: 68px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
`;

const PlayIcon = styled.div`
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    color: white;
    font-size: 16px;
    margin-left: 2px;
  }
`;

const VideoDetails = styled.div`
  flex: 1;
`;

const VideoTitle = styled.h4`
  color: ${props => props.theme.text};
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
  font-weight: 600;
`;

const VideoMeta = styled.p`
  color: ${props => props.theme.textSecondary};
  font-size: 0.85rem;
  opacity: 0.8;
`;

const AnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

const AnalysisItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(102, 126, 234, 0.1)'
    : 'rgba(102, 126, 234, 0.05)'};
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
`;

const AnalysisIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #667eea;
`;

const AnalysisValue = styled.div`
  font-weight: bold;
  color: ${props => props.theme.text};
  font-size: 0.95rem;
`;

const AnalysisLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.textSecondary};
  margin-top: 0.25rem;
  opacity: 0.8;
`;

const CommentPreview = styled.div`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(102, 126, 234, 0.05)'
    : 'rgba(102, 126, 234, 0.03)'};
  border-radius: 12px;
  padding: 1rem;
`;

const CommentAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #667eea;
  font-weight: 600;
  font-size: 0.9rem;
  
  svg {
    font-size: 0.9rem;
  }
`;

const CommentText = styled.p`
  color: ${props => props.theme.text};
  line-height: 1.5;
  font-size: 0.9rem;
  
  .highlight {
    color: #667eea;
    font-weight: 600;
  }
`;

const MetricsRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const MetricItem = styled.div`
  flex: 1;
  min-width: 120px;
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.05) 0%, 
    rgba(118, 75, 162, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.1);
`;

const MetricIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #667eea;
`;

const MetricValue = styled.h4`
  font-size: 1.25rem;
  color: ${props => props.theme.text};
  margin: 0;
  font-weight: 700;
`;

const MetricLabel = styled.p`
  color: ${props => props.theme.textSecondary};
  font-size: 0.75rem;
  margin: 0;
  opacity: 0.8;
`;

const CTASection = styled(motion.div)`
  text-align: center;
  padding: 4rem 3rem;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.05) 0%, 
    rgba(118, 75, 162, 0.05) 100%);
  border-radius: 32px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
    animation: pulse 4s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 1; }
  }
`;

const CTATitle = styled.h2`
  font-size: clamp(2rem, 3vw, 3rem);
  color: ${props => props.theme.text};
  margin-bottom: 1rem;
  font-weight: 800;
  position: relative;
  z-index: 1;
`;

const CTASubtitle = styled.p`
  font-size: 1.25rem;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 2.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 1;
`;

const CTAButton = styled(motion.button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1.25rem 3.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const LiveIntelligenceEngine: React.FC = () => {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  const timeline: TimelineItem[] = [
    {
      title: t('engine.steps.published.title'),
      description: t('engine.steps.published.description'),
      iconName: 'youtube',
      demo: {
        type: 'video',
        content: {
          title: "10 Dicas para Crescer seu Negócio",
          views: "1.2K views • 1h ago",
          channel: "Business Channel"
        }
      }
    },
    {
      title: t('engine.steps.detected.title'),
      description: t('engine.steps.detected.description'),
      iconName: 'lightning',
      demo: {
        type: 'analysis',
        content: {
          relevance: "98%",
          audience: "Business",
          potential: "High"
        }
      }
    },
    {
      title: t('engine.steps.analyzed.title'),
      description: t('engine.steps.analyzed.description'),
      iconName: 'chart',
      demo: {
        type: 'analysis',
        content: {
          topics: ["Marketing", "Sales", "Automation"],
          sentiment: "Positive",
          engagement: "High"
        }
      }
    },
    {
      title: t('engine.steps.commented.title'),
      description: t('engine.steps.commented.description'),
      iconName: 'comment',
      demo: {
        type: 'comment',
        content: {
          author: "Liftlio AI",
          text: "Great content! The automation tip you mentioned is crucial for scaling. I've created a comprehensive guide on this topic that many found helpful."
        }
      }
    },
    {
      title: t('engine.steps.results.title'),
      description: t('engine.steps.results.description'),
      iconName: 'graph',
      demo: {
        type: 'results',
        content: {
          views: "8.5K",
          leads: "142",
          conversions: "37"
        }
      }
    },
    {
      title: t('engine.steps.continuous.title'),
      description: t('engine.steps.continuous.description'),
      iconName: 'dollar',
      demo: {
        type: 'results',
        content: {
          totalViews: "45K+",
          totalLeads: "890+",
          revenue: "$47,300"
        }
      }
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % timeline.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [timeline.length]);

  // Update timeline progress
  useEffect(() => {
    const progress = ((activeStep + 1) / timeline.length) * 100;
    document.documentElement.style.setProperty('--progress', `${progress / 100}`);
  }, [activeStep, timeline.length]);

  const renderDemo = (demo: TimelineItem['demo']) => {
    if (!demo) return null;

    switch (demo.type) {
      case 'video':
        return (
          <VideoPreview>
            <VideoThumb>
              <PlayIcon>
                {renderIcon('play')}
              </PlayIcon>
            </VideoThumb>
            <VideoDetails>
              <VideoTitle>{demo.content.title}</VideoTitle>
              <VideoMeta>{demo.content.views}</VideoMeta>
            </VideoDetails>
          </VideoPreview>
        );

      case 'analysis':
        if (demo.content.relevance) {
          return (
            <AnalysisGrid>
              <AnalysisItem>
                <AnalysisIcon>{renderIcon('chart')}</AnalysisIcon>
                <AnalysisValue>{demo.content.relevance}</AnalysisValue>
                <AnalysisLabel>Relevance</AnalysisLabel>
              </AnalysisItem>
              <AnalysisItem>
                <AnalysisIcon>{renderIcon('users')}</AnalysisIcon>
                <AnalysisValue>{demo.content.audience}</AnalysisValue>
                <AnalysisLabel>Audience</AnalysisLabel>
              </AnalysisItem>
              <AnalysisItem>
                <AnalysisIcon>{renderIcon('rocket')}</AnalysisIcon>
                <AnalysisValue>{demo.content.potential}</AnalysisValue>
                <AnalysisLabel>Potential</AnalysisLabel>
              </AnalysisItem>
            </AnalysisGrid>
          );
        } else {
          return (
            <AnalysisGrid>
              {demo.content.topics?.map((topic: string, i: number) => (
                <AnalysisItem key={i}>
                  <AnalysisIcon>{renderIcon('checkCircle')}</AnalysisIcon>
                  <AnalysisValue>{topic}</AnalysisValue>
                </AnalysisItem>
              ))}
            </AnalysisGrid>
          );
        }

      case 'comment':
        return (
          <CommentPreview>
            <CommentAuthor>
              {renderIcon('checkFill')} {demo.content.author}
            </CommentAuthor>
            <CommentText>{demo.content.text}</CommentText>
          </CommentPreview>
        );

      case 'results':
        if (demo.content.views) {
          return (
            <MetricsRow>
              <MetricItem>
                <MetricIcon>{renderIcon('eye')}</MetricIcon>
                <MetricValue>{demo.content.views}</MetricValue>
                <MetricLabel>Views</MetricLabel>
              </MetricItem>
              <MetricItem>
                <MetricIcon>{renderIcon('users')}</MetricIcon>
                <MetricValue>{demo.content.leads}</MetricValue>
                <MetricLabel>Leads</MetricLabel>
              </MetricItem>
              <MetricItem>
                <MetricIcon>{renderIcon('checkCircle')}</MetricIcon>
                <MetricValue>{demo.content.conversions}</MetricValue>
                <MetricLabel>Conversions</MetricLabel>
              </MetricItem>
            </MetricsRow>
          );
        } else {
          return (
            <MetricsRow>
              <MetricItem>
                <MetricIcon>{renderIcon('eye')}</MetricIcon>
                <MetricValue>{demo.content.totalViews}</MetricValue>
                <MetricLabel>Total Views</MetricLabel>
              </MetricItem>
              <MetricItem>
                <MetricIcon>{renderIcon('users')}</MetricIcon>
                <MetricValue>{demo.content.totalLeads}</MetricValue>
                <MetricLabel>Total Leads</MetricLabel>
              </MetricItem>
              <MetricItem>
                <MetricIcon>{renderIcon('dollar')}</MetricIcon>
                <MetricValue>{demo.content.revenue}</MetricValue>
                <MetricLabel>Revenue</MetricLabel>
              </MetricItem>
            </MetricsRow>
          );
        }

      default:
        return null;
    }
  };

  return (
    <Container>
      <Content>
        <Header>
          <Title
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {t('engine.title')}
          </Title>
          <Subtitle
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('engine.subtitle')}
          </Subtitle>
        </Header>

        <TimelineWrapper>
          <TimelineLine />
          
          {timeline.map((item, index) => (
            <TimelineSection
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <TimelineMarker
                isActive={activeStep === index}
                onClick={() => setActiveStep(index)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {renderIcon(item.iconName)}
              </TimelineMarker>

              <TimelineContent className="timeline-content">
                <StepTitle>{item.title}</StepTitle>
                <StepDescription>{item.description}</StepDescription>
                
                {activeStep === index && item.demo && (
                  <DemoContainer>
                    <AnimatePresence mode="wait">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: '100%' }}
                      >
                        {renderDemo(item.demo)}
                      </motion.div>
                    </AnimatePresence>
                  </DemoContainer>
                )}
              </TimelineContent>
            </TimelineSection>
          ))}
        </TimelineWrapper>

        <CTASection
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <CTATitle>{t('cta.title')}</CTATitle>
          <CTASubtitle>{t('cta.subtitle')}</CTASubtitle>
          <CTAButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/login'}
          >
            {renderIcon('rocket')} {t('cta.button')}
          </CTAButton>
        </CTASection>
      </Content>
    </Container>
  );
};

export default LiveIntelligenceEngine;