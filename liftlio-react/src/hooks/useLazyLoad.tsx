import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

export const useLazyLoad = (options: UseLazyLoadOptions = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Once loaded, disconnect observer to prevent re-renders
          observer.disconnect();
        }
      },
      {
        rootMargin: options.rootMargin || '100px',
        threshold: options.threshold || 0.1,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options.rootMargin, options.threshold]);

  return { ref, isIntersecting };
};