import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FaYoutube, FaReddit, FaBrain, FaRobot, FaChartLine, 
  FaEye, FaCommentDots, FaClock, FaFire, FaBell,
  FaCheckCircle, FaPlay, FaSearch, FaLightbulb,
  FaUserCheck, FaRocket, FaMagic, FaCode, FaTimesCircle
} from 'react-icons/fa';
import { 
  HiSparkles, HiLightningBolt, HiCode, 
  HiOutlineChip, HiOutlineChatAlt2 
} from 'react-icons/hi';
import { BiAnalyse, BiTargetLock } from 'react-icons/bi';
import { MdAutoAwesome, MdSmartToy, MdTimeline } from 'react-icons/md';
import { renderIcon } from '../utils/IconHelper';

// Animations
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
  50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.6), 0 0 60px rgba(102, 126, 234, 0.3); }
  100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
`;

const scan = keyframes`
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
`;

const typing = keyframes`
  from { width: 0; }
  to { width: 100%; }
`;

const blink = keyframes`
  50% { opacity: 0; }
`;

// Styled Components
const Container = styled.section`
  position: relative;
  padding: 6rem 0;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' 
    : 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'};
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, 
      ${props => props.theme.name === 'dark' 
        ? 'rgba(102, 126, 234, 0.05)' 
        : 'rgba(102, 126, 234, 0.02)'} 0%, 
      transparent 70%
    );
    pointer-events: none;
  }
`;

const Wrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
`;

const Header = styled(motion.div)`
  text-align: center;
  margin-bottom: 5rem;
`;

const Title = styled.h2`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: ${props => props.theme.name === 'dark' ? '#a0a0a0' : '#666'};
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
`;

const ProcessFlow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  margin-bottom: 5rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StepCard = styled(motion.div)<{ isActive: boolean }>`
  position: relative;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(26, 26, 46, 0.8)' 
    : 'rgba(255, 255, 255, 0.9)'};
  border: 2px solid ${props => props.isActive 
    ? '#667eea' 
    : props.theme.name === 'dark' ? '#2a2a3e' : '#e0e0e0'};
  border-radius: 20px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: ${props => props.isActive ? glow : 'none'} 2s ease-in-out infinite;

  &:hover {
    transform: translateY(-5px);
    border-color: #667eea;
  }

  ${props => props.isActive && css`
    transform: translateY(-5px) scale(1.02);
  `}
`;

const StepNumber = styled.div`
  position: absolute;
  top: -15px;
  left: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
`;

const StepIcon = styled.div<{ color: string }>`
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
  color: white;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const StepTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
`;

const StepDescription = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.name === 'dark' ? '#999' : '#666'};
  line-height: 1.5;
`;

const LiveDemo = styled.div`
  position: relative;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(26, 26, 46, 0.6)' 
    : 'rgba(255, 255, 255, 0.6)'};
  border: 2px solid ${props => props.theme.name === 'dark' ? '#2a2a3e' : '#e0e0e0'};
  border-radius: 24px;
  padding: 3rem;
  margin-bottom: 5rem;
  overflow: hidden;
`;

const DemoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const DemoTitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 20px;
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 600;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    animation: ${pulse} 1.5s ease-in-out infinite;
  }
`;

const VideoSimulator = styled.div`
  position: relative;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 2rem;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid rgba(102, 126, 234, 0.3);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.1) 0%, 
    rgba(118, 75, 162, 0.1) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScanLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #667eea 50%, 
    transparent 100%
  );
  animation: ${scan} 3s linear infinite;
`;

const CommentBuilder = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(42, 42, 62, 0.5)' 
    : 'rgba(248, 249, 250, 0.5)'};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(102, 126, 234, 0.2)'};
  border-radius: 16px;
  padding: 2rem;
  position: relative;
`;

const CommentText = styled.div`
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 1rem;
  line-height: 1.6;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  position: relative;
  overflow: hidden;
  white-space: pre-wrap;
`;

const Cursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: #667eea;
  animation: ${blink} 1s step-end infinite;
  vertical-align: text-bottom;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled(motion.div)`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.1)' 
    : 'rgba(102, 126, 234, 0.05)'};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(102, 126, 234, 0.2)'};
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 0.5rem;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.name === 'dark' ? '#999' : '#666'};
`;

const NicheSelector = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 3rem 0;
  flex-wrap: wrap;
`;

const NicheButton = styled(motion.button)<{ isActive: boolean }>`
  padding: 0.75rem 1.5rem;
  border: 2px solid ${props => props.isActive ? '#667eea' : props.theme.name === 'dark' ? '#2a2a3e' : '#e0e0e0'};
  background: ${props => props.isActive 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : 'transparent'};
  color: ${props => props.isActive 
    ? 'white' 
    : props.theme.name === 'dark' ? '#fff' : '#333'};
  border-radius: 30px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
  }
`;

const ComparisonSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin: 5rem 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ComparisonCard = styled(motion.div)<{ type: 'bot' | 'liftlio' }>`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(26, 26, 46, 0.8)' 
    : 'rgba(255, 255, 255, 0.9)'};
  border: 2px solid ${props => props.type === 'liftlio' 
    ? '#667eea' 
    : '#ef4444'};
  border-radius: 20px;
  padding: 2rem;
  position: relative;
  overflow: hidden;

  ${props => props.type === 'liftlio' && css`
    animation: ${glow} 3s ease-in-out infinite;
  `}
`;

const ComparisonHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ComparisonIcon = styled.div<{ type: 'bot' | 'liftlio' }>`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: ${props => props.type === 'liftlio' 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
`;

const ComparisonTitle = styled.h4`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
`;

const CommentExample = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(0, 0, 0, 0.3)' 
    : 'rgba(0, 0, 0, 0.05)'};
  border-radius: 12px;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${props => props.theme.name === 'dark' ? '#ccc' : '#555'};
  font-style: italic;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 1.5rem;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: ${props => props.theme.name === 'dark' ? '#ccc' : '#555'};

  svg {
    flex-shrink: 0;
  }
`;

const CTASection = styled(motion.div)`
  text-align: center;
  margin-top: 5rem;
  padding: 3rem;
  background: linear-gradient(135deg, 
    ${props => props.theme.name === 'dark' 
      ? 'rgba(102, 126, 234, 0.1)' 
      : 'rgba(102, 126, 234, 0.05)'} 0%, 
    ${props => props.theme.name === 'dark' 
      ? 'rgba(118, 75, 162, 0.1)' 
      : 'rgba(118, 75, 162, 0.05)'} 100%
  );
  border-radius: 24px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(102, 126, 234, 0.2)'};
`;

const CTATitle = styled.h3`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CTASubtitle = styled.p`
  font-size: 1.125rem;
  color: ${props => props.theme.name === 'dark' ? '#a0a0a0' : '#666'};
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CTAButton = styled(motion.button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1.25rem 3rem;
  font-size: 1.125rem;
  font-weight: 700;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
  }
`;

// Component
const LiveIntelligenceEngine: React.FC = () => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedNiche, setSelectedNiche] = useState('marketing');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [metrics, setMetrics] = useState({
    videosAnalyzed: 2847,
    leadsDetected: 156,
    commentsPosted: 89,
    conversionRate: 12.4
  });

  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

  const lang = language as 'pt' | 'en';

  // Translations
  const translations = {
    pt: {
      title: 'Inteligência Artificial que Assiste, Analisa e Converte',
      subtitle: 'Descubra como capturamos leads quentes 24/7 no piloto automático com tecnologia de ponta',
      steps: [
        {
          title: 'Descoberta Inteligente',
          description: 'IA varre YouTube em busca de vídeos do seu nicho com alto potencial de leads'
        },
        {
          title: 'Análise Profunda',
          description: 'Transcrição completa + análise de comentários para identificar oportunidades'
        },
        {
          title: 'Comentário Estratégico',
          description: 'Cria comentários contextuais com timestamps, agregando valor real'
        },
        {
          title: 'Resultados em Cascata',
          description: 'Leads qualificados chegam 24/7 através de comentários permanentes'
        }
      ],
      liveDemo: 'Demonstração ao Vivo',
      live: 'AO VIVO',
      processing: 'Processando vídeo...',
      analyzing: 'Analisando transcrição e comentários...',
      writing: 'Escrevendo comentário estratégico...',
      metrics: {
        videosAnalyzed: 'Vídeos Analisados Hoje',
        leadsDetected: 'Leads Quentes Detectados',
        commentsPosted: 'Comentários Publicados',
        conversionRate: 'Taxa de Conversão'
      },
      niches: {
        marketing: 'Marketing Digital',
        saas: 'SaaS B2B',
        ecommerce: 'E-commerce',
        consulting: 'Consultoria'
      },
      comparison: {
        bot: {
          title: 'Bot Tradicional',
          comment: 'Ótimo vídeo! Visite nosso site para saber mais.',
          features: [
            'Comentário genérico sem contexto',
            'Spam óbvio que afasta usuários',
            'Banido rapidamente',
            'Zero valor agregado'
          ]
        },
        liftlio: {
          title: 'Liftlio Intelligence',
          comment: 'Excelente ponto sobre ROI no minuto 3:42! Na nossa experiência ajudando +50 empresas SaaS, descobrimos que combinar automação com personalização aumenta conversões em 3x. Adoraria compartilhar um case específico sobre isso.',
          features: [
            'Menciona momentos específicos do vídeo',
            'Agrega valor real à discussão',
            'Parece 100% humano e autêntico',
            'Gera curiosidade e engajamento'
          ]
        }
      },
      cta: {
        title: 'Comece a Capturar Leads em 5 Minutos',
        subtitle: 'Tecnologia exclusiva que transforma vídeos em máquinas de leads',
        button: 'Ativar Inteligência Liftlio'
      }
    },
    en: {
      title: 'AI That Watches, Analyzes, and Converts',
      subtitle: 'Discover how we capture hot leads 24/7 on autopilot with cutting-edge technology',
      steps: [
        {
          title: 'Smart Discovery',
          description: 'AI scans YouTube for niche videos with high lead potential'
        },
        {
          title: 'Deep Analysis',
          description: 'Full transcription + comment analysis to identify opportunities'
        },
        {
          title: 'Strategic Comment',
          description: 'Creates contextual comments with timestamps, adding real value'
        },
        {
          title: 'Cascading Results',
          description: 'Qualified leads arrive 24/7 through permanent comments'
        }
      ],
      liveDemo: 'Live Demonstration',
      live: 'LIVE',
      processing: 'Processing video...',
      analyzing: 'Analyzing transcription and comments...',
      writing: 'Writing strategic comment...',
      metrics: {
        videosAnalyzed: 'Videos Analyzed Today',
        leadsDetected: 'Hot Leads Detected',
        commentsPosted: 'Comments Posted',
        conversionRate: 'Conversion Rate'
      },
      niches: {
        marketing: 'Digital Marketing',
        saas: 'B2B SaaS',
        ecommerce: 'E-commerce',
        consulting: 'Consulting'
      },
      comparison: {
        bot: {
          title: 'Traditional Bot',
          comment: 'Great video! Visit our website to learn more.',
          features: [
            'Generic comment without context',
            'Obvious spam that drives users away',
            'Quickly banned',
            'Zero added value'
          ]
        },
        liftlio: {
          title: 'Liftlio Intelligence',
          comment: 'Excellent point about ROI at 3:42! In our experience helping 50+ SaaS companies, we found that combining automation with personalization increases conversions by 3x. Would love to share a specific case about this.',
          features: [
            'Mentions specific video moments',
            'Adds real value to discussion',
            'Looks 100% human and authentic',
            'Generates curiosity and engagement'
          ]
        }
      },
      cta: {
        title: 'Start Capturing Leads in 5 Minutes',
        subtitle: 'Exclusive technology that transforms videos into lead machines',
        button: 'Activate Liftlio Intelligence'
      }
    }
  };

  const t = translations[lang];

  // Typing animation effect
  useEffect(() => {
    if (activeStep === 2 && !isTyping) {
      setIsTyping(true);
      const fullText = t.comparison.liftlio.comment;
      let currentText = '';
      let index = 0;

      const typeInterval = setInterval(() => {
        if (index < fullText.length) {
          currentText += fullText[index];
          setTypingText(currentText);
          index++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    }
  }, [activeStep, t.comparison.liftlio.comment, isTyping]);

  // Auto-advance steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000); // Reduzido para 3 segundos

    return () => clearInterval(interval);
  }, []); // Removido isInView para começar imediatamente

  // Animate metrics
  useEffect(() => {
    if (isInView) {
      const interval = setInterval(() => {
        setMetrics(prev => ({
          videosAnalyzed: prev.videosAnalyzed + Math.floor(Math.random() * 5),
          leadsDetected: prev.leadsDetected + (Math.random() > 0.7 ? 1 : 0),
          commentsPosted: prev.commentsPosted + (Math.random() > 0.8 ? 1 : 0),
          conversionRate: Math.min(15, prev.conversionRate + (Math.random() * 0.1))
        }));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isInView]);

  const nicheSamples = {
    marketing: {
      video: 'Como Aumentar Vendas com Marketing Digital em 2024',
      comment: {
        pt: 'Excelente estratégia no minuto 5:23! Implementamos algo similar para nossos clientes e vimos aumento de 300% em conversões. O ponto sobre segmentação comportamental foi certeiro - é exatamente isso que faz a diferença. Temos um case study específico sobre isso, adoraria trocar experiências!',
        en: 'Excellent strategy at 5:23! We implemented something similar for our clients and saw a 300% increase in conversions. The point about behavioral segmentation was spot on - that\'s exactly what makes the difference. We have a specific case study about this, would love to exchange experiences!'
      }
    },
    saas: {
      video: 'Reduzindo Churn em SaaS: Estratégias Comprovadas',
      comment: {
        pt: 'A análise sobre onboarding (8:15) é fundamental! Ajudamos uma SaaS a reduzir churn de 15% para 4% focando exatamente nesses pontos. O segredo está em identificar o "momento aha" do usuário nas primeiras 48h. Desenvolvemos um framework específico para isso que tem dado resultados incríveis.',
        en: 'The analysis about onboarding (8:15) is fundamental! We helped a SaaS reduce churn from 15% to 4% by focusing exactly on these points. The secret is identifying the user\'s "aha moment" in the first 48h. We developed a specific framework for this that has been giving incredible results.'
      }
    },
    ecommerce: {
      video: 'Dobrando Conversões no E-commerce com CRO',
      comment: {
        pt: 'Que sacada sobre checkout simplificado (12:30)! Testamos isso com 20+ lojas e confirmamos: cada campo removido aumenta conversão em ~5%. Mas o que realmente surpreendeu foi combinar isso com social proof dinâmico. Um cliente nosso viu 250% de aumento. Posso compartilhar os detalhes se houver interesse!',
        en: 'What an insight about simplified checkout (12:30)! We tested this with 20+ stores and confirmed: each field removed increases conversion by ~5%. But what really surprised us was combining this with dynamic social proof. One of our clients saw a 250% increase. I can share the details if there\'s interest!'
      }
    },
    consulting: {
      video: 'Escalonando Consultoria: De Freelancer a Empresa',
      comment: {
        pt: 'Muito relevante a parte sobre processos (15:45)! Passamos por essa transição há 3 anos e posso confirmar: documentar tudo é crucial. O que funcionou para nós foi criar SOPs em vídeo + templates. Hoje temos 12 consultores usando o mesmo método. Se quiser, posso compartilhar nosso framework de onboarding!',
        en: 'Very relevant the part about processes (15:45)! We went through this transition 3 years ago and I can confirm: documenting everything is crucial. What worked for us was creating video SOPs + templates. Today we have 12 consultants using the same method. If you want, I can share our onboarding framework!'
      }
    }
  };

  return (
    <Container ref={containerRef}>
      <Wrapper>
        <Header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.6 }}
        >
          <Title>{t.title}</Title>
          <Subtitle>{t.subtitle}</Subtitle>
        </Header>

        {/* Process Flow */}
        <ProcessFlow>
          {t.steps.map((step, index) => (
            <StepCard
              key={index}
              isActive={activeStep === index}
              onClick={() => setActiveStep(index)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <StepNumber>{index + 1}</StepNumber>
              <StepIcon color={
                index === 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                index === 1 ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                index === 2 ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              }>
                {index === 0 && renderIcon(FaSearch)}
                {index === 1 && renderIcon(FaBrain)}
                {index === 2 && renderIcon(FaCommentDots)}
                {index === 3 && renderIcon(FaChartLine)}
              </StepIcon>
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </StepCard>
          ))}
        </ProcessFlow>

        {/* Live Demo */}
        <LiveDemo>
          <DemoHeader>
            <DemoTitle>
              {renderIcon(HiSparkles)}
              {t.liveDemo}
            </DemoTitle>
            <LiveIndicator>{t.live}</LiveIndicator>
          </DemoHeader>

          <VideoSimulator>
            <VideoOverlay>
              <ScanLine />
              <AnimatePresence mode="wait">
                {activeStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ textAlign: 'center', color: 'white', zIndex: 10 }}
                  >
                    <div style={{ fontSize: '48px' }}>{renderIcon(FaYoutube)}</div>
                    <div style={{ marginTop: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>{t.processing}</div>
                  </motion.div>
                )}
                {activeStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ textAlign: 'center', color: 'white', zIndex: 10 }}
                  >
                    <div style={{ fontSize: '48px' }}>{renderIcon(BiAnalyse)}</div>
                    <div style={{ marginTop: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>{t.analyzing}</div>
                  </motion.div>
                )}
                {activeStep >= 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ 
                      position: 'absolute', 
                      inset: '1rem',
                      background: 'rgba(0,0,0,0.8)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      color: 'white',
                      zIndex: 10
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                      {nicheSamples[selectedNiche as keyof typeof nicheSamples].video}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {renderIcon(FaEye)} 125,847 views • 2 days ago
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </VideoOverlay>
          </VideoSimulator>

          {activeStep === 2 && (
            <CommentBuilder>
              <div style={{ 
                fontSize: '0.875rem', 
                color: theme.name === 'dark' ? '#999' : '#666',
                marginBottom: '1rem'
              }}>
                {t.writing}
              </div>
              <CommentText>
                {typingText}
                {isTyping && <Cursor />}
              </CommentText>
            </CommentBuilder>
          )}

          <MetricsGrid>
            <MetricCard
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <MetricValue>{metrics.videosAnalyzed.toLocaleString()}</MetricValue>
              <MetricLabel>{t.metrics.videosAnalyzed}</MetricLabel>
            </MetricCard>
            <MetricCard
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <MetricValue>{metrics.leadsDetected}</MetricValue>
              <MetricLabel>{t.metrics.leadsDetected}</MetricLabel>
            </MetricCard>
            <MetricCard
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <MetricValue>{metrics.commentsPosted}</MetricValue>
              <MetricLabel>{t.metrics.commentsPosted}</MetricLabel>
            </MetricCard>
            <MetricCard
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <MetricValue>{metrics.conversionRate.toFixed(1)}%</MetricValue>
              <MetricLabel>{t.metrics.conversionRate}</MetricLabel>
            </MetricCard>
          </MetricsGrid>
        </LiveDemo>

        {/* Niche Selector */}
        <NicheSelector>
          {Object.entries(t.niches).map(([key, label]) => (
            <NicheButton
              key={key}
              isActive={selectedNiche === key}
              onClick={() => setSelectedNiche(key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {label}
            </NicheButton>
          ))}
        </NicheSelector>

        {/* Comparison */}
        <ComparisonSection>
          <ComparisonCard
            type="bot"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -50 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <ComparisonHeader>
              <ComparisonIcon type="bot">
                {renderIcon(FaRobot)}
              </ComparisonIcon>
              <ComparisonTitle>{t.comparison.bot.title}</ComparisonTitle>
            </ComparisonHeader>
            <CommentExample>"{t.comparison.bot.comment}"</CommentExample>
            <FeatureList>
              {t.comparison.bot.features.map((feature, index) => (
                <FeatureItem key={index}>
                  <span style={{ color: '#ef4444' }}>{renderIcon(FaTimesCircle)}</span>
                  {feature}
                </FeatureItem>
              ))}
            </FeatureList>
          </ComparisonCard>

          <ComparisonCard
            type="liftlio"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : 50 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <ComparisonHeader>
              <ComparisonIcon type="liftlio">
                {renderIcon(MdAutoAwesome)}
              </ComparisonIcon>
              <ComparisonTitle>{t.comparison.liftlio.title}</ComparisonTitle>
            </ComparisonHeader>
            <CommentExample>
              "{nicheSamples[selectedNiche as keyof typeof nicheSamples].comment[lang]}"
            </CommentExample>
            <FeatureList>
              {t.comparison.liftlio.features.map((feature, index) => (
                <FeatureItem key={index}>
                  <span style={{ color: '#10b981' }}>{renderIcon(FaCheckCircle)}</span>
                  {feature}
                </FeatureItem>
              ))}
            </FeatureList>
          </ComparisonCard>
        </ComparisonSection>

        {/* CTA */}
        <CTASection
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <CTATitle>{t.cta.title}</CTATitle>
          <CTASubtitle>{t.cta.subtitle}</CTASubtitle>
          <CTAButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {renderIcon(FaRocket)}
            {t.cta.button}
          </CTAButton>
        </CTASection>
      </Wrapper>
    </Container>
  );
};

export default LiveIntelligenceEngine;