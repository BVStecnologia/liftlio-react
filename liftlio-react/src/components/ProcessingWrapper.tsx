import React, { useEffect, useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { useGlobalLoading } from '../context/LoadingContext';
import { supabase } from '../lib/supabaseClient';

interface ProcessingWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that conditionally shows a processing indicator
 * when a project is in initial processing state with no messages yet.
 */
const ProcessingWrapper: React.FC<ProcessingWrapperProps> = ({ children }) => {
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
    if (currentProject?.id) {
      console.log(`Novo projeto selecionado (${currentProject.id}), iniciando verificação...`);
      setIsCheckingInitial(true); // Começar em estado de verificação
      setVerifiedReady(false);
      setShowProcessing(false); // NÃO mostrar processamento até confirmar que precisa
      
      // Show global loader while checking initial state
      showGlobalLoader('Loading', 'Checking project status');
      
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
        
        if (!shouldShowProcessing) {
          console.log(`Projeto ${projectId} está pronto para exibição (status=${status}, hasMensagens=${hasMessages})`);
          setShowProcessing(false);
          setVerifiedReady(true);
          hideGlobalLoader(); // Hide global loader when ready
        } else {
          console.log(`Projeto ${projectId} ainda em processamento ou sem dados (status=${status}, hasMensagens=${hasMessages})`);
          setShowProcessing(true);
          showGlobalLoader('Processing project', 'Setting up your workspace');
          
          // Continuar verificando enquanto não estiver pronto, com intervalo mais curto
          const checkAgainTimeout = setTimeout(verifyProjectState, 3000);
          return () => clearTimeout(checkAgainTimeout);
        }
      };
      
      // Iniciar verificação
      verifyProjectState();
    }
    
    // Cleanup function to hide loader when unmounting
    return () => {
      hideGlobalLoader();
    };
  }, [currentProject, checkForMessages, checkProjectStatus, showGlobalLoader, hideGlobalLoader]);
  
  // Since we're using global loader, always return children
  // The global loader will be shown/hidden based on the state
  return <>{children}</>;
};

export default ProcessingWrapper;