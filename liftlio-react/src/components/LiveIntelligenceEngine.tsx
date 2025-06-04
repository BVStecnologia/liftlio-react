import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FaYoutube, FaSearch, FaCommentDots, FaRocket,
  FaFire, FaChartLine, FaBell, FaEye, FaClock,
  FaUsers, FaCheckCircle
} from 'react-icons/fa';
import { HiSparkles, HiLightningBolt } from 'react-icons/hi';
import { BiAnalyse, BiTargetLock } from 'react-icons/bi';
import { MdAutoAwesome } from 'react-icons/md';
import { renderIcon } from '../utils/IconHelper';

// Animations
const scan = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const pulse = keyframes`
  0%, 100% { 
    transform: scale(1);
    opacity: 0.8;
  }
  50% { 
    transform: scale(1.05);
    opacity: 1;
  }
`;

const glow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.4),
                0 0 40px rgba(102, 126, 234, 0.2);
  }
  50% { 
    box-shadow: 0 0 40px rgba(102, 126, 234, 0.8),
                0 0 80px rgba(102, 126, 234, 0.4);
  }
`;

const dataFlow = keyframes`
  0% { transform: translateY(100%); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100%); opacity: 0; }
`;

const typing = keyframes`
  from { width: 0; }
  to { width: 100%; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

// Styled Components
const Section = styled.section`
  min-height: 100vh;
  padding: 40px 20px;
  background: ${props => props.theme.name === 'dark' ? '#0a0a0a' : '#fafafa'};
  position: relative;
  overflow: hidden;
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Title = styled(motion.h2)`
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 900;
  text-align: center;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: ${props => props.theme.textSecondary};
  text-align: center;
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const MainStage = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
    : 'linear-gradient(135deg, #f5f5f5 0%, #e9ecef 100%)'};
  border-radius: 24px;
  padding: 3rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid ${props => props.theme.border};
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const StageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const StageTitle = styled.h3`
  font-size: 1.5rem;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: #667eea;
  }
`;

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ef4444;
  font-weight: 600;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const ProcessVisualization = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const ProcessStep = styled(motion.div)<{ isActive: boolean }>`
  background: ${props => props.isActive
    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    : props.theme.cardBackground};
  border: 2px solid ${props => props.isActive ? '#667eea' : props.theme.border};
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  ${props => props.isActive && css`
    animation: ${glow} 2s ease-in-out infinite;
  `}
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StepNumber = styled.div<{ isActive: boolean }>`
  width: 40px;
  height: 40px;
  background: ${props => props.isActive
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : props.theme.border};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.125rem;
`;

const StepTitle = styled.h4`
  font-size: 1.125rem;
  color: ${props => props.theme.text};
  margin: 0;
`;

const StepContent = styled.div`
  color: ${props => props.theme.textSecondary};
  font-size: 0.875rem;
  line-height: 1.6;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 3px;
  }
`;

const VideoCard = styled(motion.div)<{ isHot?: boolean }>`
  background: ${props => props.theme.cardBackground};
  border: 1px solid ${props => props.isHot ? '#ef4444' : props.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.isHot && css`
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const VideoTitle = styled.p`
  font-size: 0.75rem;
  color: ${props => props.theme.text};
  margin-bottom: 0.5rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const VideoMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.625rem;
  color: ${props => props.theme.textSecondary};
`;

const HotBadge = styled.div`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const CommentDemo = styled.div`
  background: ${props => props.theme.cardBackground};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
  position: relative;
  overflow: hidden;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  
  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
`;

const CommentAuthor = styled.div`
  flex: 1;
  
  .name {
    font-weight: 600;
    color: ${props => props.theme.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .time {
    font-size: 0.75rem;
    color: ${props => props.theme.textSecondary};
  }
`;

const CommentText = styled.div`
  color: ${props => props.theme.text};
  line-height: 1.6;
  
  .timestamp {
    color: #3b82f6;
    cursor: pointer;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .typing {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    animation: ${typing} 3s steps(40, end);
    border-right: 2px solid #667eea;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
`;

const MetricCard = styled(motion.div)`
  background: ${props => props.theme.cardBackground};
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  }
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 0.5rem;
  animation: ${float} 3s ease-in-out infinite;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.textSecondary};
`;

const ImpactSection = styled(motion.div)`
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  padding: 2rem;
  margin-top: 3rem;
  text-align: center;
`;

const CTAButton = styled(motion.button)`
  padding: 1rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
  }
`;

const LiveIntelligenceEngine: React.FC = () => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [showComment, setShowComment] = useState(false);
  const [metrics, setMetrics] = useState({
    videosScanned: 0,
    hotVideos: 0,
    comments: 0,
    leads: 0
  });

  const lang = language as 'pt' | 'en';

  const t = {
    pt: {
      title: 'Como o Liftlio Transforma Vídeos em Máquina de Vendas',
      subtitle: 'Veja em tempo real a IA capturando leads quentes no piloto automático',
      live: 'AO VIVO',
      currentProcess: 'Processo em Execução',
      steps: [
        {
          title: 'Varredura Massiva',
          content: 'IA escaneia centenas de vídeos por hora, analisando títulos, descrições e engajamento para encontrar oportunidades quentes',
          icon: FaSearch
        },
        {
          title: 'Análise Profunda',
          content: 'Lê todos os comentários, identifica padrões de interesse e detecta menções de problemas que seu produto resolve',
          icon: BiAnalyse
        },
        {
          title: 'Comentário Estratégico',
          content: 'Cria comentário natural mencionando timestamp específico e conectando indiretamente com sua solução',
          icon: FaCommentDots
        },
        {
          title: 'Captura no Topo',
          content: 'Monitora canais hot e comenta entre os primeiros, capturando todo o tráfego do vídeo para seu negócio',
          icon: FaRocket
        }
      ],
      videos: [
        { title: 'Como escalar vendas B2B em 2024', views: '45K', hot: true },
        { title: 'Estratégias de marketing digital', views: '12K', hot: false },
        { title: 'Automatização de processos comerciais', views: '89K', hot: true },
        { title: 'Ferramentas para gestão de leads', views: '5K', hot: false },
        { title: 'Como aumentar conversão em 300%', views: '127K', hot: true },
        { title: 'Gestão de equipe remota', views: '8K', hot: false }
      ],
      comment: {
        author: 'João Silva',
        text: 'Cara, sensacional! Em 3:47 quando você fala sobre qualificação de leads, isso mudou nosso jogo. Implementamos um processo similar e aumentamos conversão em 85%. A parte de automação que você menciona é crucial - economizamos 30h/semana. Alguém mais teve resultados assim?',
        timestamp: '3:47'
      },
      metrics: {
        videosScanned: 'Vídeos Analisados/Hora',
        hotVideos: 'Vídeos Quentes Identificados',
        comments: 'Comentários Postados Hoje',
        leads: 'Leads Capturados'
      },
      impact: {
        title: 'Impacto Real no Seu Negócio',
        revenue: '+ R$ 47.300/mês',
        time: '120 horas economizadas',
        conversion: '12x mais conversão'
      },
      cta: 'Começar Agora'
    },
    en: {
      title: 'How Liftlio Transforms Videos into Sales Machine',
      subtitle: 'Watch AI capturing hot leads on autopilot in real-time',
      live: 'LIVE',
      currentProcess: 'Process Running',
      steps: [
        {
          title: 'Massive Scanning',
          content: 'AI scans hundreds of videos per hour, analyzing titles, descriptions and engagement to find hot opportunities',
          icon: FaSearch
        },
        {
          title: 'Deep Analysis',
          content: 'Reads all comments, identifies interest patterns and detects mentions of problems your product solves',
          icon: BiAnalyse
        },
        {
          title: 'Strategic Comment',
          content: 'Creates natural comment mentioning specific timestamp and indirectly connecting with your solution',
          icon: FaCommentDots
        },
        {
          title: 'Top Capture',
          content: 'Monitors hot channels and comments among the first, capturing all video traffic to your business',
          icon: FaRocket
        }
      ],
      videos: [
        { title: 'How to scale B2B sales in 2024', views: '45K', hot: true },
        { title: 'Digital marketing strategies', views: '12K', hot: false },
        { title: 'Sales process automation', views: '89K', hot: true },
        { title: 'Lead management tools', views: '5K', hot: false },
        { title: 'How to increase conversion by 300%', views: '127K', hot: true },
        { title: 'Remote team management', views: '8K', hot: false }
      ],
      comment: {
        author: 'John Smith',
        text: 'Wow, amazing! At 3:47 when you talk about lead qualification, that changed our game. We implemented a similar process and increased conversion by 85%. The automation part you mention is crucial - we save 30h/week. Anyone else had results like this?',
        timestamp: '3:47'
      },
      metrics: {
        videosScanned: 'Videos Analyzed/Hour',
        hotVideos: 'Hot Videos Identified',
        comments: 'Comments Posted Today',
        leads: 'Leads Captured'
      },
      impact: {
        title: 'Real Impact on Your Business',
        revenue: '+ $12,500/month',
        time: '120 hours saved',
        conversion: '12x more conversion'
      },
      cta: 'Start Now'
    }
  }[lang];

  // Auto-advance steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Show comment on step 3
  useEffect(() => {
    setShowComment(activeStep === 2);
  }, [activeStep]);

  // Animate metrics
  useEffect(() => {
    const targets = { videosScanned: 847, hotVideos: 23, comments: 142, leads: 89 };
    
    Object.entries(targets).forEach(([key, target]) => {
      let current = 0;
      const increment = target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setMetrics(prev => ({ ...prev, [key]: Math.floor(current) }));
      }, 30);
    });
  }, []);

  return (
    <Section>
      <Container>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t.title}
        </Title>
        
        <Subtitle
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {t.subtitle}
        </Subtitle>

        <MainStage>
          <StageHeader>
            <StageTitle>
              {renderIcon(HiLightningBolt)}
              {t.currentProcess}
            </StageTitle>
            <LiveIndicator>{t.live}</LiveIndicator>
          </StageHeader>

          <ProcessVisualization>
            {t.steps.map((step, index) => (
              <ProcessStep
                key={index}
                isActive={activeStep === index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <StepHeader>
                  <StepNumber isActive={activeStep === index}>
                    {index + 1}
                  </StepNumber>
                  <StepTitle>{step.title}</StepTitle>
                  {renderIcon(step.icon)}
                </StepHeader>
                <StepContent>{step.content}</StepContent>

                {index === 0 && activeStep === 0 && (
                  <VideoGrid>
                    <AnimatePresence>
                      {t.videos.map((video, vIndex) => (
                        <VideoCard
                          key={vIndex}
                          isHot={video.hot}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: vIndex * 0.1 }}
                        >
                          {video.hot && (
                            <HotBadge>
                              {renderIcon(FaFire)} HOT
                            </HotBadge>
                          )}
                          <VideoTitle>{video.title}</VideoTitle>
                          <VideoMeta>
                            {renderIcon(FaEye)} {video.views}
                          </VideoMeta>
                        </VideoCard>
                      ))}
                    </AnimatePresence>
                  </VideoGrid>
                )}

                {index === 2 && showComment && (
                  <CommentDemo>
                    <CommentHeader>
                      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23667eea'/%3E%3C/svg%3E" alt="Avatar" />
                      <CommentAuthor>
                        <div className="name">
                          {t.comment.author}
                          {renderIcon(FaCheckCircle)}
                        </div>
                        <div className="time">{renderIcon(FaClock)} 2 min ago</div>
                      </CommentAuthor>
                    </CommentHeader>
                    <CommentText>
                      <span className="typing">
                        {t.comment.text.split(t.comment.timestamp)[0]}
                        <span className="timestamp">{t.comment.timestamp}</span>
                        {t.comment.text.split(t.comment.timestamp)[1]}
                      </span>
                    </CommentText>
                  </CommentDemo>
                )}
              </ProcessStep>
            ))}
          </ProcessVisualization>

          <MetricsGrid>
            <MetricCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MetricValue>{metrics.videosScanned}</MetricValue>
              <MetricLabel>{t.metrics.videosScanned}</MetricLabel>
            </MetricCard>
            <MetricCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <MetricValue>{metrics.hotVideos}</MetricValue>
              <MetricLabel>{t.metrics.hotVideos}</MetricLabel>
            </MetricCard>
            <MetricCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <MetricValue>{metrics.comments}</MetricValue>
              <MetricLabel>{t.metrics.comments}</MetricLabel>
            </MetricCard>
            <MetricCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <MetricValue>{metrics.leads}</MetricValue>
              <MetricLabel>{t.metrics.leads}</MetricLabel>
            </MetricCard>
          </MetricsGrid>
        </MainStage>

        <ImpactSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>{t.impact.title}</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {t.impact.revenue}
              </div>
              <div style={{ color: theme.textSecondary }}>Receita</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {t.impact.time}
              </div>
              <div style={{ color: theme.textSecondary }}>Tempo</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {t.impact.conversion}
              </div>
              <div style={{ color: theme.textSecondary }}>Conversão</div>
            </div>
          </div>
          
          <CTAButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {renderIcon(FaRocket)}
            {t.cta}
            {renderIcon(HiSparkles)}
          </CTAButton>
        </ImpactSection>
      </Container>
    </Section>
  );
};

export default LiveIntelligenceEngine;