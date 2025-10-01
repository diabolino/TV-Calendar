// src/services/tvmaze.js
import axios from 'axios';

const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

const tvmazeApi = axios.create({
  baseURL: TVMAZE_BASE_URL
});

// Rechercher des séries
export const searchShows = async (query) => {
  try {
    console.log('🔍 Recherche TVMaze:', query);
    const response = await tvmazeApi.get('/search/shows', {
      params: { q: query }
    });
    console.log('✅ Résultats TVMaze:', response.data.length, 'séries trouvées');
    
    return response.data.map(item => ({
      id: item.show.id,
      tvmazeId: item.show.id,
      title: item.show.name,
      year: item.show.premiered ? new Date(item.show.premiered).getFullYear() : null,
      rating: item.show.rating?.average || 0,
      overview: item.show.summary ? item.show.summary.replace(/<[^>]*>/g, '') : '',
      poster: item.show.image?.original || item.show.image?.medium || null,
      genres: item.show.genres || [],
      status: item.show.status,
      network: item.show.network?.name || item.show.webChannel?.name || 'N/A'
    }));
  } catch (error) {
    console.error('❌ Erreur recherche TVMaze:', error.message);
    return [];
  }
};

// Obtenir tous les épisodes d'une série
export const getShowEpisodes = async (showId) => {
  try {
    console.log('📺 Récupération épisodes pour série:', showId);
    const response = await tvmazeApi.get(`/shows/${showId}/episodes`);
    console.log('✅ Épisodes récupérés:', response.data.length);
    
    return response.data.map(episode => ({
      id: episode.id,
      showId: showId,
      season: episode.season,
      episode: episode.number,
      title: episode.name,
      airDate: episode.airdate,
      airTime: episode.airstamp,
      overview: episode.summary ? episode.summary.replace(/<[^>]*>/g, '') : '',
      image: episode.image?.original || episode.image?.medium || null,
      runtime: episode.runtime
    }));
  } catch (error) {
    console.error('❌ Erreur récupération épisodes:', error.message);
    return [];
  }
};

// Obtenir le calendrier complet pour une période
export const getSchedule = async (countryCode = 'US', date = null) => {
  try {
    const params = { country: countryCode };
    if (date) {
      params.date = date; // Format: YYYY-MM-DD
    }
    
    console.log('📅 Récupération calendrier:', params);
    const response = await tvmazeApi.get('/schedule', { params });
    console.log('✅ Épisodes du calendrier:', response.data.length);
    
    return response.data.map(item => ({
      id: item.id,
      showId: item.show.id,
      showTitle: item.show.name,
      season: item.season,
      episode: item.number,
      title: item.name,
      airDate: item.airdate,
      airTime: item.airstamp,
      overview: item.summary ? item.summary.replace(/<[^>]*>/g, '') : '',
      image: item.image?.original || item.image?.medium || item.show.image?.original || item.show.image?.medium || null,
      runtime: item.runtime,
      showImage: item.show.image?.original || item.show.image?.medium || null,
      network: item.show.network?.name || item.show.webChannel?.name || 'N/A'
    }));
  } catch (error) {
    console.error('❌ Erreur calendrier TVMaze:', error.message);
    return [];
  }
};

// Obtenir le calendrier complet (tous les pays) - plus d'épisodes
export const getFullSchedule = async (date = null) => {
  try {
    const url = date ? `/schedule/full?date=${date}` : '/schedule/full';
    
    console.log('📅 Récupération calendrier complet:', date || 'aujourd\'hui');
    const response = await tvmazeApi.get(url);
    console.log('✅ Épisodes du calendrier complet:', response.data.length);
    
    return response.data.map(item => ({
      id: item.id,
      showId: item._embedded?.show?.id || item.show?.id,
      showTitle: item._embedded?.show?.name || item.show?.name,
      season: item.season,
      episode: item.number,
      title: item.name,
      airDate: item.airdate,
      airTime: item.airstamp,
      overview: item.summary ? item.summary.replace(/<[^>]*>/g, '') : '',
      image: item.image?.original || item.image?.medium || item._embedded?.show?.image?.original || item._embedded?.show?.image?.medium,
      runtime: item.runtime,
      showImage: item._embedded?.show?.image?.original || item._embedded?.show?.image?.medium,
      network: item._embedded?.show?.network?.name || item._embedded?.show?.webChannel?.name || 'N/A'
    }));
  } catch (error) {
    console.error('❌ Erreur calendrier complet TVMaze:', error.message);
    return [];
  }
};

// Obtenir les détails d'une série
export const getShowDetails = async (showId) => {
  try {
    const response = await tvmazeApi.get(`/shows/${showId}`);
    const show = response.data;
    
    return {
      id: show.id,
      tvmazeId: show.id,
      title: show.name,
      year: show.premiered ? new Date(show.premiered).getFullYear() : null,
      rating: show.rating?.average || 0,
      overview: show.summary ? show.summary.replace(/<[^>]*>/g, '') : '',
      poster: show.image?.original || show.image?.medium || null,
      genres: show.genres || [],
      status: show.status,
      network: show.network?.name || show.webChannel?.name || 'N/A',
      language: show.language,
      premiered: show.premiered,
      officialSite: show.officialSite
    };
  } catch (error) {
    console.error('❌ Erreur détails série:', error.message);
    return null;
  }
};

export default {
  searchShows,
  getShowEpisodes,
  getSchedule,
  getFullSchedule,
  getShowDetails
};
