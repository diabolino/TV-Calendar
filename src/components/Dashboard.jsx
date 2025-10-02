import React, { useMemo } from 'react';
import { TrendingUp, Clock, CheckCircle, Calendar, Play, Bell, Eye, Target } from 'lucide-react';

const Dashboard = ({ shows, calendar, watchedEpisodes, onShowClick, onEpisodeClick }) => {
  // Calculer les statistiques
  const stats = useMemo(() => {
    // Total d'épisodes
    const totalEpisodes = calendar.length;

    // Épisodes vus
    const watchedCount = Object.values(watchedEpisodes).filter(Boolean).length;
    const watchedPercentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    // Épisodes à regarder (passés et non vus)
    const now = new Date();
    const toWatch = calendar.filter(ep => {
      const airDate = new Date(ep.airDate);
      return airDate < now && !watchedEpisodes[ep.id];
    }).length;

    // Séries terminées (100% vus)
    const completedShows = shows.filter(show => {
      const showEpisodes = calendar.filter(ep => ep.showId === show.tvmazeId && ep.quality === show.quality);
      if (showEpisodes.length === 0) return false;
      const showWatched = showEpisodes.filter(ep => watchedEpisodes[ep.id]).length;
      return showWatched === showEpisodes.length;
    }).length;

    // Temps de visionnage estimé (40 min par épisode)
    const watchedMinutes = watchedCount * 40;
    const watchedHours = Math.floor(watchedMinutes / 60);
    const watchedDays = Math.floor(watchedHours / 24);

    // Épisodes cette semaine
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const episodesThisWeek = calendar.filter(ep => {
      const airDate = new Date(ep.airDate);
      return airDate >= weekStart && airDate < weekEnd;
    }).length;

    return {
      totalEpisodes,
      watchedCount,
      watchedPercentage,
      toWatch,
      completedShows,
      watchedDays,
      watchedHours: watchedHours % 24,
      episodesThisWeek
    };
  }, [shows, calendar, watchedEpisodes]);

  // Prochains épisodes par période
  const upcomingEpisodes = useMemo(() => {
    const now = new Date();

    const in24h = new Date(now);
    in24h.setHours(in24h.getHours() + 24);

    const in48h = new Date(now);
    in48h.setHours(in48h.getHours() + 48);

    const in7days = new Date(now);
    in7days.setDate(in7days.getDate() + 7);

    const upcoming = calendar
      .filter(ep => new Date(ep.airDate) > now && !watchedEpisodes[ep.id])
      .sort((a, b) => new Date(a.airDate) - new Date(b.airDate));

    return {
      next24h: upcoming.filter(ep => new Date(ep.airDate) <= in24h),
      next48h: upcoming.filter(ep => new Date(ep.airDate) > in24h && new Date(ep.airDate) <= in48h),
      next7days: upcoming.filter(ep => new Date(ep.airDate) > in48h && new Date(ep.airDate) <= in7days)
    };
  }, [calendar, watchedEpisodes]);

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="bg-white dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-gray-300 dark:border-white/10 hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{value}</div>
          {subtitle && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</div>}
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</div>
    </div>
  );

  const EpisodeCard = ({ episode, showBadge }) => {
    const show = shows.find(s => s.tvmazeId === episode.showId && s.quality === episode.quality);
    const airDate = new Date(episode.airDate);
    const isToday = airDate.toDateString() === new Date().toDateString();
    const isTomorrow = airDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

    return (
      <div
        onClick={() => onEpisodeClick?.(episode)}
        className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-300 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer group"
      >
        <div className="flex gap-3">
          <img
            src={show?.poster || episode.image || 'https://via.placeholder.com/80x120/1a1a1a/ffffff?text=?'}
            alt={episode.showTitle}
            className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-all">
              {episode.showTitle}
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')} - {episode.title}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {showBadge && (
                <span className={`px-2 py-1 rounded-lg font-bold ${
                  isToday ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                  isTomorrow ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                  'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}>
                  {isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : episode.airDate}
                </span>
              )}
              {show && (
                <span className={`px-2 py-1 rounded-lg font-bold ${
                  show.quality === '4K' ? 'bg-purple-600/20 text-purple-400' :
                  show.quality === '1080p' ? 'bg-green-600/20 text-green-400' :
                  'bg-blue-600/20 text-blue-400'
                }`}>
                  {show.quality}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Tableau de bord</h2>
        <p className="text-gray-600 dark:text-gray-400">Vue d'ensemble de votre activité</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Eye}
          label="Épisodes vus"
          value={stats.watchedCount}
          subtitle={`${stats.watchedPercentage}% du total`}
          color="bg-green-500/20 text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={Clock}
          label="À regarder"
          value={stats.toWatch}
          subtitle="Épisodes passés"
          color="bg-orange-500/20 text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={CheckCircle}
          label="Séries terminées"
          value={stats.completedShows}
          subtitle={`sur ${shows.length} série${shows.length > 1 ? 's' : ''}`}
          color="bg-blue-500/20 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Temps de visionnage"
          value={stats.watchedDays > 0 ? `${stats.watchedDays}j ${stats.watchedHours}h` : `${stats.watchedHours}h`}
          subtitle={`≈ ${stats.watchedCount} épisodes`}
          color="bg-purple-500/20 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Épisodes cette semaine */}
      {stats.episodesThisWeek > 0 && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-2xl p-6 border border-purple-500/20 dark:border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-bold">Cette semaine</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.episodesThisWeek}</span> épisode{stats.episodesThisWeek > 1 ? 's' : ''} à venir
          </p>
        </div>
      )}

      {/* Prochains épisodes - 24h */}
      {upcomingEpisodes.next24h.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-xl font-bold">Dans les 24 heures</h3>
            <span className="px-3 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full text-sm font-bold">
              {upcomingEpisodes.next24h.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEpisodes.next24h.slice(0, 6).map(episode => (
              <EpisodeCard key={episode.id} episode={episode} showBadge />
            ))}
          </div>
        </div>
      )}

      {/* Prochains épisodes - 48h */}
      {upcomingEpisodes.next48h.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <h3 className="text-xl font-bold">24-48 heures</h3>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full text-sm font-bold">
              {upcomingEpisodes.next48h.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEpisodes.next48h.slice(0, 6).map(episode => (
              <EpisodeCard key={episode.id} episode={episode} showBadge />
            ))}
          </div>
        </div>
      )}

      {/* Prochains épisodes - 7 jours */}
      {upcomingEpisodes.next7days.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-bold">Cette semaine</h3>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold">
              {upcomingEpisodes.next7days.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEpisodes.next7days.slice(0, 9).map(episode => (
              <EpisodeCard key={episode.id} episode={episode} showBadge />
            ))}
          </div>
        </div>
      )}

      {/* Message si rien à venir */}
      {upcomingEpisodes.next24h.length === 0 &&
       upcomingEpisodes.next48h.length === 0 &&
       upcomingEpisodes.next7days.length === 0 && (
        <div className="text-center py-12 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-300 dark:border-white/10">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl font-semibold mb-2">Aucun épisode à venir</p>
          <p className="text-gray-600 dark:text-gray-400">Vos séries sont à jour !</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
