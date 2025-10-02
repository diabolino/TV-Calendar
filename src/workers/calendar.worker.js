// Web Worker pour les calculs lourds du calendrier

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'CALCULATE_STATS':
      const stats = calculateStats(data);
      self.postMessage({ type: 'STATS_RESULT', data: stats });
      break;

    case 'FILTER_AND_SORT_SHOWS':
      const filtered = filterAndSortShows(data);
      self.postMessage({ type: 'FILTERED_SHOWS', data: filtered });
      break;

    case 'GET_EPISODES_FOR_MONTH':
      const episodes = getEpisodesForMonth(data);
      self.postMessage({ type: 'MONTH_EPISODES', data: episodes });
      break;

    default:
      console.error('Unknown worker message type:', type);
  }
};

function calculateStats({ shows, calendar, watchedEpisodes }) {
  const totalEpisodes = calendar.length;
  const watchedCount = Object.values(watchedEpisodes).filter(Boolean).length;
  const watchedPercentage = totalEpisodes > 0
    ? Math.round((watchedCount / totalEpisodes) * 100)
    : 0;

  const toWatchCount = shows.reduce((count, show) => {
    const showEpisodes = calendar.filter(ep => ep.showId === show.tvmazeId);
    const showWatched = showEpisodes.filter(ep => watchedEpisodes[ep.id]).length;
    return count + (showWatched < showEpisodes.length ? 1 : 0);
  }, 0);

  const completedShows = shows.length - toWatchCount;

  // Calcul du temps total regardé (estimation: 45 min par épisode)
  const totalWatchTime = Math.round((watchedCount * 45) / 60); // en heures

  return {
    totalEpisodes,
    watchedCount,
    watchedPercentage,
    toWatchCount,
    completedShows,
    totalWatchTime,
  };
}

function filterAndSortShows({ shows, calendar, watchedEpisodes, filters }) {
  const { searchQuery, sortBy, filterQuality, filterStatus } = filters;

  // Fonction helper pour calculer les stats d'une série
  const getShowStats = (show) => {
    const episodes = calendar.filter(ep => ep.showId === show.tvmazeId);
    const watchedCount = episodes.filter(ep => watchedEpisodes[ep.id]).length;
    const totalEpisodes = episodes.length;
    const progress = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    const now = new Date();
    const nextEpisode = episodes
      .filter(ep => !watchedEpisodes[ep.id] && new Date(ep.airDate) <= now)
      .sort((a, b) => new Date(a.airDate) - new Date(b.airDate))[0];

    return { progress, nextEpisode, watchedCount, totalEpisodes };
  };

  // Filtrage
  let filtered = shows.filter(show => {
    if (searchQuery && !show.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterQuality !== 'all' && show.quality !== filterQuality) {
      return false;
    }
    if (filterStatus !== 'all') {
      const stats = getShowStats(show);
      if (filterStatus === 'completed' && stats.progress !== 100) return false;
      if (filterStatus === 'watching' && (stats.progress === 0 || stats.progress === 100)) return false;
      if (filterStatus === 'upcoming' && stats.progress !== 0) return false;
    }
    return true;
  });

  // Tri
  filtered.sort((a, b) => {
    if (sortBy === 'added') {
      return new Date(b.addedAt) - new Date(a.addedAt);
    }
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'progress') {
      const statsA = getShowStats(a);
      const statsB = getShowStats(b);
      return statsB.progress - statsA.progress;
    }
    if (sortBy === 'next') {
      const statsA = getShowStats(a);
      const statsB = getShowStats(b);
      if (!statsA.nextEpisode && !statsB.nextEpisode) return 0;
      if (!statsA.nextEpisode) return 1;
      if (!statsB.nextEpisode) return -1;
      return new Date(statsA.nextEpisode.airDate) - new Date(statsB.nextEpisode.airDate);
    }
    return 0;
  });

  return filtered;
}

function getEpisodesForMonth({ calendar, year, month }) {
  return calendar.filter(episode => {
    const date = new Date(episode.airDate);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}
