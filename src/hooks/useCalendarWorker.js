import { useEffect, useRef, useState } from 'react';

export const useCalendarWorker = () => {
  const workerRef = useRef(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const callbacksRef = useRef({});

  useEffect(() => {
    // Créer le worker
    workerRef.current = new Worker(
      new URL('../workers/calendar.worker.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      const { type, data } = e.data;
      const callback = callbacksRef.current[type];
      if (callback) {
        callback(data);
        delete callbacksRef.current[type];
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
    };

    setIsWorkerReady(true);

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const calculateStats = (shows, calendar, watchedEpisodes, callback) => {
    if (!isWorkerReady) return;
    callbacksRef.current['STATS_RESULT'] = callback;
    workerRef.current.postMessage({
      type: 'CALCULATE_STATS',
      data: { shows, calendar, watchedEpisodes }
    });
  };

  const filterAndSortShows = (shows, calendar, watchedEpisodes, filters, callback) => {
    if (!isWorkerReady) return;
    callbacksRef.current['FILTERED_SHOWS'] = callback;
    workerRef.current.postMessage({
      type: 'FILTER_AND_SORT_SHOWS',
      data: { shows, calendar, watchedEpisodes, filters }
    });
  };

  const getEpisodesForMonth = (calendar, year, month, callback) => {
    if (!isWorkerReady) return;
    callbacksRef.current['MONTH_EPISODES'] = callback;
    workerRef.current.postMessage({
      type: 'GET_EPISODES_FOR_MONTH',
      data: { calendar, year, month }
    });
  };

  return {
    isWorkerReady,
    calculateStats,
    filterAndSortShows,
    getEpisodesForMonth
  };
};
