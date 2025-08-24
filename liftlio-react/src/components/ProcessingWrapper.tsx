import React, { useEffect, useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { useGlobalLoading } from '../context/LoadingContext';
import { supabase } from '../lib/supabaseClient';

// Componente para mostrar cada etapa do processo
const ProcessStep: React.FC<{
  number: number;
  label: string;
  active?: boolean;
  completed?: boolean;
}> = ({ number, label, active, completed }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '20px',
      opacity: completed || active ? 1 : 0.5
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: completed ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 
                    active ? 'rgba(139, 92, 246, 0.2)' : 
                    'rgba(255, 255, 255, 0.1)',
        border: active ? '2px solid #8b5cf6' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '12px',
        fontSize: '14px',
        fontWeight: 'bold',
        color: completed || active ? '#fff' : 'rgba(255, 255, 255, 0.5)',
        transition: 'all 0.3s ease',
        boxShadow: active ? '0 0 20px rgba(139, 92, 246, 0.4)' : 
                   completed ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none'
      }}>
        {completed ? '✓' : number}
      </div>
      <div style={{
        flex: 1,
        fontSize: '14px',
        color: completed || active ? '#fff' : 'rgba(255, 255, 255, 0.5)',
        fontWeight: active ? '500' : 'normal'
      }}>
        {label}
        {active && (
          <span style={{
            marginLeft: '8px',
            fontSize: '12px',
            color: '#a855f7',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            Processing...
          </span>
        )}
      </div>
    </div>
  );
};

interface ProcessingWrapperProps {
  children: React.ReactNode;
  onCheckingStateChange?: (isChecking: boolean) => void;
}

/**
 * Wrapper component that conditionally shows a processing indicator
 * when a project is in initial processing state with no messages yet.
 */
const ProcessingWrapper: React.FC<ProcessingWrapperProps> = ({ children, onCheckingStateChange }) => {
  const { currentProject, isInitialProcessing } = useProject();
  const { showGlobalLoader, hideGlobalLoader } = useGlobalLoading();
  const [showProcessing, setShowProcessing] = useState(false);
  const [verifiedReady, setVerifiedReady] = useState(false);
  const [hasMensagens, setHasMensagens] = useState(false);
  const [isCheckingInitial, setIsCheckingInitial] = useState(true); // Novo estado para verificação inicial
  
  // Verifica diretamente se existem mensagens para o projeto
  const checkForMessages = useCallback(async (projectId: string | number) => {
    try {
      console.log(`Verificando mensagens para projeto ${projectId}...`);
      const { data, error } = await supabase
        .from('Mensagens')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
        
      if (error) {
        console.error("Erro ao verificar mensagens:", error);
        return false;
      }
      
      const hasMessages = Boolean(data && data.length > 0);
      console.log(`Projeto ${projectId} tem mensagens? ${hasMessages}`);
      setHasMensagens(hasMessages);
      return hasMessages;
    } catch (err) {
      console.error("Erro ao verificar mensagens:", err);
      return false;
    }
  }, []);

  // Verifica o status do projeto
  const checkProjectStatus = useCallback(async (projectId: string | number) => {
    try {
      console.log(`Verificando status do projeto ${projectId}...`);
      const { data, error } = await supabase
        .from('Projeto')
        .select('status')
        .eq('id', projectId)
        .single();
        
      if (error) {
        console.error("Erro ao verificar status do projeto:", error);
        return -1;
      }
      
      const status = parseInt(data?.status || '0', 10);
      console.log(`Status do projeto ${projectId}: ${status}`);
      return status;
    } catch (err) {
      console.error("Erro ao verificar status:", err);
      return -1;
    }
  }, []);

  // Efeito principal para verificação completa do estado
  useEffect(() => {
    // Resetar estados quando projeto mudar
    let checkAgainTimeout: NodeJS.Timeout | null = null;
    
    if (currentProject?.id) {
      console.log(`Novo projeto selecionado (${currentProject.id}), iniciando verificação...`);
      
      // IMPORTANTE: Resetar TODOS os estados ao trocar de projeto
      setIsCheckingInitial(true); // Começar em estado de verificação
      setVerifiedReady(false);
      setShowProcessing(false); // NÃO mostrar processamento até confirmar que precisa
      setHasMensagens(false); // Resetar estado de mensagens
      
      // Notificar o parent que estamos verificando
      if (onCheckingStateChange) {
        onCheckingStateChange(true);
      }
      
      // SEMPRE esconder o GlobalLoader - deixar o ProcessingWrapper gerenciar a visualização
      hideGlobalLoader();
      
      // Função de verificação completa
      const verifyProjectState = async () => {
        if (!currentProject) return;
        
        const projectId = currentProject.id;
        const status = await checkProjectStatus(projectId);
        const hasMessages = await checkForMessages(projectId);
        
        // Regras de decisão simples:
        // 1. Se status < 6: mostrar processamento
        // 2. Se status >= 6 E NÃO tem mensagens: mostrar processamento
        // 3. Se status >= 6 E tem mensagens: mostrar dashboard
        
        const shouldShowProcessing = status < 6 || (status >= 6 && !hasMessages);
        
        // Após primeira verificação, desativar checking inicial
        setIsCheckingInitial(false);
        
        // Notificar o parent que terminamos de verificar
        if (onCheckingStateChange) {
          onCheckingStateChange(false);
        }
        
        if (!shouldShowProcessing) {
          console.log(`Projeto ${projectId} está pronto para exibição (status=${status}, hasMensagens=${hasMessages})`);
          setShowProcessing(false);
          setVerifiedReady(true);
          hideGlobalLoader(); // Hide global loader when ready
        } else {
          console.log(`Projeto ${projectId} ainda em processamento ou sem dados (status=${status}, hasMensagens=${hasMessages})`);
          setShowProcessing(true);
          hideGlobalLoader(); // SEMPRE esconder o loader global pois vamos mostrar o componente visual
          
          // Continuar verificando enquanto não estiver pronto, com intervalo mais curto
          checkAgainTimeout = setTimeout(verifyProjectState, 3000);
        }
      };
      
      // Iniciar verificação com pequeno delay para evitar race conditions
      setTimeout(verifyProjectState, 50);
    }
    
    // Cleanup function to hide loader when unmounting ou mudando de projeto
    return () => {
      if (checkAgainTimeout) {
        clearTimeout(checkAgainTimeout);
      }
      hideGlobalLoader();
      // Notificar o parent que não estamos mais verificando
      if (onCheckingStateChange) {
        onCheckingStateChange(false);
      }
    };
  }, [currentProject?.id, checkForMessages, checkProjectStatus, hideGlobalLoader, onCheckingStateChange]); // Dependências necessárias
  
  // Se está processando, mostrar componente visual bonito
  const statusNum = parseInt(currentProject?.status || '0', 10);
  
  // Sempre esconder GlobalLoader quando este componente está ativo
  React.useEffect(() => {
    if (statusNum <= 5 || showProcessing) {
      console.log('[ProcessingWrapper] Escondendo GlobalLoader pois projeto está em processamento');
      hideGlobalLoader();
    }
  }, [statusNum, showProcessing, hideGlobalLoader]);
  
  // Garantir que o GlobalLoader está escondido durante a verificação inicial
  React.useEffect(() => {
    if (isCheckingInitial) {
      hideGlobalLoader();
    }
  }, [isCheckingInitial, hideGlobalLoader]);
  
  // SEMPRE mostrar 6 etapas se status <= 5 OU se showProcessing está ativo
  // Isso cobre dois casos:
  // 1. Projeto novo com status <= 5
  // 2. Projeto com status 6 mas ainda sem mensagens
  if (statusNum <= 5 || (showProcessing && !isCheckingInitial)) {
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '40px 20px',
        position: 'relative',
        zIndex: 10000  // Maior que o GlobalLoader (9999) para garantir que sempre fique por cima
      }}>
        {/* Background gradient effect */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'pulse 3s ease-in-out infinite'
        }} />
        
        <h2 style={{ 
          marginBottom: '40px', 
          color: '#fff',
          fontSize: '28px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          Setting Up Your Project
        </h2>
        
        {/* Container do progresso */}
        <div style={{
          width: '100%',
          maxWidth: '500px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.05))',
          borderRadius: '16px',
          padding: '35px',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Etapas do processo */}
          <div style={{ marginBottom: '30px' }}>
            <ProcessStep 
              number={1} 
              label="Creating project structure" 
              active={statusNum === 1}
              completed={statusNum > 1}
            />
            <ProcessStep 
              number={2} 
              label="Connecting to YouTube API" 
              active={statusNum === 2}
              completed={statusNum > 2}
            />
            <ProcessStep 
              number={3} 
              label="Searching for relevant videos" 
              active={statusNum === 3}
              completed={statusNum > 3}
            />
            <ProcessStep 
              number={4} 
              label="Analyzing mentions and comments" 
              active={statusNum === 4}
              completed={statusNum > 4}
            />
            <ProcessStep 
              number={5} 
              label="Processing sentiment analysis" 
              active={statusNum === 5}
              completed={statusNum > 5}
            />
            <ProcessStep 
              number={6} 
              label="Finalizing dashboard data" 
              active={statusNum === 6 && !hasMensagens}
              completed={statusNum === 6 && hasMensagens}
            />
          </div>
          
          {/* Barra de progresso animada */}
          <div style={{
            width: '100%',
            height: '10px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '10px'
          }}>
            <div style={{
              height: '100%',
              width: `${(statusNum / 6) * 100}%`,
              background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)',
              borderRadius: '20px',
              animation: 'shimmer 2s ease-in-out infinite',
              backgroundSize: '200% 100%',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
              transition: 'width 0.5s ease'
            }} />
          </div>
          
          {/* Mensagem de status */}
          <div style={{
            textAlign: 'center',
            marginTop: '25px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: '500'
          }}>
            {statusNum < 3 ? '🚀 Initializing your project...' :
             statusNum === 3 ? '🔍 Searching YouTube for relevant discussions...' :
             statusNum === 4 ? '💬 Analyzing comments and mentions...' :
             statusNum === 5 ? '🤖 Processing sentiment analysis with AI...' :
             '✨ Preparing your dashboard...'}
          </div>
          
          {/* Mensagem informativa */}
          <div style={{
            textAlign: 'center',
            marginTop: '10px',
            fontSize: '12px',
            color: 'rgba(168, 85, 247, 0.7)',
            fontStyle: 'italic'
          }}>
            First-time setup takes a bit longer • Next time will be instant
          </div>
        </div>
        
        {/* Dica adicional */}
        <div style={{
          marginTop: '30px',
          padding: '15px 20px',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0
          }}>
            💡 <strong>Pro tip:</strong> We're scanning millions of YouTube videos to find mentions of your brand. 
            The more specific your keywords, the better the results!
          </p>
        </div>
        
        {/* CSS para animações */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }
  
  // IMPORTANTE: Durante verificação inicial, retornar null para evitar que Dashboard seja renderizado
  // Isso previne que useDashboardData seja chamado e mostre outro loader
  if (isCheckingInitial) {
    return null;
  }
  
  // Só mostrar children quando verificação terminou
  return <>{children}</>;
};

export default ProcessingWrapper;