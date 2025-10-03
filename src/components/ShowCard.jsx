import React from 'react';
import { Star, Play, Trash2 } from 'lucide-react';
import CachedImage from './CachedImage';

const ShowCard = ({ show, stats, onShowClick, onRemoveShow }) => {
  return (
    <div
      onClick={() => onShowClick(show)}
      className="bg-white dark:bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-gray-300 dark:border-white/10 hover:border-purple-500/50 transition-all group cursor-pointer"
    >
      <div className="relative">
        <CachedImage
          src={show.poster || 'https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image'}
          alt={show.title}
          className="w-full aspect-[2/3] object-cover"
          fallback="https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image"
        />

        {stats.nextEpisode && (
          <div className="absolute top-2 left-2 bg-cyan-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
            <Play className="w-3 h-3" />
            S{String(stats.nextEpisode.season).padStart(2, '0')}E{String(stats.nextEpisode.episode).padStart(2, '0')}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveShow(show.id);
          }}
          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 truncate" title={show.title}>{show.title}</h3>
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
            show.quality === '4K' ? 'bg-purple-600/20 text-purple-400' :
            show.quality === '1080p' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
          }`}>{show.quality}</span>
          {show.rating > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{show.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {stats.totalEpisodes > 0 && (
          <div>
            <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                style={{ width: `${stats.progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {stats.watchedCount}/{stats.totalEpisodes} • {stats.progress}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

ShowCard.displayName = 'ShowCard';

export default ShowCard;
