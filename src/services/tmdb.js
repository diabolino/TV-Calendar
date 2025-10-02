// Service TMDB pour récupérer les synopsis en français
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'fr-FR' // Langue française par défaut
  }
});

/**
 * Rechercher une série sur TMDB par nom
 */
export const searchShowTMDB = async (showName) => {
  try {
    const response = await tmdbApi.get('/search/tv', {
      params: {
        query: showName
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0]; // Retourner le premier résultat
    }

    return null;
  } catch (error) {
    console.error('❌ Erreur recherche TMDB:', error.message);
    return null;
  }
};

/**
 * Obtenir les détails d'une série TMDB avec synopsis français
 */
export const getShowDetailsTMDB = async (tmdbId) => {
  try {
    const response = await tmdbApi.get(`/tv/${tmdbId}`);
    return {
      id: response.data.id,
      overview: response.data.overview || '',
      backdrop_path: response.data.backdrop_path
        ? `https://image.tmdb.org/t/p/original${response.data.backdrop_path}`
        : null,
      poster_path: response.data.poster_path
        ? `https://image.tmdb.org/t/p/original${response.data.poster_path}`
        : null
    };
  } catch (error) {
    console.error('❌ Erreur détails série TMDB:', error.message);
    return null;
  }
};

/**
 * Obtenir les détails d'un épisode TMDB avec synopsis français
 */
export const getEpisodeDetailsTMDB = async (tmdbShowId, seasonNumber, episodeNumber) => {
  try {
    const response = await tmdbApi.get(`/tv/${tmdbShowId}/season/${seasonNumber}/episode/${episodeNumber}`);
    return {
      overview: response.data.overview || '',
      still_path: response.data.still_path
        ? `https://image.tmdb.org/t/p/original${response.data.still_path}`
        : null
    };
  } catch (error) {
    console.error(`❌ Erreur épisode TMDB S${seasonNumber}E${episodeNumber}:`, error.message);
    return null;
  }
};

/**
 * Rechercher une série par IMDB ID (plus précis)
 */
export const findShowByIMDB = async (imdbId) => {
  try {
    const response = await tmdbApi.get('/find/' + imdbId, {
      params: {
        external_source: 'imdb_id'
      }
    });

    if (response.data.tv_results && response.data.tv_results.length > 0) {
      return response.data.tv_results[0];
    }

    return null;
  } catch (error) {
    console.error('❌ Erreur recherche IMDB TMDB:', error.message);
    return null;
  }
};

/**
 * Obtenir le synopsis français d'une série (recherche automatique)
 */
export const getShowOverviewFR = async (showName, imdbId = null) => {
  try {
    console.log('🔍 Recherche TMDB pour:', showName, 'IMDB:', imdbId);
    let tmdbShow = null;

    // Priorité 1 : Chercher par IMDB ID si disponible (plus précis)
    if (imdbId) {
      console.log('🎯 Recherche par IMDB ID:', imdbId);
      tmdbShow = await findShowByIMDB(imdbId);
      if (tmdbShow) {
        console.log('✅ Trouvé via IMDB:', tmdbShow.name);
      }
    }

    // Priorité 2 : Chercher par nom si pas d'IMDB ID ou échec
    if (!tmdbShow) {
      console.log('🔎 Recherche par nom:', showName);
      tmdbShow = await searchShowTMDB(showName);
      if (tmdbShow) {
        console.log('✅ Trouvé via nom:', tmdbShow.name);
      }
    }

    if (tmdbShow && tmdbShow.overview) {
      console.log('📝 Synopsis FR:', tmdbShow.overview.substring(0, 100) + '...');
      return {
        overview: tmdbShow.overview,
        tmdbId: tmdbShow.id,
        backdrop: tmdbShow.backdrop_path
          ? `https://image.tmdb.org/t/p/original${tmdbShow.backdrop_path}`
          : null,
        poster: tmdbShow.poster_path
          ? `https://image.tmdb.org/t/p/original${tmdbShow.poster_path}`
          : null
      };
    }

    console.log('⚠️ Aucun synopsis FR trouvé');
    return null;
  } catch (error) {
    console.error('❌ Erreur récupération synopsis FR:', error.message);
    return null;
  }
};

/**
 * Obtenir le synopsis français d'un épisode
 */
export const getEpisodeOverviewFR = async (tmdbShowId, season, episode) => {
  try {
    const episodeDetails = await getEpisodeDetailsTMDB(tmdbShowId, season, episode);
    return episodeDetails?.overview || null;
  } catch (error) {
    console.error('❌ Erreur récupération synopsis épisode FR:', error.message);
    return null;
  }
};

/**
 * Obtenir le casting d'une série (acteurs principaux)
 */
export const getShowCast = async (tmdbShowId) => {
  try {
    const response = await tmdbApi.get(`/tv/${tmdbShowId}/credits`);

    // Retourner les 5 premiers acteurs principaux
    const cast = response.data.cast.slice(0, 5).map(actor => ({
      id: actor.id,
      name: actor.name,
      character: actor.character,
      profilePath: actor.profile_path
        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
        : null,
      order: actor.order
    }));

    return cast;
  } catch (error) {
    console.error('❌ Erreur récupération cast:', error.message);
    return [];
  }
};

export default {
  searchShowTMDB,
  getShowDetailsTMDB,
  getEpisodeDetailsTMDB,
  findShowByIMDB,
  getShowOverviewFR,
  getEpisodeOverviewFR,
  getShowCast
};
