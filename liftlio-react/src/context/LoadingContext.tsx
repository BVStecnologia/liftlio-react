import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
  isGlobalLoading: boolean;
  loadingMessage: string;
  loadingSubMessage: string;
  showGlobalLoader: (message?: string, subMessage?: string) => void;
  hideGlobalLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading');
  const [loadingSubMessage, setLoadingSubMessage] = useState('Please wait');

  const showGlobalLoader = useCallback((message = 'Loading', subMessage = 'Please wait') => {
    setLoadingMessage(message);
    setLoadingSubMessage(subMessage);
    setIsGlobalLoading(true);
  }, []);

  const hideGlobalLoader = useCallback(() => {
    setIsGlobalLoading(false);
  }, []);

  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      loadingMessage,
      loadingSubMessage,
      showGlobalLoader,
      hideGlobalLoader
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