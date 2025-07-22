import React from 'react';
import GlobalLoader from '../GlobalLoader';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  thickness?: number;
  speed?: number;
  fullPage?: boolean;
  text?: string;
  withOverlay?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  thickness = 2,
  speed = 0.8,
  fullPage = false,
  text,
  withOverlay = false
}) => {
  // Map text to message/subMessage
  const message = text || "Processing";
  const subMessage = size === 'sm' ? "" : "Please wait";
  
  return (
    <GlobalLoader 
      message={message}
      subMessage={subMessage}
      fullScreen={fullPage || withOverlay}
    />
  );
};

export default Spinner;