import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
}

const ImageWrapper = styled.div<{ isLoaded: boolean }>`
  position: relative;
  overflow: hidden;
  background-color: ${props => props.theme.colors.borderLight};
  transition: opacity 0.3s ease-in-out;
  opacity: ${props => props.isLoaded ? 1 : 0.5};
`;

const StyledImage = styled.img`
  display: block;
  width: 100%;
  height: auto;
`;

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
  className
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  useEffect(() => {
    // For images in public folder, use them directly
    if (src.startsWith('/') || src.startsWith('http')) {
      setCurrentSrc(src);
    } else {
      // For local images, try to use WebP format if available
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      
      // Check if WebP version exists
      const img = new Image();
      img.onload = () => setCurrentSrc(webpSrc);
      img.onerror = () => setCurrentSrc(src);
      img.src = webpSrc;
    }
  }, [src]);

  return (
    <ImageWrapper isLoaded={isLoaded} className={className}>
      <StyledImage
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        decoding="async"
      />
    </ImageWrapper>
  );
};

export default OptimizedImage;