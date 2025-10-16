import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabaseClient';
import ProjectCreationPage from '../pages/ProjectCreationPage';
import Integrations from '../pages/Integrations';
import LoginPage from '../pages/LoginPage';

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
}

/**
 * ProcessingWrapper SIMPLIFICADO - Usa apenas a função RPC check_project_display_state
 * Uma chamada, uma decisão, sem múltiplas verificações!
 */
const ProcessingWrapperSimplified: React.FC<ProcessingWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentProject } = useProject();

  // ✅ CORREÇÃO: Extrair propriedades primitivas para React detectar mudanças corretamente
  const userEmail = user?.email;
  const projectId = currentProject?.id;
  const projectStatus = currentProject?.status;
  const updateTimestamp = currentProject?._updateTimestamp;

  const [displayState, setDisplayState] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Função principal que chama o RPC - SIMPLIFICADA
  const checkProjectState = useCallback(async (isPolling: boolean = false) => {
    if (!user?.email) return;

    try {
      console.log('[ProcessingWrapper] Verificando estado do projeto:', {
        userId: user.email,
        projectId: currentProject?.id,
        currentStatus: currentProject?.status,
        isPolling
      });

      const { data, error } = await supabase.rpc('check_project_display_state', {
        p_user_email: user.email,
        p_project_id: currentProject?.id || null
      });

      if (error) {
        console.error('[ProcessingWrapper] Erro no RPC:', error);
        return;
      }

      console.log('[ProcessingWrapper] RPC retornou:', {
        displayComponent: data?.display_component,
        projectStatus: data?.project_status,
        progress: data?.progress_percentage,
        hasMessages: data?.has_messages
      });

      // Atualiza estado IMEDIATAMENTE - sem queries extras
      // Força nova referência para garantir re-render
      setDisplayState({ ...data });

      // Setup polling APENAS se necessário
      if (data?.display_component === 'setup_processing' && !data?.has_messages) {
        if (!pollingInterval && !isPolling) {
          console.log('[ProcessingWrapper] Iniciando polling a cada 5s...');
          const interval = setInterval(() => checkProjectState(true), 5000);
          setPollingInterval(interval);
        }
      } else {
        if (pollingInterval) {
          console.log('[ProcessingWrapper] Parando polling');
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err) {
      console.error('[ProcessingWrapper] Erro:', err);
    }
  }, [user?.email, currentProject?.id, pollingInterval]);

  // Effect - Re-executar quando user, project ID ou STATUS mudar
  // ✅ CORREÇÃO: Usar propriedades primitivas extraídas em vez de optional chaining
  useEffect(() => {
    console.log('🔵 [ProcessingWrapper] useEffect DISPARADO! Motivo: mudança detectada:', {
      userEmail,
      projectId,
      projectStatus,
      updateTimestamp,
      timestamp: new Date().toISOString()
    });

    // Executar IMEDIATAMENTE sem debounce
    checkProjectState();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, projectId, projectStatus, updateTimestamp]); // ✅ Dependências primitivas - React compara por VALOR

  // Mostra loading APENAS na primeira carga (não durante atualizações)
  // Se já temos displayState, nunca mostrar null (evita flash de tela branca)
  if (!displayState) {
    return null;
  }

  // Renderizar baseado no display_component
  switch (displayState?.display_component) {
    case 'login':
      return <LoginPage />;

    case 'create_project':
      return <ProjectCreationPage />;

    case 'need_integration':
      return <Integrations />;

    case 'setup_processing':
      // Mostrar tela de processamento
      const progress = displayState?.progress_percentage || 0;
      const message = displayState?.processing_message || 'Processing...';
      const status = displayState?.project_status || 0;

      const steps = [
        { number: 1, label: 'Starting project setup' },
        { number: 2, label: 'Connecting to YouTube API' },
        { number: 3, label: 'Analyzing channel and videos' },
        { number: 4, label: 'Processing engagement metrics' },
        { number: 5, label: 'Analyzing comments with AI' },
        { number: 6, label: 'Generating insights and reports' },
        { number: 7, label: 'Finalizing initial processing' }
      ];

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 80px)',
          padding: '20px',
          width: '100%'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(30, 30, 30, 0.95) 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            margin: '0 auto'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center'
            }}>
              Setting Up Your Project
            </h2>

            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              {message}
            </p>

            <div style={{ marginBottom: '30px' }}>
              {steps.map((step, index) => (
                <ProcessStep
                  key={step.number}
                  number={step.number}
                  label={step.label}
                  active={index === status}
                  completed={index < status}
                />
              ))}
            </div>

            {/* Barra de progresso */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              height: '8px',
              overflow: 'hidden',
              marginTop: '20px'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.5s ease',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
              }} />
            </div>

            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: '10px',
              textAlign: 'center'
            }}>
              {progress}% Complete
            </p>
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      );

    case 'dashboard':
      // Mostrar o conteúdo normal (children)
      return <>{children}</>;

    case 'error':
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0a0a0b',
          color: '#ef4444'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Error checking project</h2>
            <p>{displayState?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );

    default:
      // Se não tem display_component definido, mostra o conteúdo
      return <>{children}</>;
  }
};

export default ProcessingWrapperSimplified;