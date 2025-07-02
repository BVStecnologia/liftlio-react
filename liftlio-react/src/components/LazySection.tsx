import React, { Suspense } from 'react';
import styled from 'styled-components';
import { useLazyLoad } from '../hooks/useLazyLoad';
import LoadingSpinner from './LoadingSpinner';

const SectionWrapper = styled.div`
  min-height: 200px;
  width: 100%;
`;

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}

const LazySection: React.FC<LazySectionProps> = ({ 
  children, 
  fallback = <LoadingSpinner />,
  rootMargin = '200px'
}) => {
  const { ref, isIntersecting } = useLazyLoad({ rootMargin });

  return (
    <SectionWrapper ref={ref}>
      {isIntersecting ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </SectionWrapper>
  );
};

export default LazySection;