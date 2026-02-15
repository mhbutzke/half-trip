'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad'> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  skeletonClassName?: string;
}

/**
 * OptimizedImage Component
 * 
 * Wrapper around Next.js Image with:
 * - Loading skeleton
 * - Fallback image on error
 * - Blur placeholder
 * - Optimized loading
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.png',
  showSkeleton = true,
  skeletonClassName,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <div className="relative">
      {showSkeleton && isLoading && (
        <Skeleton
          className={cn(
            'absolute inset-0 z-10',
            skeletonClassName
          )}
        />
      )}
      <Image
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}
