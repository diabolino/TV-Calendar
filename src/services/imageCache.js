// Service de cache d'images pour le mode offline
const DB_NAME = 'tv_calendar_images';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours

// Initialiser IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Convertir une image URL en blob
const fetchImageAsBlob = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image fetch failed');
    return await response.blob();
  } catch (error) {
    console.error('❌ Erreur fetch image:', url, error);
    return null;
  }
};

// Sauvegarder une image dans le cache
export const cacheImage = async (url) => {
  if (!url || url.startsWith('data:') || url.includes('placeholder')) {
    return url; // Ignorer les data URIs et placeholders
  }

  try {
    const db = await openDB();

    // Vérifier si l'image est déjà en cache
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const existing = await new Promise((resolve) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    // Si déjà en cache et récent, retourner le blob URL
    if (existing && (Date.now() - existing.timestamp) < CACHE_MAX_AGE) {
      return URL.createObjectURL(existing.blob);
    }

    // Sinon, télécharger et mettre en cache
    const blob = await fetchImageAsBlob(url);
    if (!blob) return url; // Retourner l'URL originale en cas d'erreur

    const writeTransaction = db.transaction([STORE_NAME], 'readwrite');
    const writeStore = writeTransaction.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = writeStore.put({
        url,
        blob,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('❌ Erreur cache image:', error);
    return url; // Retourner l'URL originale en cas d'erreur
  }
};

// Récupérer une image depuis le cache
export const getCachedImage = async (url) => {
  if (!url || url.startsWith('data:') || url.includes('placeholder')) {
    return url;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const cached = await new Promise((resolve) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    if (cached && cached.blob) {
      // Vérifier si le cache n'est pas expiré
      if ((Date.now() - cached.timestamp) < CACHE_MAX_AGE) {
        return URL.createObjectURL(cached.blob);
      }
    }

    // Si pas en cache ou expiré, essayer de le mettre en cache
    return await cacheImage(url);
  } catch (error) {
    console.error('❌ Erreur récupération cache:', error);
    return url;
  }
};

// Nettoyer les images expirées
export const cleanExpiredImages = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const allImages = await new Promise((resolve) => {
      const request = index.openCursor();
      const results = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });

    const now = Date.now();
    let deletedCount = 0;

    for (const image of allImages) {
      if ((now - image.timestamp) > CACHE_MAX_AGE) {
        await new Promise((resolve) => {
          const request = store.delete(image.url);
          request.onsuccess = () => {
            deletedCount++;
            resolve();
          };
          request.onerror = () => resolve();
        });
      }
    }

    console.log(`🧹 ${deletedCount} images expirées supprimées du cache`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Erreur nettoyage cache:', error);
    return 0;
  }
};

// Obtenir la taille du cache
export const getCacheSize = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const count = await new Promise((resolve) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });

    return count;
  } catch (error) {
    console.error('❌ Erreur taille cache:', error);
    return 0;
  }
};

// Vider tout le cache
export const clearImageCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('🧹 Cache d\'images vidé');
    return true;
  } catch (error) {
    console.error('❌ Erreur vidage cache:', error);
    return false;
  }
};

export default {
  cacheImage,
  getCachedImage,
  cleanExpiredImages,
  getCacheSize,
  clearImageCache
};
