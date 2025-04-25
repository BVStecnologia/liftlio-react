import React, { useEffect, useState, useCallback } from 'react';
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
  background-color: #e6edf2;
  color: #2d3e50;
  overflow: hidden;
  border-radius: 12px;
  padding: 3rem 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(230, 237, 242, 0.97), rgba(220, 232, 242, 0.99));
    z-index: 0;
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
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
  color: #2d3e50;
  text-align: center;
  position: relative;
  z-index: 10;
  animation: ${scanTextAnimation} 1.5s ease-out forwards;
  text-shadow: 0 2px 10px rgba(45, 62, 80, 0.2);
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
  color: #34495e;
  line-height: 1.6;
  font-weight: 400;
  background: linear-gradient(90deg, rgba(181, 194, 203, 0.2), rgba(181, 194, 203, 0.1), rgba(181, 194, 203, 0.2));
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(181, 194, 203, 0.4);
  
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
    rgba(45, 62, 80, 0.2),
    rgba(45, 62, 80, 0.5),
    rgba(45, 62, 80, 0.2));
  transform: translateX(-50%);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(45, 62, 80, 0.1);
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
      : 'rgba(181, 194, 203, 0.3)'};
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1.5rem;
  color: ${props => props.active || props.completed ? 'white' : '#34495e'};
  font-size: 1.6rem;
  border: 3px solid ${props => props.active 
    ? '#00A9DB' 
    : props.completed 
      ? '#4CAF50' 
      : 'rgba(181, 194, 203, 0.4)'};
  transition: all 0.3s ease;
  position: relative;
  animation: ${props => props.active ? iconGlow : 'none'} 2s infinite;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
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

const MetricCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
  width: calc(25% - 1.8rem);
  max-width: 240px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(181, 194, 203, 0.4);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  transform: translateY(0);
  transition: all 0.3s ease;
  
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
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
    border-color: rgba(45, 62, 80, 0.3);
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
    background: linear-gradient(90deg, transparent, rgba(45, 62, 80, 0.2), transparent);
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

const MetricValue = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: #2d3e50;
  margin-bottom: 0.8rem;
  animation: ${valueAnimation} 3s infinite;
  font-family: 'Montserrat', sans-serif;
  animation: ${countAnimation} 0.3s ease-out;
`;

const MetricSubvalue = styled.div`
  font-size: 0.95rem;
  color: #34495e;
  font-weight: 400;
  letter-spacing: 0.5px;
`;

// Mensagem de status
const pulseBackground = keyframes`
  0%, 100% { background: linear-gradient(90deg, rgba(181, 194, 203, 0.15), rgba(181, 194, 203, 0.1), rgba(181, 194, 203, 0.15)); }
  50% { background: linear-gradient(90deg, rgba(181, 194, 203, 0.25), rgba(181, 194, 203, 0.2), rgba(181, 194, 203, 0.25)); }
`;

const StatusMessage = styled.div`
  width: 100%;
  text-align: center;
  font-size: 1.1rem;
  color: #2d3e50;
  z-index: 10;
  animation: ${fadeIn} 0.5s ease-out, ${pulseBackground} 4s infinite;
  background: linear-gradient(90deg, rgba(181, 194, 203, 0.15), rgba(181, 194, 203, 0.1), rgba(181, 194, 203, 0.15));
  padding: 1.2rem;
  border-radius: 12px;
  max-width: 800px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(181, 194, 203, 0.4);
  font-weight: 500;
  letter-spacing: 0.3px;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 1rem;
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
            if (newStep === 6) {
              // Verificar novamente a existência de mensagens
              checkForMessages();
              
              // Recarregar a página após 2 segundos ao chegar no status 6
              setTimeout(() => {
                window.location.reload();
              }, 2000);
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
      "Creating dozens of semantic keywords with search intent...",
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
      description: "Creating semantic keywords with search intent",
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
      <TechBackground zIndex={1} opacity={0.3} />
      
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