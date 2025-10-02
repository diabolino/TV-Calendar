import React, { useRef, useEffect, useState } from 'react';

const LazyImage = ({ src, alt, className, fallback = null }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Charger 50px avant que l'image soit visible
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <img
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            if (fallback) {
              e.target.src = fallback;
            }
          }}
        />
      ) : (
        <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`} />
      )}
    </div>
  );
};

export default LazyImage;
