import React from 'react';
import GlobalLoader from './GlobalLoader';

interface LoadingDataIndicatorProps {
  message?: string;
  subMessage?: string;
}

const LoadingDataIndicator: React.FC<LoadingDataIndicatorProps> = ({ 
  message = "Loading data",
  subMessage = "Preparing visualizations"
}) => {
  return <GlobalLoader message={message} subMessage={subMessage} fullScreen={false} />;
};

export default LoadingDataIndicator;