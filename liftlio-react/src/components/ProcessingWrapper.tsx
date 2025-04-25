import React, { useEffect, useState } from 'react';
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
  const [showProcessing, setShowProcessing] = useState(false);
  
  // Track processing state changes to avoid unnecessary re-renders
  useEffect(() => {
    if (isInitialProcessing && currentProject) {
      setShowProcessing(true);
    } else {
      // Only change state if we were previously showing processing
      if (showProcessing) {
        setShowProcessing(false);
      }
    }
  }, [isInitialProcessing, currentProject, showProcessing]);
  
  // If in initial processing state, show the processing indicator
  if (showProcessing && currentProject) {
    return <ProcessingIndicator projectId={currentProject.id} />;
  }
  
  // Otherwise render children normally
  return <>{children}</>;
};

export default ProcessingWrapper;