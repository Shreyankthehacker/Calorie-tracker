import { useState } from 'react';

export function LandingPhoto({
  src,
  srcSet,
  fallback,
  alt,
  className,
  width,
  height,
  priority = false,
  sizes,
}: {
  src: string;
  srcSet?: string;
  fallback: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
}) {
  const [current, setCurrent] = useState(src);
  const failedToFallback = current === fallback && src !== fallback;

  return (
    <img
      className={className}
      src={current}
      {...(current === src && srcSet ? { srcSet } : {})}
      {...(sizes ? { sizes } : {})}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'low'}
      onError={() => {
        if (!failedToFallback) {
          setCurrent(fallback);
        }
      }}
    />
  );
}
