import React, { Suspense } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  className?: string;
  style?: React.CSSProperties;
}

const LazySection: React.FC<LazySectionProps> = ({ 
  children, 
  fallback,
  rootMargin = '100px',
  className,
  style
}) => {
  const { ref, isIntersecting } = useIntersectionObserver({ 
    rootMargin,
    triggerOnce: true 
  });

  return (
    <div ref={ref} className={className} style={style}>
      {isIntersecting ? (
        <Suspense fallback={fallback || <div style={{ minHeight: '200px' }} />}>
          {children}
        </Suspense>
      ) : (
        fallback || <div style={{ minHeight: '200px' }} />
      )}
    </div>
  );
};

export default LazySection;