import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
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
  background-color: rgba(22, 30, 46, 0.98);
  color: white;
  overflow: hidden;
  border-radius: 8px;
  padding: 2rem 1rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem 0.5rem;
  }
`;

// Título com animação de digitalização
const scanTextAnimation = keyframes`
  0% { clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: white;
  text-align: center;
  position: relative;
  z-index: 10;
  animation: ${scanTextAnimation} 1.5s ease-out forwards;
  
  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2.5rem;
  text-align: center;
  max-width: 700px;
  padding: 0 1rem;
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 1.5s;
  opacity: 0;
  animation-fill-mode: forwards;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
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
  left: 25px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-50%);
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
`;

const iconGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(46, 182, 255, 0.7); }
  50% { box-shadow: 0 0 25px rgba(46, 182, 255, 1); }
`;

const StepIcon = styled.div<StepIndicatorProps>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #2e6bff, #2eb6ff)' 
    : props.completed 
      ? 'linear-gradient(135deg, #27ae60, #2ecc71)' 
      : 'rgba(255, 255, 255, 0.1)'};
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1rem;
  color: white;
  font-size: 1.4rem;
  border: 2px solid rgba(255, 255, 255, ${props => props.active ? '0.9' : props.completed ? '0.6' : '0.2'});
  transition: all 0.3s ease;
  position: relative;
  animation: ${props => props.active ? iconGlow : 'none'} 2s infinite;

  /* Efeito de círculo ao redor do ícone ativo */
  &::after {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    border: 2px solid rgba(46, 182, 255, ${props => props.active ? '0.6' : '0'});
    animation: ${pulse} 2s infinite;
    display: ${props => props.active ? 'block' : 'none'};
  }
`;

const StepContent = styled.div<StepIndicatorProps>`
  opacity: ${props => props.active ? '1' : props.completed ? '0.8' : '0.4'};
  transition: all 0.3s ease;
`;

const StepTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.2rem 0;
  color: white;
`;

const StepDescription = styled.p`
  font-size: 0.9rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  max-width: 300px;
`;

// Componente de visualização de dados em processamento
const DataVisualization = styled.div`
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
  padding: 0 1rem;
  z-index: 10;
  position: relative;
`;

const scanLineAnimation = keyframes`
  0% { transform: translateY(-100%); opacity: 0.5; }
  100% { transform: translateY(100%); opacity: 0; }
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 160px;
  width: calc(25% - 1.5rem);
  max-width: 220px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 900px) {
    width: calc(50% - 1.5rem);
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
    height: 5px;
    background: linear-gradient(90deg, transparent, rgba(46, 182, 255, 0.8), transparent);
    animation: ${scanLineAnimation} 2s infinite;
    animation-delay: calc(var(--index) * 0.5s);
  }
`;

const MetricTitle = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 0.5rem 0;
`;

const valueAnimation = keyframes`
  0%, 100% { color: rgba(255, 255, 255, 0.9); }
  50% { color: rgba(46, 182, 255, 1); }
`;

const MetricValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
  animation: ${valueAnimation} 3s infinite;
`;

const MetricSubvalue = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
`;

// Mensagem de status
const StatusMessage = styled.div`
  width: 100%;
  text-align: center;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  z-index: 10;
  animation: ${fadeIn} 0.5s ease-out;
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 8px;
  max-width: 800px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.8rem;
  }
`;

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ projectId, onComplete }) => {
  // Estados
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing analysis...');
  const [hasMessages, setHasMessages] = useState(false);
  const [metrics, setMetrics] = useState({
    keywords: 0,
    videos: 0,
    comments: 0,
    insights: 0
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
            if (newStep === 6 && onComplete) {
              // Verificar novamente a existência de mensagens
              checkForMessages();
            }
          }
        }
      })
      .subscribe();
      
    // Simular valores de métricas incrementando ao longo do tempo
    const metricsInterval = setInterval(() => {
      setMetrics(prev => ({
        keywords: Math.min(prev.keywords + Math.floor(Math.random() * 3), 50),
        videos: Math.min(prev.videos + Math.floor(Math.random() * 2), 30),
        comments: Math.min(prev.comments + Math.floor(Math.random() * 5), 120),
        insights: Math.min(prev.insights + Math.floor(Math.random() * 1), 15)
      }));
    }, 2000);
    
    // Verificar mensagens periodicamente enquanto estiver processando
    const checkForMessagesInterval = setInterval(checkForMessages, 10000);
    
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
      if (currentStep === 6 && hasMsgs && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Erro ao verificar mensagens:", err);
    }
  };
  
  // Função para atualizar a mensagem de status com base no passo atual
  const updateStatusMessage = (step: number) => {
    const messages = [
      "Searching for active keywords for your project...",
      "Finding the most relevant videos for your project...",
      "Storing discovered videos for analysis...",
      "Analyzing video content with advanced AI...",
      "Processing and evaluating relevant comments...",
      "Creating personalized engagement messages...",
      "Preparation complete! Loading your dashboard..."
    ];
    
    setStatusMessage(messages[step] || "Processing data...");
  };

  // Definições de cada etapa do processo
  const steps = [
    {
      title: "Keyword Search",
      description: "Identifying keywords for your project",
      icon: FaSearch
    },
    {
      title: "Video Location",
      description: "Finding the most relevant videos",
      icon: FaVideo
    },
    {
      title: "Data Storage",
      description: "Saving discovered videos for analysis",
      icon: FaDatabase
    },
    {
      title: "Content Analysis",
      description: "Processing videos with artificial intelligence",
      icon: FaBrain
    },
    {
      title: "Comment Evaluation",
      description: "Analyzing the most relevant comments",
      icon: FaComments
    },
    {
      title: "Message Creation",
      description: "Generating personalized engagement messages",
      icon: FaRocket
    }
  ];

  return (
    <Container>
      <TechBackground zIndex={1} />
      
      <Title>Preparing Your Intelligent Analysis</Title>
      <Subtitle>
        Our technology is analyzing the best engagement opportunities for your project
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
        <MetricCard style={{"--index": 0} as any}>
          <MetricTitle>Keywords</MetricTitle>
          <MetricValue>{metrics.keywords}</MetricValue>
          <MetricSubvalue>Analyzed</MetricSubvalue>
        </MetricCard>
        
        <MetricCard style={{"--index": 1} as any}>
          <MetricTitle>Videos</MetricTitle>
          <MetricValue>{metrics.videos}</MetricValue>
          <MetricSubvalue>Found</MetricSubvalue>
        </MetricCard>
        
        <MetricCard style={{"--index": 2} as any}>
          <MetricTitle>Comments</MetricTitle>
          <MetricValue>{metrics.comments}</MetricValue>
          <MetricSubvalue>Processed</MetricSubvalue>
        </MetricCard>
        
        <MetricCard style={{"--index": 3} as any}>
          <MetricTitle>Insights</MetricTitle>
          <MetricValue>{metrics.insights}</MetricValue>
          <MetricSubvalue>Discovered</MetricSubvalue>
        </MetricCard>
      </DataVisualization>
      
      <StatusMessage>{statusMessage}</StatusMessage>
    </Container>
  );
};

export default ProcessingIndicator;