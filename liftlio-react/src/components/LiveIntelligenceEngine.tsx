import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FaYoutube, FaBrain, FaCommentDots, FaRocket,
  FaCheckCircle, FaChartLine, FaBell
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { BiAnalyse, BiTargetLock } from 'react-icons/bi';
import { MdAutoAwesome, MdTimeline } from 'react-icons/md';
import { renderIcon } from '../utils/IconHelper';

// Futuristic Animations
const hologram = keyframes`
  0%, 100% { 
    opacity: 0.8;
    transform: rotateY(0deg) rotateX(0deg) scale(1);
  }
  25% { 
    opacity: 1;
    transform: rotateY(180deg) rotateX(10deg) scale(1.05);
  }
  50% {
    opacity: 0.9;
    transform: rotateY(360deg) rotateX(-10deg) scale(1);
  }
  75% {
    opacity: 1;
    transform: rotateY(540deg) rotateX(10deg) scale(1.05);
  }
`;

const dataStream = keyframes`
  0% { transform: translateY(100vh); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100vh); opacity: 0; }
`;

const circuitFlow = keyframes`
  0% { 
    stroke-dashoffset: 1000;
    filter: drop-shadow(0 0 2px #667eea);
  }
  50% {
    filter: drop-shadow(0 0 10px #667eea) drop-shadow(0 0 20px #667eea);
  }
  100% { 
    stroke-dashoffset: 0;
    filter: drop-shadow(0 0 2px #667eea);
  }
`;

const pulse3D = keyframes`
  0%, 100% { 
    transform: scale(1) translateZ(0);
    box-shadow: 0 0 30px rgba(102, 126, 234, 0.4);
  }
  50% { 
    transform: scale(1.1) translateZ(20px);
    box-shadow: 0 0 60px rgba(102, 126, 234, 0.8), 
                0 0 120px rgba(102, 126, 234, 0.4);
  }
`;

const matrixRain = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const neonGlow = keyframes`
  0%, 100% { 
    filter: brightness(1) contrast(1);
    text-shadow: 0 0 10px currentColor,
                 0 0 20px currentColor,
                 0 0 40px currentColor;
  }
  50% { 
    filter: brightness(1.5) contrast(1.2);
    text-shadow: 0 0 20px currentColor,
                 0 0 40px currentColor,
                 0 0 80px currentColor;
  }
`;

// Main Components
const Section = styled.section`
  min-height: 100vh;
  padding: 40px 20px;
  background: ${props => props.theme.name === 'dark' ? '#0a0a0a' : '#f5f5f5'};
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MatrixBackground = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.03;
  overflow: hidden;
  pointer-events: none;
  
  &::before {
    content: '01010101010101010101010101010101010101';
    position: absolute;
    top: -100%;
    left: 0;
    width: 100%;
    height: 200%;
    font-family: 'Courier New', monospace;
    font-size: 20px;
    color: #667eea;
    word-break: break-all;
    animation: ${matrixRain} 20s linear infinite;
  }
`;

const Container = styled.div`
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Title = styled(motion.h2)`
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 900;
  text-align: center;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  animation: ${neonGlow} 3s ease-in-out infinite;
`;

const MainVisualization = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  max-height: 80vh;
  margin: 0 auto;
  perspective: 1000px;
  transform-style: preserve-3d;
`;

const HolographicDisplay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    rgba(10, 10, 10, 0.95) 0%, 
    rgba(20, 20, 40, 0.95) 100%
  );
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-radius: 20px;
  overflow: hidden;
  transform: rotateX(5deg);
  animation: ${hologram} 20s ease-in-out infinite;
  box-shadow: 
    0 20px 60px rgba(102, 126, 234, 0.4),
    inset 0 0 120px rgba(102, 126, 234, 0.1);
    
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(45deg, 
      transparent 30%, 
      rgba(102, 126, 234, 0.1) 50%, 
      transparent 70%
    );
    animation: ${dataStream} 3s linear infinite;
  }
`;

const CircuitBoard = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  pointer-events: none;
`;

const ProcessFlow = styled.div`
  position: absolute;
  inset: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ProcessNode = styled(motion.div)<{ isActive: boolean }>`
  flex: 1;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  ${props => props.isActive && css`
    z-index: 10;
  `}
`;

const NodeCore = styled(motion.div)<{ isActive: boolean }>`
  width: 120px;
  height: 120px;
  background: ${props => props.isActive 
    ? 'radial-gradient(circle, #667eea 0%, #764ba2 50%, #f093fb 100%)'
    : 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.1) 100%)'
  };
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.5s ease;
  ${props => props.isActive && css`
    animation: ${pulse3D} 2s ease-in-out infinite;
  `}
  
  svg {
    font-size: 3rem;
    color: white;
    filter: drop-shadow(0 0 20px currentColor);
  }
  
  &::before {
    content: '';
    position: absolute;
    inset: -20px;
    border: 2px solid ${props => props.isActive ? '#667eea' : 'rgba(102, 126, 234, 0.2)'};
    border-radius: 50%;
    opacity: ${props => props.isActive ? 0.5 : 0.2};
    animation: ${props => props.isActive ? `${hologram} 3s linear infinite` : 'none'};
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: -40px;
    border: 1px solid ${props => props.isActive ? '#764ba2' : 'rgba(118, 75, 162, 0.1)'};
    border-radius: 50%;
    opacity: ${props => props.isActive ? 0.3 : 0.1};
    animation: ${props => props.isActive ? `${hologram} 5s linear infinite reverse` : 'none'};
  }
`;

const NodeLabel = styled(motion.div)<{ isActive: boolean }>`
  margin-top: 30px;
  text-align: center;
  
  h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: ${props => props.isActive ? '#667eea' : props.theme.textSecondary};
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    ${props => props.isActive && css`
      animation: ${neonGlow} 2s ease-in-out infinite;
    `}
  }
  
  p {
    font-size: 0.875rem;
    color: ${props => props.theme.textSecondary};
    opacity: ${props => props.isActive ? 1 : 0.7};
  }
`;

const ConnectionLine = styled.svg`
  position: absolute;
  top: 50%;
  left: 120px;
  width: calc(100% - 240px);
  height: 2px;
  transform: translateY(-50%);
  z-index: 1;
  
  path {
    stroke: url(#gradient);
    stroke-width: 2;
    fill: none;
    stroke-dasharray: 1000;
    animation: ${circuitFlow} 3s ease-in-out infinite;
  }
`;

const CentralDisplay = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 800px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.5);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 0 60px rgba(102, 126, 234, 0.4),
    inset 0 0 60px rgba(102, 126, 234, 0.1);
  z-index: 20;
`;

const VideoPreview = styled.div`
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(102, 126, 234, 0.3);
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, 
      rgba(102, 126, 234, 0.2) 0%, 
      transparent 70%
    );
  }
`;

const VideoInfo = styled(motion.div)`
  padding: 1rem;
  
  h4 {
    font-size: 1.25rem;
    color: white;
    margin-bottom: 0.5rem;
  }
  
  .meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const CommentSection = styled(motion.div)`
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(102, 126, 234, 0.2) 50%, 
      transparent 100%
    );
    animation: ${dataStream} 4s linear infinite;
  }
`;

const CommentText = styled.p`
  color: white;
  line-height: 1.6;
  margin-bottom: 1rem;
  font-size: 1rem;
  position: relative;
  z-index: 1;
`;

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
  z-index: 1;
`;

const MetricsBar = styled(motion.div)`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 50px;
  padding: 1rem 2rem;
  display: flex;
  gap: 3rem;
  backdrop-filter: blur(20px);
  z-index: 30;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
    padding: 0.75rem 1.5rem;
  }
`;

const Metric = styled.div`
  text-align: center;
  
  .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #667eea;
    animation: ${neonGlow} 2s ease-in-out infinite;
  }
  
  .label {
    font-size: 0.75rem;
    color: ${props => props.theme.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
`;

const CTASection = styled(motion.div)`
  text-align: center;
  margin-top: 4rem;
`;

const CTAButton = styled(motion.button)`
  padding: 1.25rem 3rem;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #764ba2 0%, #f093fb 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4);
    
    &::before {
      opacity: 1;
    }
  }
  
  span {
    position: relative;
    z-index: 1;
  }
`;

const LiveIntelligenceEngine: React.FC = () => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [displayMode, setDisplayMode] = useState<'idle' | 'processing' | 'analyzing' | 'commenting' | 'complete'>('idle');
  const [metrics, setMetrics] = useState({
    scanned: 0,
    analyzed: 0,
    conversion: 0
  });

  const lang = language as 'pt' | 'en';

  const t = {
    pt: {
      title: 'Motor de Inteligência Liftlio',
      steps: [
        {
          title: 'Descoberta',
          description: 'IA escaneia YouTube',
          icon: FaYoutube
        },
        {
          title: 'Análise',
          description: 'Processa transcrições',
          icon: BiAnalyse
        },
        {
          title: 'Comentário',
          description: 'Cria resposta contextual',
          icon: FaCommentDots
        },
        {
          title: 'Conversão',
          description: 'Captura leads quentes',
          icon: FaChartLine
        }
      ],
      demo: {
        video: 'Como Escalar Negócios com Marketing Digital em 2024',
        views: '342,567',
        time: '2 dias atrás',
        comment: 'Excelente estratégia! Em 5:23 quando você menciona sobre automação de funis, implementamos algo similar e aumentamos conversões em 47%. Adoraria compartilhar os insights que descobrimos!',
        author: 'Liftlio AI',
        timestamp: 'Agora'
      },
      metrics: {
        scanned: 'Vídeos Escaneados',
        analyzed: 'Leads Identificados',
        conversion: 'Taxa de Conversão'
      },
      cta: 'Começar Agora'
    },
    en: {
      title: 'Liftlio Intelligence Engine',
      steps: [
        {
          title: 'Discovery',
          description: 'AI scans YouTube',
          icon: FaYoutube
        },
        {
          title: 'Analysis',
          description: 'Process transcripts',
          icon: BiAnalyse
        },
        {
          title: 'Comment',
          description: 'Create contextual response',
          icon: FaCommentDots
        },
        {
          title: 'Conversion',
          description: 'Capture hot leads',
          icon: FaChartLine
        }
      ],
      demo: {
        video: 'How to Scale Business with Digital Marketing in 2024',
        views: '342,567',
        time: '2 days ago',
        comment: 'Excellent strategy! At 5:23 when you mention funnel automation, we implemented something similar and increased conversions by 47%. Would love to share the insights we discovered!',
        author: 'Liftlio AI',
        timestamp: 'Now'
      },
      metrics: {
        scanned: 'Videos Scanned',
        analyzed: 'Leads Identified',
        conversion: 'Conversion Rate'
      },
      cta: 'Start Now'
    }
  }[lang];

  // Auto-cycle through steps
  useEffect(() => {
    const modes: typeof displayMode[] = ['processing', 'analyzing', 'commenting', 'complete', 'idle'];
    let modeIndex = 0;
    
    const interval = setInterval(() => {
      setDisplayMode(modes[modeIndex]);
      setActiveStep(modeIndex === 4 ? 0 : modeIndex);
      modeIndex = (modeIndex + 1) % modes.length;
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Animate metrics
  useEffect(() => {
    const animateValue = (end: number, key: keyof typeof metrics, suffix = '') => {
      const duration = 2000;
      const steps = 60;
      const stepValue = end / steps;
      let current = 0;
      
      const interval = setInterval(() => {
        current += stepValue;
        if (current >= end) {
          current = end;
          clearInterval(interval);
        }
        setMetrics(prev => ({ ...prev, [key]: Math.floor(current) }));
      }, duration / steps);
    };

    animateValue(2847, 'scanned');
    animateValue(342, 'analyzed');
    animateValue(23, 'conversion');
  }, []);

  return (
    <Section>
      <MatrixBackground />
      <Container>
        <Title
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring" }}
        >
          {t.title}
        </Title>

        <MainVisualization>
          <HolographicDisplay>
            <CircuitBoard viewBox="0 0 1000 600">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#764ba2" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#f093fb" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Circuit paths */}
              <path d="M0,300 Q250,200 500,300 T1000,300" stroke="url(#gradient)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M0,100 L200,100 L200,300 L400,300" stroke="url(#gradient)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M600,300 L800,300 L800,500 L1000,500" stroke="url(#gradient)" strokeWidth="1" fill="none" opacity="0.3" />
            </CircuitBoard>

            <ProcessFlow>
              {t.steps.map((step, index) => (
                <ProcessNode
                  key={index}
                  isActive={activeStep === index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <NodeCore
                    isActive={activeStep === index}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {renderIcon(step.icon)}
                  </NodeCore>
                  <NodeLabel isActive={activeStep === index}>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </NodeLabel>
                  {index < t.steps.length - 1 && (
                    <ConnectionLine viewBox="0 0 100 2">
                      <path d="M0,1 L100,1" />
                    </ConnectionLine>
                  )}
                </ProcessNode>
              ))}
            </ProcessFlow>

            <AnimatePresence>
              {displayMode !== 'idle' && (
                <CentralDisplay
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  <VideoPreview>
                    <VideoInfo>
                      <h4>{t.demo.video}</h4>
                      <div className="meta">
                        <span>{renderIcon(HiSparkles)} {t.demo.views} views</span>
                        <span>• {t.demo.time}</span>
                      </div>
                    </VideoInfo>
                  </VideoPreview>

                  {(displayMode === 'commenting' || displayMode === 'complete') && (
                    <CommentSection
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <CommentText>{t.demo.comment}</CommentText>
                      <CommentMeta>
                        <span>{renderIcon(MdAutoAwesome)} {t.demo.author}</span>
                        <span>• {t.demo.timestamp}</span>
                      </CommentMeta>
                    </CommentSection>
                  )}
                </CentralDisplay>
              )}
            </AnimatePresence>

            <MetricsBar
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Metric>
                <div className="value">{metrics.scanned}</div>
                <div className="label">{t.metrics.scanned}</div>
              </Metric>
              <Metric>
                <div className="value">{metrics.analyzed}</div>
                <div className="label">{t.metrics.analyzed}</div>
              </Metric>
              <Metric>
                <div className="value">{metrics.conversion}%</div>
                <div className="label">{t.metrics.conversion}</div>
              </Metric>
            </MetricsBar>
          </HolographicDisplay>
        </MainVisualization>

        <CTASection
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <CTAButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{renderIcon(FaRocket)}</span>
            <span>{t.cta}</span>
            <span>{renderIcon(HiSparkles)}</span>
          </CTAButton>
        </CTASection>
      </Container>
    </Section>
  );
};

export default LiveIntelligenceEngine;