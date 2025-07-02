import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
  priority?: boolean;
}

const Image: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
  className,
  priority = false
}) => {
  // For priority images, use eager loading
  const loadingStrategy = priority ? 'eager' : loading;
  
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loadingStrategy}
      decoding={priority ? 'sync' : 'async'}
      className={className}
      // Prevent layout shift
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    />
  );
};

export default Image;