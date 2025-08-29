import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface LoadingContextType {
  isGlobalLoading: boolean;
  loadingMessage: string;
  loadingSubMessage: string;
  showGlobalLoader: (message?: string, subMessage?: string) => void;
  hideGlobalLoader: () => void;
  forceHideGlobalLoader: () => void; // Força esconder independente do contador
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading');
  const [loadingSubMessage, setLoadingSubMessage] = useState('Please wait');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingCountRef = useRef(0); // Contador de referências para evitar hide prematuro

  const showGlobalLoader = useCallback((message = 'Loading', subMessage = 'Please wait') => {
    // DEBUG: Log para rastrear quem está chamando showGlobalLoader
    console.log('[GlobalLoader] showGlobalLoader chamado:', {
      message,
      subMessage,
      count: loadingCountRef.current + 1,
      timestamp: new Date().toISOString()
    });
    
    // Incrementar contador de referências
    loadingCountRef.current++;
    
    // Limpar timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoadingMessage(message);
    setLoadingSubMessage(subMessage);
    setIsGlobalLoading(true);
    
    // Timeout de segurança de 10 segundos - força esconder após esse tempo
    timeoutRef.current = setTimeout(() => {
      console.warn('[GlobalLoader] Timeout de segurança ativado - forçando hide após 10 segundos');
      loadingCountRef.current = 0; // Reset contador
      setIsGlobalLoading(false);
    }, 10000);
  }, []);

  const hideGlobalLoader = useCallback(() => {
    // Decrementar contador
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    
    console.log('[GlobalLoader] hideGlobalLoader chamado:', {
      count: loadingCountRef.current,
      timestamp: new Date().toISOString()
    });
    
    // Só esconder se não houver mais referências
    if (loadingCountRef.current === 0) {
      setIsGlobalLoading(false);
      
      // Limpar timeout se escondermos manualmente
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, []);

  const forceHideGlobalLoader = useCallback(() => {
    console.warn('[GlobalLoader] FORÇA HIDE - Reset completo do GlobalLoader');
    
    // Reset completo
    loadingCountRef.current = 0;
    setIsGlobalLoading(false);
    
    // Limpar timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      loadingMessage,
      loadingSubMessage,
      showGlobalLoader,
      hideGlobalLoader,
      forceHideGlobalLoader
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
};