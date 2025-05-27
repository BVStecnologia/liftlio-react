import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import TechBackground from './TechBackground';
import { FaSearch, FaVideo, FaDatabase, FaBrain, FaComments, FaRocket } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import { fadeIn, shimmer, interfaceScan, pulse } from '../styles/animations';

// Definição de tipos para os indicadores de etapas
interface StepIndicatorProps {
  active: boolean;
  completed: boolean;
}

interface ProcessingIndicatorProps {
  projectId: string | number;
  onComplete?: () => void;
}

interface MetricCardProps {
  isActive?: boolean;
  isCompleted?: boolean;
}

// Animação de partículas flutuantes
const floatingParticles = keyframes`
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) rotate(360deg);
    opacity: 0;
  }
`;

// Container principal
const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 75vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
  overflow: hidden;
  border-radius: 12px;
  padding: 3rem 1.5rem;
  box-shadow: ${props => props.theme.colors.shadow.lg};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.theme.name === 'dark'
      ? 'radial-gradient(ellipse at center, rgba(0, 169, 219, 0.05) 0%, transparent 70%)'
      : props.theme.colors.bg.secondary};
    z-index: 0;
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const FloatingParticle = styled.div`
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(0, 169, 219, 0.6);
  border-radius: 50%;
  animation: ${floatingParticles} 20s linear infinite;
  z-index: 1;
  box-shadow: 0 0 10px rgba(0, 169, 219, 0.4);
  
  &:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 25s; }
  &:nth-child(2) { left: 20%; animation-delay: 2s; animation-duration: 20s; }
  &:nth-child(3) { left: 30%; animation-delay: 4s; animation-duration: 22s; }
  &:nth-child(4) { left: 40%; animation-delay: 6s; animation-duration: 18s; }
  &:nth-child(5) { left: 50%; animation-delay: 8s; animation-duration: 24s; }
  &:nth-child(6) { left: 60%; animation-delay: 10s; animation-duration: 21s; }
  &:nth-child(7) { left: 70%; animation-delay: 12s; animation-duration: 19s; }
  &:nth-child(8) { left: 80%; animation-delay: 14s; animation-duration: 23s; }
  &:nth-child(9) { left: 90%; animation-delay: 16s; animation-duration: 20s; }
`;

// Título com animação de digitalização
const scanTextAnimation = keyframes`
  0% { clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  text-align: center;
  position: relative;
  z-index: 10;
  animation: ${scanTextAnimation} 1.5s ease-out forwards;
  text-shadow: ${props => props.theme.colors.shadow.sm};
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.3rem;
  margin-bottom: 3rem;
  text-align: center;
  max-width: 700px;
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 1.5s;
  opacity: 0;
  animation-fill-mode: forwards;
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.6;
  font-weight: 400;
  background: ${props => props.theme.colors.status.infoBg};
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: ${props => props.theme.colors.shadow.md};
  border: 1px solid ${props => props.theme.colors.border.secondary};
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    margin-bottom: 2rem;
    padding: 0.75rem 1.5rem;
  }
`;

// Timeline
const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  margin-left: 2rem;
  z-index: 10;
  position: relative;
  
  @media (max-width: 768px) {
    margin-left: 1rem;
    margin-bottom: 2rem;
  }
  
  @media (max-width: 480px) {
    margin-left: 0.5rem;
  }
`;

const StepLine = styled.div`
  position: absolute;
  left: 30px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, 
    rgba(0, 169, 219, 0.2),
    rgba(0, 169, 219, 0.6),
    rgba(0, 169, 219, 0.2));
  transform: translateX(-50%);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(0, 169, 219, 0.2);
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
  
  &:last-child {
    margin-bottom: 1rem;
  }
`;

const iconGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(0, 169, 219, 0.3); }
  50% { box-shadow: 0 0 25px rgba(0, 169, 219, 0.6); }
`;

const StepIcon = styled.div<StepIndicatorProps>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #00A9DB, #0088cc)' 
    : props.completed 
      ? 'linear-gradient(135deg, #4CAF50, #2e8540)' 
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(181, 194, 203, 0.3)'};
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1.5rem;
  color: ${props => props.active || props.completed ? 'white' : props.theme.colors.text.secondary};
  font-size: 1.6rem;
  border: 3px solid ${props => props.active 
    ? '#00A9DB' 
    : props.completed 
      ? '#4CAF50' 
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(181, 194, 203, 0.4)'};
  transition: all 0.3s ease;
  position: relative;
  animation: ${props => props.active ? iconGlow : 'none'} 2s infinite;
  box-shadow: ${props => props.theme.shadows.md};
  transform: ${props => props.active ? 'scale(1.1)' : 'scale(1)'};

  /* Efeito de círculo ao redor do ícone ativo */
  &::after {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border-radius: 50%;
    border: 2px solid ${props => props.active ? 'rgba(0, 169, 219, 0.5)' : 'transparent'};
    animation: ${pulse} 2s infinite;
    display: ${props => props.active ? 'block' : 'none'};
  }
`;

const StepContent = styled.div<StepIndicatorProps>`
  opacity: ${props => props.active ? '1' : props.completed ? '0.8' : '0.4'};
  transition: all 0.3s ease;
  transform: ${props => props.active ? 'translateX(5px)' : 'translateX(0)'};
`;

const StepTitle = styled.h3<{ active?: boolean }>`
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 0.3rem 0;
  color: #2d3e50;
  letter-spacing: 0.3px;
  text-shadow: ${props => props.active ? '0 1px 5px rgba(45, 62, 80, 0.2)' : 'none'};
`;

const StepDescription = styled.p`
  font-size: 0.95rem;
  margin: 0;
  color: #34495e;
  max-width: 320px;
  line-height: 1.4;
`;

// Componente de visualização de dados em processamento
const DataVisualization = styled.div`
  width: 100%;
  max-width: 850px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.8rem;
  margin-top: 1.5rem;
  margin-bottom: 3rem;
  padding: 0 1.5rem;
  z-index: 10;
  position: relative;
`;

const scanLineAnimation = keyframes`
  0% { transform: translateY(-100%); opacity: 0.3; }
  100% { transform: translateY(100%); opacity: 0; }
`;

const valuePulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

const MetricCard = styled.div<MetricCardProps>`
  background: ${props => {
    if (props.theme.name === 'dark') {
      if (props.isCompleted) {
        return 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(46, 133, 64, 0.1))';
      }
      if (props.isActive) {
        return 'linear-gradient(135deg, rgba(0, 169, 219, 0.15), rgba(0, 136, 204, 0.1))';
      }
      return 'linear-gradient(135deg, rgba(20, 20, 25, 0.8), rgba(30, 30, 35, 0.6))';
    }
    return 'white';
  }};
  backdrop-filter: ${props => props.theme.name === 'dark' ? 'blur(20px)' : 'none'};
  border-radius: 20px;
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
  width: calc(25% - 1.8rem);
  max-width: 240px;
  position: relative;
  overflow: hidden;
  opacity: ${props => props.isActive || props.isCompleted ? 1 : 0.5};
  border: 1px solid ${props => {
    if (props.isCompleted) return props.theme.name === 'dark' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.6)';
    if (props.isActive) return props.theme.name === 'dark' ? 'rgba(0, 169, 219, 0.4)' : 'rgba(0, 169, 219, 0.6)';
    return props.theme.name === 'dark' ? 'rgba(0, 169, 219, 0.2)' : 'rgba(181, 194, 203, 0.4)';
  }};
  box-shadow: ${props => {
    if (props.isActive || props.isCompleted) {
      const color = props.isCompleted ? '76, 175, 80' : '0, 169, 219';
      return props.theme.name === 'dark'
        ? `0 8px 32px rgba(${color}, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
        : `0 8px 30px rgba(${color}, 0.2)`;
    }
    return props.theme.name === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 8px 30px rgba(0, 0, 0, 0.08)';
  }};
  transform: translateY(0) ${props => props.isActive ? 'scale(1.02)' : 'scale(1)'};
  transition: all 0.5s ease;
  
  &:nth-child(1) {
    border-top: 4px solid #00A9DB;
  }
  
  &:nth-child(2) {
    border-top: 4px solid #FFAA15;
  }
  
  &:nth-child(3) {
    border-top: 4px solid #4CAF50;
  }
  
  &:nth-child(4) {
    border-top: 4px solid #e74c3c;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.lg};
    border-color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(45, 62, 80, 0.3)'};
  }
  
  @media (max-width: 900px) {
    width: calc(50% - 1.8rem);
  }
  
  @media (max-width: 500px) {
    width: 100%;
    max-width: 100%;
  }

  /* Linha de scan */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, transparent, 
      ${props => props.className === 'card-1' ? 'rgba(0, 169, 219, 0.5)' : 
      props.className === 'card-2' ? 'rgba(255, 170, 21, 0.5)' : 
      props.className === 'card-3' ? 'rgba(76, 175, 80, 0.5)' : 
      'rgba(231, 76, 60, 0.5)'}, 
      transparent);
    animation: ${scanLineAnimation} 2s infinite;
    animation-delay: calc(var(--index) * 0.5s);
  }
`;

const MetricTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: #4e6785;
  margin: 0 0 0.7rem 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const valueAnimation = keyframes`
  0%, 100% { color: #2d3e50; text-shadow: 0 0 5px rgba(45, 62, 80, 0.1); }
  50% { color: #00A9DB; text-shadow: 0 0 15px rgba(0, 169, 219, 0.2); }
`;

const countAnimation = keyframes`
  from { transform: scale(0.95); }
  to { transform: scale(1); }
`;

const MetricValue = styled.div<{ isChanging?: boolean }>`
  font-size: 3rem;
  font-weight: 800;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.8rem;
  font-family: 'Montserrat', sans-serif;
  animation: ${props => props.isChanging ? valuePulse : 'none'} 0.5s ease-out;
  transition: color 0.3s ease;
`;

const MetricSubvalue = styled.div`
  font-size: 0.95rem;
  color: #34495e;
  font-weight: 400;
  letter-spacing: 0.5px;
`;

// Mensagem de status
const pulseBackground = keyframes`
  0%, 100% { background: linear-gradient(90deg, rgba(0, 169, 219, 0.08), rgba(0, 169, 219, 0.05), rgba(0, 169, 219, 0.08)); }
  50% { background: linear-gradient(90deg, rgba(0, 169, 219, 0.15), rgba(0, 169, 219, 0.1), rgba(0, 169, 219, 0.15)); }
`;

const StatusMessage = styled.div`
  width: 100%;
  text-align: center;
  font-size: 1.1rem;
  color: #2d3e50;
  z-index: 10;
  animation: ${fadeIn} 0.5s ease-out, ${pulseBackground} 4s infinite;
  background: linear-gradient(90deg, rgba(0, 169, 219, 0.08), rgba(0, 169, 219, 0.05), rgba(0, 169, 219, 0.08));
  padding: 1.2rem;
  border-radius: 12px;
  max-width: 800px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 169, 219, 0.2);
  font-weight: 500;
  letter-spacing: 0.3px;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 1rem;
  }
`;

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ projectId, onComplete }) => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  
  // Estados
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState(t('processing.searchingVideos'));
  const [hasMessages, setHasMessages] = useState(false);
  const [metrics, setMetrics] = useState({
    keywords: 0,
    videos: 0,
    comments: 0,
    insights: 0
  });
  const [changingMetrics, setChangingMetrics] = useState({
    keywords: false,
    videos: false,
    comments: false,
    insights: false
  });

  // Verificar se o projeto tem mensagens
  useEffect(() => {
    const checkForMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('Mensagens')
          .select('id')
          .eq('project_id', projectId)
          .limit(1);
          
        if (error) {
          console.error("Erro ao verificar mensagens:", error);
          return;
        }
        
        setHasMessages(data && data.length > 0);
      } catch (err) {
        console.error("Erro ao verificar mensagens:", err);
      }
    };
    
    checkForMessages();
  }, [projectId]);

  // Configurar assinatura em tempo real para o status do projeto
  useEffect(() => {
    // Função para buscar o status inicial
    const fetchInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('Projeto')
          .select('status')
          .eq('id', projectId)
          .single();
          
        if (error) {
          console.error("Erro ao buscar status inicial:", error);
          return;
        }
        
        if (data && data.status) {
          const step = parseInt(data.status, 10);
          setCurrentStep(isNaN(step) ? 0 : step);
          updateStatusMessage(step);
        }
      } catch (err) {
        console.error("Erro ao buscar status inicial:", err);
      }
    };
    
    fetchInitialStatus();
    
    // Configurar subscription em tempo real
    const subscription = supabase
      .channel('project-status-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Projeto',
        filter: `id=eq.${projectId}`,
      }, (payload) => {
        if (payload.new && payload.new.status !== undefined) {
          const newStep = parseInt(payload.new.status, 10);
          if (!isNaN(newStep)) {
            setCurrentStep(newStep);
            updateStatusMessage(newStep);
            
            // Verificar se atingiu o passo final
            if (newStep >= 6) {
              // Verificar novamente a existência de mensagens
              checkForMessages();
              
              // Recarregar a página após 2 segundos ao chegar no status 6 ou superior
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          }
        }
      })
      .subscribe();
      
    // Simular valores de métricas incrementando ao longo do tempo baseado no passo atual
    const metricsInterval = setInterval(() => {
      setMetrics(prev => {
        const newMetrics = { ...prev };
        const changes = { keywords: false, videos: false, comments: false, insights: false };
        
        // Atualizar métricas baseado no passo atual
        if (currentStep >= 0) {
          const newKeywords = Math.min(prev.keywords + Math.floor(Math.random() * 3), 50);
          if (newKeywords !== prev.keywords) {
            newMetrics.keywords = newKeywords;
            changes.keywords = true;
          }
        }
        
        if (currentStep >= 1) {
          const newVideos = Math.min(prev.videos + Math.floor(Math.random() * 2), 30);
          if (newVideos !== prev.videos) {
            newMetrics.videos = newVideos;
            changes.videos = true;
          }
        }
        
        if (currentStep >= 3) {
          const newComments = Math.min(prev.comments + Math.floor(Math.random() * 5), 120);
          if (newComments !== prev.comments) {
            newMetrics.comments = newComments;
            changes.comments = true;
          }
        }
        
        // Marcar métricas como mudando para animação
        setChangingMetrics(changes);
        setTimeout(() => setChangingMetrics({ keywords: false, videos: false, comments: false, insights: false }), 500);
        
        return newMetrics;
      });
    }, 2000);
    
    // Verificar mensagens periodicamente enquanto estiver processando
    // Aumentando a frequência para 5 segundos para ser mais responsivo
    const checkForMessagesInterval = setInterval(checkForMessages, 5000);
    
    // Cleanup
    return () => {
      subscription.unsubscribe();
      clearInterval(metricsInterval);
      clearInterval(checkForMessagesInterval);
    };
  }, [projectId, onComplete]);
  
  // Função auxiliar para verificar a existência de mensagens
  const checkForMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('Mensagens')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
        
      if (error) {
        console.error("Erro ao verificar mensagens:", error);
        return;
      }
      
      const hasMsgs = Boolean(data && data.length > 0);
      setHasMessages(hasMsgs);
      
      // Se estamos no passo final e temos mensagens, notificar que está completo
      if (currentStep >= 6 && hasMsgs && onComplete) {
        console.log("Processamento concluído E dados disponíveis, completando...");
        onComplete();
        // Recarregar a página para garantir transição para estado final
        console.log("Condições de conclusão atingidas, recarregando página...");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
      // Mesmo se ainda não temos mensagens mas estamos no passo 6 ou superior,
      // agendar outra verificação em 5 segundos
      if (currentStep >= 6 && !hasMsgs) {
        console.log("Passo final atingido mas ainda sem mensagens, verificando novamente em 5s");
        setTimeout(checkForMessages, 5000);
      }
    } catch (err) {
      console.error("Erro ao verificar mensagens:", err);
    }
  };
  
  // Função para atualizar a mensagem de status com base no passo atual
  const updateStatusMessage = (step: number) => {
    const messages = [
      t('processing.searchingVideos'),
      t('processing.analyzingContent'),
      t('processing.extractingData'),
      t('processing.processingComments'),
      t('processing.generatingInsights'),
      t('processing.finalizing'),
      t('processing.completed')
    ];
    
    setStatusMessage(messages[step] || t('common.loading'));
  };

  // Definições de cada etapa do processo
  const steps = [
    {
      title: t('overview.keywords'),
      description: t('processing.searchingVideos'),
      icon: FaSearch
    },
    {
      title: t('overview.videos'),
      description: t('processing.analyzingContent'),
      icon: FaVideo
    },
    {
      title: t('common.save'),
      description: t('processing.extractingData'),
      icon: FaDatabase
    },
    {
      title: t('processing.analyzingContent'),
      description: t('processing.processingComments'),
      icon: FaBrain
    },
    {
      title: t('mentions.title'),
      description: t('processing.generatingInsights'),
      icon: FaComments
    },
    {
      title: t('processing.finalizing'),
      description: t('processing.completed'),
      icon: FaRocket
    }
  ];

  return (
    <Container>
      <TechBackground zIndex={1} opacity={0.3} />
      
      {/* Partículas flutuantes apenas no tema escuro */}
      {isDarkMode && [...Array(9)].map((_, i) => (
        <FloatingParticle key={i} />
      ))}
      
      <Title>{t('processing.title')}</Title>
      <Subtitle>
        {t('processing.subtitle')}
      </Subtitle>
      
      <Timeline>
        <StepLine />
        {steps.map((step, index) => (
          <Step key={index}>
            <StepIcon 
              active={currentStep === index} 
              completed={currentStep > index}
            >
              <IconComponent icon={step.icon} />
            </StepIcon>
            <StepContent 
              active={currentStep === index} 
              completed={currentStep > index}
            >
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </StepContent>
          </Step>
        ))}
      </Timeline>
      
      <DataVisualization>
        <MetricCard 
          className="card-1" 
          style={{"--index": 0} as any}
          isActive={currentStep === 0}
          isCompleted={currentStep > 0}
        >
          <MetricTitle>{t('overview.keywords')}</MetricTitle>
          <MetricValue isChanging={changingMetrics.keywords}>
            {metrics.keywords}
          </MetricValue>
          <MetricSubvalue>{t('processing.analyzingContent')}</MetricSubvalue>
        </MetricCard>
        
        <MetricCard 
          className="card-2" 
          style={{"--index": 1} as any}
          isActive={currentStep === 1 || currentStep === 2}
          isCompleted={currentStep > 2}
        >
          <MetricTitle>{t('overview.videos')}</MetricTitle>
          <MetricValue isChanging={changingMetrics.videos}>
            {metrics.videos}
          </MetricValue>
          <MetricSubvalue>{t('processing.searchingVideos')}</MetricSubvalue>
        </MetricCard>
        
        <MetricCard 
          className="card-3" 
          style={{"--index": 2} as any}
          isActive={currentStep === 3 || currentStep === 4}
          isCompleted={currentStep > 4}
        >
          <MetricTitle>{t('mentions.title')}</MetricTitle>
          <MetricValue isChanging={changingMetrics.comments}>
            {metrics.comments}
          </MetricValue>
          <MetricSubvalue>{t('processing.processingComments')}</MetricSubvalue>
        </MetricCard>
      </DataVisualization>
      
      <StatusMessage>{statusMessage}</StatusMessage>
    </Container>
  );
};

export default ProcessingIndicator;