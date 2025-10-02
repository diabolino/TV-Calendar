import { useState, useEffect } from 'react';
import { getCachedImage } from '../services/imageCache';

/**
 * Hook pour charger les images avec cache offline
 * @param {string} url - URL de l'image à charger
 * @param {string} fallback - URL de fallback si l'image ne charge pas
 * @returns {string} URL de l'image (depuis le cache ou originale)
 */
export const useImageCache = (url, fallback = null) => {
  const [cachedUrl, setCachedUrl] = useState(url);

  useEffect(() => {
    if (!url) {
      setCachedUrl(fallback);
      return;
    }

    // Charger l'image depuis le cache
    getCachedImage(url).then((cached) => {
      setCachedUrl(cached || fallback || url);
    }).catch(() => {
      setCachedUrl(fallback || url);
    });

    // Cleanup: révoquer l'URL blob si nécessaire
    return () => {
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
  }, [url, fallback]);

  return cachedUrl;
};

export default useImageCache;
