import React from 'react';
import GlobalLoader from './GlobalLoader';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading",
  subMessage = "Just a moment"
}) => {
  return <GlobalLoader message={message} subMessage={subMessage} fullScreen={false} />;
};

export default LoadingSpinner;