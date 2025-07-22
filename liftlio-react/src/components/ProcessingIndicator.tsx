import React from 'react';
import GlobalLoader from './GlobalLoader';

interface ProcessingIndicatorProps {
  message?: string;
  subMessage?: string;
  currentStep?: string;
  progress?: number;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ 
  message = "Processing",
  subMessage,
  currentStep,
  progress
}) => {
  // Build submessage from current step and progress
  let finalSubMessage = subMessage;
  if (currentStep) {
    finalSubMessage = currentStep;
  }
  if (progress !== undefined) {
    finalSubMessage = `${finalSubMessage || 'Progress'}: ${Math.round(progress)}%`;
  }
  
  return (
    <GlobalLoader 
      message={message}
      subMessage={finalSubMessage || "Please wait while we process"}
      fullScreen={true}
    />
  );
};

export default ProcessingIndicator;