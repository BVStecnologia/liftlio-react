import React from 'react';
import GlobalLoader from './GlobalLoader';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading", 
  subMessage = "Please wait..." 
}) => {
  return <GlobalLoader message={message} subMessage={subMessage} fullScreen={true} />;
};

export default LoadingScreen;