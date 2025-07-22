import React from 'react';
import GlobalLoader from './GlobalLoader';

interface PageLoaderProps {
  message?: string;
  subMessage?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = "Loading page",
  subMessage = "Preparing content"
}) => {
  return <GlobalLoader message={message} subMessage={subMessage} fullScreen={true} />;
};

export default PageLoader;