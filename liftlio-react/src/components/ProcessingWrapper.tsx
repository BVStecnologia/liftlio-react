import React from 'react';
import { useProject } from '../context/ProjectContext';
import ProcessingIndicator from './ProcessingIndicator';

interface ProcessingWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that conditionally shows a processing indicator
 * when a project is in initial processing state with no messages yet.
 */
const ProcessingWrapper: React.FC<ProcessingWrapperProps> = ({ children }) => {
  const { currentProject, isInitialProcessing } = useProject();
  
  // Se estiver em processamento inicial, mostrar o indicador de processamento
  if (isInitialProcessing && currentProject) {
    return <ProcessingIndicator projectId={currentProject.id} />;
  }
  
  // Caso contrário, renderizar o children normalmente
  return <>{children}</>;
};

export default ProcessingWrapper;