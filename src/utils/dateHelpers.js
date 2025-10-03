// src/utils/dateHelpers.js

/**
 * Parse une date d'épisode de manière robuste
 * Préfère airstamp (UTC timestamp) à airDate (date locale) pour éviter les décalages
 *
 * @param {Object} episode - Objet épisode avec airTime/airstamp ou airDate
 * @returns {Date} - Date JavaScript
 */
export const parseEpisodeDate = (episode) => {
  // Priorité 1: airTime ou airstamp (timestamp UTC précis)
  if (episode.airTime || episode.airstamp) {
    return new Date(episode.airTime || episode.airstamp);
  }

  // Priorité 2: airDate (YYYY-MM-DD) - on force minuit LOCAL pas UTC
  if (episode.airDate) {
    const [year, month, day] = episode.airDate.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  // Fallback: date invalide
  return new Date(NaN);
};

/**
 * Compare deux épisodes par date de diffusion
 * @param {Object} a - Premier épisode
 * @param {Object} b - Deuxième épisode
 * @returns {number} - Résultat de comparaison pour sort()
 */
export const compareEpisodesByDate = (a, b) => {
  return parseEpisodeDate(a) - parseEpisodeDate(b);
};

/**
 * Vérifie si un épisode est diffusé aujourd'hui
 * @param {Object} episode - Épisode à vérifier
 * @returns {boolean}
 */
export const isEpisodeToday = (episode) => {
  const epDate = parseEpisodeDate(episode);
  const today = new Date();
  return epDate.toDateString() === today.toDateString();
};

/**
 * Vérifie si un épisode est diffusé demain
 * @param {Object} episode - Épisode à vérifier
 * @returns {boolean}
 */
export const isEpisodeTomorrow = (episode) => {
  const epDate = parseEpisodeDate(episode);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return epDate.toDateString() === tomorrow.toDateString();
};

/**
 * Retourne la date de diffusion formatée pour affichage
 * @param {Object} episode - Épisode
 * @returns {string} - Date formatée (YYYY-MM-DD)
 */
export const getEpisodeDateString = (episode) => {
  const date = parseEpisodeDate(episode);
  if (isNaN(date)) return '?';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Filtre les épisodes diffusés avant une date donnée
 * @param {Array} episodes - Liste d'épisodes
 * @param {Date} beforeDate - Date limite (défaut: maintenant)
 * @returns {Array} - Épisodes filtrés
 */
export const getEpisodesAiredBefore = (episodes, beforeDate = new Date()) => {
  return episodes.filter(ep => parseEpisodeDate(ep) < beforeDate);
};

/**
 * Filtre les épisodes diffusés après une date donnée
 * @param {Array} episodes - Liste d'épisodes
 * @param {Date} afterDate - Date limite (défaut: maintenant)
 * @returns {Array} - Épisodes filtrés
 */
export const getEpisodesAiredAfter = (episodes, afterDate = new Date()) => {
  return episodes.filter(ep => parseEpisodeDate(ep) > afterDate);
};

/**
 * Retourne les épisodes dans une plage de dates
 * @param {Array} episodes - Liste d'épisodes
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @returns {Array} - Épisodes filtrés
 */
export const getEpisodesInRange = (episodes, startDate, endDate) => {
  return episodes.filter(ep => {
    const epDate = parseEpisodeDate(ep);
    return epDate >= startDate && epDate < endDate;
  });
};

export default {
  parseEpisodeDate,
  compareEpisodesByDate,
  isEpisodeToday,
  isEpisodeTomorrow,
  getEpisodeDateString,
  getEpisodesAiredBefore,
  getEpisodesAiredAfter,
  getEpisodesInRange
};
