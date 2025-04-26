import React, { useEffect, useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import ProcessingIndicator from './ProcessingIndicator';
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
  const [showProcessing, setShowProcessing] = useState(false);
  const [verifiedReady, setVerifiedReady] = useState(false);
  const [hasMensagens, setHasMensagens] = useState(false);
  
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
    // Primeiramente verificar se o projeto já está marcado como verificado
    if (currentProject?.id) {
      const isVerified = sessionStorage.getItem(`projeto_${currentProject.id}_verified`) === 'true';
      
      if (isVerified) {
        console.log(`Projeto ${currentProject.id} já marcado como verificado na sessionStorage`);
        setVerifiedReady(true);
        setShowProcessing(false);
        setHasMensagens(true);
        return; // Não precisamos verificar novamente
      }
      
      console.log(`Novo projeto selecionado (${currentProject.id}), reiniciando verificação...`);
      setVerifiedReady(false);
      setShowProcessing(true); // Mostrar processamento por padrão até verificar completamente
      
      // Função de verificação completa
      const verifyProjectState = async () => {
        if (!currentProject) return;
        
        const projectId = currentProject.id;
        const status = await checkProjectStatus(projectId);
        const hasMessages = await checkForMessages(projectId);
        
        // Regras de decisão:
        // 1. Se status < 6: mostrar processamento
        // 2. Se status >= 6 E tem mensagens: mostrar dashboard
        // 3. Se status >= 6 E NÃO tem mensagens: mostrar processamento
        
        // Regra adicional: Se 'isInitialProcessing' do contexto ainda for true,
        // SEMPRE mostrar processamento independente de outros fatores
        
        if (status >= 6 && hasMessages && !isInitialProcessing) {
          console.log(`Projeto ${projectId} está pronto para exibição (status=${status}, hasMensagens=${hasMessages}, isInitialProcessing=${isInitialProcessing})`);
          
          // Armazenar informação na sessionStorage para persistir após recargas
          sessionStorage.setItem(`projeto_${projectId}_verified`, 'true');
          
          setShowProcessing(false);
          setVerifiedReady(true);
        } else {
          console.log(`Projeto ${projectId} ainda em processamento ou sem dados (status=${status}, hasMensagens=${hasMessages}, isInitialProcessing=${isInitialProcessing})`);
          
          // Se no passo final com mensagens mas 'isInitialProcessing' ainda true
          if (status >= 6 && hasMessages && isInitialProcessing) {
            console.log("Condições verificadas, mas isInitialProcessing ainda é true. Aguardando sincronização do contexto...");
          }
          
          setShowProcessing(true);
          
          // Continuar verificando enquanto não estiver pronto, com intervalo mais curto
          const checkAgainTimeout = setTimeout(verifyProjectState, 3000);
          return () => clearTimeout(checkAgainTimeout);
        }
      };
      
      // Iniciar verificação
      verifyProjectState();
    }
  }, [currentProject, checkForMessages, checkProjectStatus]);
  
  // Verificar também sessionStorage para persistência após recargas
  const checkSessionStorageVerification = () => {
    if (currentProject?.id) {
      return sessionStorage.getItem(`projeto_${currentProject.id}_verified`) === 'true';
    }
    return false;
  };
  
  // Regras de renderização:
  // 1. Se foi verificado e está pronto (local ou sessionStorage): mostrar dashboard (children)
  // 2. Se 'isInitialProcessing' ainda é true: SEMPRE mostrar processamento 
  // 3. Em todos os outros casos: mostrar processamento até verificação completa
  
  // Verificar se o projeto está marcado como processando no contexto global
  if (isInitialProcessing && currentProject) {
    console.log(`Forçando exibição do processamento para projeto ${currentProject.id} (isInitialProcessing=true)`);
    return <ProcessingIndicator projectId={currentProject.id} />;
  }
  
  // Projeto verificado e pronto para dashboard (internamente ou via sessionStorage)
  if ((verifiedReady && hasMensagens && currentProject) || checkSessionStorageVerification()) {
    console.log(`Renderizando dashboard para projeto ${currentProject.id} (verificado)`);
    return <>{children}</>;
  }
  
  // Em todos os outros casos (incluindo verificação inicial), mostrar processamento
  if (currentProject) {
    console.log(`Renderizando indicador de processamento para projeto ${currentProject.id}`);
    return <ProcessingIndicator projectId={currentProject.id} />;
  }
  
  // Fallback (não deveria ocorrer se a navegação estiver protegida)
  return <>{children}</>;
};

export default ProcessingWrapper;