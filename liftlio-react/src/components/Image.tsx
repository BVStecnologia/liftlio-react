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
  // Extract filename without extension
  const filename = src.substring(0, src.lastIndexOf('.'));
  const extension = src.substring(src.lastIndexOf('.'));
  
  // Generate WebP source if it's a JPEG or PNG
  const supportsWebP = extension === '.jpg' || extension === '.jpeg' || extension === '.png';
  const webpSrc = supportsWebP ? `${filename}.webp` : null;
  
  // Use eager loading for priority images
  const loadingStrategy = priority ? 'eager' : loading;
  
  // If WebP is supported, use picture element
  if (webpSrc) {
    return (
      <picture>
        <source 
          srcSet={webpSrc} 
          type="image/webp"
        />
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loadingStrategy}
          decoding={priority ? 'sync' : 'async'}
          className={className}
          style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
        />
      </picture>
    );
  }
  
  // Fallback to regular img
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loadingStrategy}
      decoding={priority ? 'sync' : 'async'}
      className={className}
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    />
  );
};

export default Image;