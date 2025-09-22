import React, { useEffect, useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { useGlobalLoading } from '../context/LoadingContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [showProcessing, setShowProcessing] = useState(false);
  const [verifiedReady, setVerifiedReady] = useState(false);
  const [hasMensagens, setHasMensagens] = useState(false);
  const [isCheckingInitial, setIsCheckingInitial] = useState(true); // Novo estado para verificação inicial
  const [lastCheckedProjectId, setLastCheckedProjectId] = useState<string | number | null>(null); // Para evitar verificações duplicadas
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null); // Para gerenciar inscrição realtime
  const [realtimeStatus, setRealtimeStatus] = useState<number | null>(null); // Estado para rastrear status em tempo real
  const [hasIntegration, setHasIntegration] = useState<boolean>(false); // Estado para verificar se tem integração
  const [checkingIntegration, setCheckingIntegration] = useState<boolean>(true); // Estado para verificar integração
  
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

  // Verifica se o projeto tem integração YouTube ativa
  const checkIntegration = useCallback(async (projectId: string | number) => {
    try {
      console.log(`Verificando integração YouTube para projeto ${projectId}...`);
      const { data, error } = await supabase
        .from('Integrações')
        .select('id, ativo')
        .eq('PROJETO id', projectId)
        .eq('Tipo de integração', 'youtube')
        .eq('ativo', true)
        .single();

      if (error || !data) {
        console.log('Projeto sem integração YouTube ativa');
        return false;
      }

      console.log('Projeto tem integração YouTube ativa');
      return true;
    } catch (err) {
      console.error("Erro ao verificar integração:", err);
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

  // Função para configurar realtime subscriptions
  const setupRealtimeSubscriptions = useCallback((projectId: string | number) => {
    // Limpar inscrição anterior se existir
    if (realtimeSubscription) {
      console.log('[ProcessingWrapper] Removendo inscrição realtime anterior');
      realtimeSubscription.unsubscribe();
    }

    console.log(`[ProcessingWrapper] Configurando realtime para projeto ${projectId}`);

    // Criar canal para monitorar mudanças nas tabelas
    const channel = supabase
      .channel(`project-${projectId}-processing`)
      // Monitorar mudanças no status do projeto
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Projeto',
          filter: `id=eq.${projectId}`
        },
        async (payload) => {
          console.log('[ProcessingWrapper] Status do projeto atualizado via realtime:', payload);
          const newStatus = parseInt(payload.new.status || '0', 10);
          setRealtimeStatus(newStatus); // Atualizar status em tempo real

          // Se status mudou para 6, verificar se tem mensagens
          if (newStatus === 6) {
            const hasMessages = await checkForMessages(projectId);
            if (hasMessages) {
              console.log('[ProcessingWrapper] Projeto pronto! Status=6 e tem mensagens');
              setShowProcessing(false);
              setVerifiedReady(true);
              // Reload para garantir que todos os dados estejam atualizados
              setTimeout(() => {
                window.location.reload();
              }, 500); // Pequeno delay para feedback visual
            }
          } else if (newStatus > 6) {
            console.log('[ProcessingWrapper] Projeto definitivamente pronto! Status > 6');
            setShowProcessing(false);
            setVerifiedReady(true);
            // Reload também para status > 6
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }
      )
      // Monitorar inserção de mensagens
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Mensagens',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          console.log('[ProcessingWrapper] Nova mensagem inserida via realtime:', payload);

          // Verificar status do projeto
          const status = await checkProjectStatus(projectId);

          // Se status é 6 e agora tem mensagens, projeto está pronto
          if (status === 6 && !hasMensagens) {
            console.log('[ProcessingWrapper] Primeira mensagem detectada! Projeto agora está pronto');
            setHasMensagens(true);
            setShowProcessing(false);
            setVerifiedReady(true);
            // Reload quando primeira mensagem é detectada
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }
      )
      .subscribe();

    setRealtimeSubscription(channel);
  }, [checkForMessages, checkProjectStatus, hasMensagens]);

  // Efeito principal para verificação completa do estado
  useEffect(() => {
    // Resetar estados quando projeto mudar
    let checkAgainTimeout: NodeJS.Timeout | null = null;
    let isMounted = true; // Para evitar updates após unmount

    if (currentProject?.id) {
      // Evitar verificação duplicada para o mesmo projeto
      if (lastCheckedProjectId === currentProject.id && verifiedReady) {
        console.log(`Projeto ${currentProject.id} já foi verificado, pulando verificação duplicada`);
        return;
      }

      console.log(`[ProcessingWrapper] Novo projeto selecionado (${currentProject.id}), iniciando verificação...`);

      // IMPORTANTE: Resetar TODOS os estados ao trocar de projeto
      setIsCheckingInitial(true); // Começar em estado de verificação
      setVerifiedReady(false);
      setShowProcessing(false); // NÃO mostrar processamento até confirmar que precisa
      setHasMensagens(false); // Resetar estado de mensagens
      setRealtimeStatus(null); // Resetar status realtime
      setLastCheckedProjectId(currentProject.id); // Marcar projeto como verificado

      // Notificar o parent que estamos verificando
      if (onCheckingStateChange) {
        onCheckingStateChange(true);
      }

      // SEMPRE esconder o GlobalLoader - deixar o ProcessingWrapper gerenciar a visualização
      hideGlobalLoader();

      // Configurar realtime subscriptions para este projeto
      setupRealtimeSubscriptions(currentProject.id);
      
      // Função de verificação completa
      const verifyProjectState = async () => {
        if (!currentProject || !isMounted) return;

        const projectId = currentProject.id;

        // PRIMEIRO: Verificar se tem integração
        const hasInt = await checkIntegration(projectId);
        setHasIntegration(hasInt);
        setCheckingIntegration(false);

        // Se não tem integração, não precisa verificar mais nada
        if (!hasInt) {
          setIsCheckingInitial(false);
          setShowProcessing(true); // Mostrar tela de integração necessária
          hideGlobalLoader();
          if (onCheckingStateChange) {
            onCheckingStateChange(false);
          }
          return;
        }

        const status = await checkProjectStatus(projectId);
        setRealtimeStatus(status); // Inicializar status realtime
        const hasMessages = await checkForMessages(projectId);

        // Se componente foi desmontado, não fazer nada
        if (!isMounted) return;
        
        // Regras de decisão simples:
        // 1. Se status <= 5: SEMPRE mostrar processamento
        // 2. Se status == 6 E NÃO tem mensagens: mostrar processamento
        // 3. Se status == 6 E tem mensagens: mostrar dashboard
        // 4. Se status > 6: sempre mostrar dashboard
        
        const shouldShowProcessing = status <= 5 || (status === 6 && !hasMessages);
        
        console.log(`[ProcessingWrapper] Decisão para projeto ${projectId}: status=${status}, hasMensagens=${hasMessages}, shouldShowProcessing=${shouldShowProcessing}`);
        
        // Após primeira verificação, desativar checking inicial
        setIsCheckingInitial(false);
        
        // Notificar o parent que terminamos de verificar
        if (onCheckingStateChange) {
          onCheckingStateChange(false);
        }
        
        if (!shouldShowProcessing) {
          console.log(`[ProcessingWrapper] Projeto ${projectId} está pronto para exibição`);
          setShowProcessing(false);
          setVerifiedReady(true);
          hideGlobalLoader(); // Garantir que está escondido
        } else {
          console.log(`[ProcessingWrapper] Projeto ${projectId} ainda em processamento`);
          setShowProcessing(true);
          hideGlobalLoader(); // SEMPRE esconder o loader global pois vamos mostrar o componente visual
          
          // Continuar verificando enquanto não estiver pronto
          if (isMounted) {
            checkAgainTimeout = setTimeout(verifyProjectState, 3000);
          }
        }
      };
      
      // Iniciar verificação imediatamente
      verifyProjectState();
    }
    
    // Cleanup function to hide loader when unmounting ou mudando de projeto
    return () => {
      isMounted = false;
      if (checkAgainTimeout) {
        clearTimeout(checkAgainTimeout);
      }
      // Limpar inscrição realtime
      if (realtimeSubscription) {
        console.log('[ProcessingWrapper] Limpando inscrição realtime');
        realtimeSubscription.unsubscribe();
      }
      hideGlobalLoader();
      // Notificar o parent que não estamos mais verificando
      if (onCheckingStateChange) {
        onCheckingStateChange(false);
      }
    };
  }, [currentProject?.id, checkForMessages, checkProjectStatus, checkIntegration, hideGlobalLoader, onCheckingStateChange, setupRealtimeSubscriptions]); // Adicionado setupRealtimeSubscriptions e checkIntegration
  
  // Se está processando, mostrar componente visual bonito
  // Usar realtimeStatus se disponível, senão usar status do contexto
  const statusNum = realtimeStatus ?? parseInt(currentProject?.status || '0', 10);
  
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
  
  // Se não tem integração, mostrar tela de conexão
  if (!checkingIntegration && !hasIntegration && showProcessing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '40px 20px',
        position: 'relative',
        zIndex: 10000
      }}>
        {/* Background gradient effect - usando cores Liftlio */}
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

        <div style={{
          width: '100%',
          maxWidth: '500px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.05))',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center'
        }}>
          {/* YouTube Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px'
          }}>
            🔗
          </div>

          <h2 style={{
            marginBottom: '16px',
            color: '#fff',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            YouTube Connection Required
          </h2>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            To start monitoring your brand mentions and analyzing engagement,
            you need to connect a YouTube channel to this project.
          </p>

          {/* Single Action Button */}
          <button
            onClick={() => navigate('/integrations')}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            }}
          >
            Go to Integrations
          </button>
        </div>

        {/* Helper Text */}
        <div style={{
          marginTop: '24px',
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          💡 Tip: You can connect a new YouTube channel or reuse an existing connection
        </div>
      </div>
    );
  }

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