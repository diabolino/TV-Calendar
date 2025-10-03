// Service de cache des épisodes avec IndexedDB et TTL
// Remplace le cache localStorage pour une meilleure performance et capacité

const DB_NAME = 'TVCalendarDB';
const DB_VERSION = 1;
const STORE_NAME = 'episodeCache';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

let db = null;

/**
 * Initialise la base de données IndexedDB
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Erreur ouverture IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ IndexedDB initialisée');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Créer le store si nécessaire
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'showId' });

        // Index pour recherche rapide par date d'expiration
        store.createIndex('expiresAt', 'expiresAt', { unique: false });

        console.log('✅ Store "episodeCache" créé');
      }
    };
  });
};

/**
 * Sauvegarde les épisodes d'une série dans le cache avec TTL
 * @param {number} showId - ID TVMaze de la série
 * @param {Array} episodes - Liste des épisodes
 * @param {number} ttl - Durée de vie en ms (défaut: 7 jours)
 */
export const cacheEpisodes = async (showId, episodes, ttl = DEFAULT_TTL) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cacheEntry = {
      showId,
      episodes,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl
    };

    await store.put(cacheEntry);

    console.log(`✅ Épisodes série ${showId} mis en cache (expire dans ${Math.round(ttl / (24*60*60*1000))}j)`);
  } catch (error) {
    console.error('❌ Erreur cache épisodes:', error);
  }
};

/**
 * Récupère les épisodes d'une série depuis le cache
 * @param {number} showId - ID TVMaze de la série
 * @returns {Array|null} - Episodes ou null si expiré/absent
 */
export const getCachedEpisodes = async (showId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(showId);

      request.onsuccess = () => {
        const entry = request.result;

        if (!entry) {
          resolve(null);
          return;
        }

        // Vérifier si le cache est expiré
        if (Date.now() > entry.expiresAt) {
          console.log(`⏰ Cache série ${showId} expiré`);
          // Supprimer l'entrée expirée
          deleteFromCache(showId);
          resolve(null);
          return;
        }

        console.log(`✅ Cache HIT pour série ${showId}`);
        resolve(entry.episodes);
      };

      request.onerror = () => {
        console.error('❌ Erreur lecture cache:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('❌ Erreur récupération cache:', error);
    return null;
  }
};

/**
 * Supprime une série du cache
 * @param {number} showId - ID TVMaze de la série
 */
export const deleteFromCache = async (showId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await store.delete(showId);
    console.log(`🗑️ Cache série ${showId} supprimé`);
  } catch (error) {
    console.error('❌ Erreur suppression cache:', error);
  }
};

/**
 * Nettoie toutes les entrées expirées du cache
 * @returns {number} - Nombre d'entrées supprimées
 */
export const cleanExpiredCache = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('expiresAt');

    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          if (cursor.value.expiresAt < now) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`🧹 ${deletedCount} entrée(s) expirée(s) nettoyée(s)`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('❌ Erreur nettoyage cache:', request.error);
        resolve(0);
      };
    });
  } catch (error) {
    console.error('❌ Erreur nettoyage cache:', error);
    return 0;
  }
};

/**
 * Vide complètement le cache
 */
export const clearAllCache = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await store.clear();
    console.log('🗑️ Cache complet vidé');
  } catch (error) {
    console.error('❌ Erreur vidage cache:', error);
  }
};

/**
 * Obtient des statistiques sur le cache
 */
export const getCacheStats = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const now = Date.now();

        const stats = {
          total: entries.length,
          valid: entries.filter(e => e.expiresAt > now).length,
          expired: entries.filter(e => e.expiresAt <= now).length,
          totalEpisodes: entries.reduce((sum, e) => sum + e.episodes.length, 0),
          oldestCache: entries.length > 0 ? Math.min(...entries.map(e => e.cachedAt)) : null,
          newestCache: entries.length > 0 ? Math.max(...entries.map(e => e.cachedAt)) : null
        };

        resolve(stats);
      };

      request.onerror = () => {
        console.error('❌ Erreur stats cache:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('❌ Erreur stats cache:', error);
    return null;
  }
};

export default {
  initDB,
  cacheEpisodes,
  getCachedEpisodes,
  deleteFromCache,
  cleanExpiredCache,
  clearAllCache,
  getCacheStats
};
