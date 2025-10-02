import React from 'react';
import { useImageCache } from '../hooks/useImageCache';

/**
 * Composant d'image avec cache offline
 */
const CachedImage = ({ src, alt, className, fallback = null, ...props }) => {
  const cachedSrc = useImageCache(src, fallback);

  return (
    <img
      src={cachedSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default CachedImage;
