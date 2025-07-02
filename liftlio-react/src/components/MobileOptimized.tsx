import React, { useEffect, useState } from 'react';

interface MobileOptimizedProps {
  children: React.ReactNode;
  threshold?: number;
}

const MobileOptimized: React.FC<MobileOptimizedProps> = ({ 
  children, 
  threshold = 768 
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= threshold);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [threshold]);

  return <>{children}</>;
};

export default MobileOptimized;