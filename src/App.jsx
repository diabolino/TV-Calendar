import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Check, X, Star, Search, Trash2, ChevronLeft, ChevronRight, List, Grid, RefreshCw, Play, Clock, Sun, Moon, LayoutDashboard, CalendarDays, Eye, Tv } from 'lucide-react';
import { searchShows, getShowEpisodes } from './services/tvmaze';
import { getShowOverviewFR, getEpisodeOverviewFR, getShowCast, getEnrichedShowDetails } from './services/tmdb';
import { useTheme } from './contexts/ThemeContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCalendarWorker } from './hooks/useCalendarWorker';
import AuthAndBackup from './components/AuthAndBackup';
import UpdateNotification from './components/UpdateNotification';
import Dashboard from './components/Dashboard';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import CachedImage from './components/CachedImage';
import ShowCard from './components/ShowCard';
import {
  onAuthChange,
  signIn,        // ← NOUVEAU
  signUp,        // ← NOUVEAU
  logOut,
  syncAllData,
  loadAllData,
  initAuth
} from './services/firebase';
import { exportData, importData } from './services/exportImport';
import { cleanExpiredImages } from './services/imageCache';
import { processSyncQueue, addToSyncQueue, hasPendingSync, getPendingSyncCount } from './services/syncQueue';
import packageJson from '../package.json';
import {
  parseEpisodeDate,
  compareEpisodesByDate,
  isEpisodeToday,
  isEpisodeTomorrow,
  getEpisodeDateString
} from './utils/dateHelpers';
import {
  cacheEpisodes,
  getCachedEpisodes,
  cleanExpiredCache
} from './services/episodeCache';

const App = () => {
  const { theme, toggleTheme } = useTheme();
  const currentVersion = packageJson.version;
  const updateNotificationRef = useRef(null);
  const { isWorkerReady, filterAndSortShows: filterAndSortShowsWorker } = useCalendarWorker();
  const [shows, setShows] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('calendar');
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'list', 'week'
  const [watchedEpisodes, setWatchedEpisodes] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShowDetail, setSelectedShowDetail] = useState(null);
  const [selectedDayEpisodes, setSelectedDayEpisodes] = useState(null);
  const [showAllFutureEpisodes, setShowAllFutureEpisodes] = useState(false); // Pour afficher tous les épisodes futurs
  const [showAllPastEpisodes, setShowAllPastEpisodes] = useState(false); // Pour afficher tous les épisodes passés
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showsSearchQuery, setShowsSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('added'); // 'added', 'progress', 'next', 'name'
  const [filterQuality, setFilterQuality] = useState('all'); // 'all', '720p', '1080p', '4K'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'watching', 'completed', 'upcoming', 'backlog', 'hiatus'
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [filteredShows, setFilteredShows] = useState([]);

  // Charger depuis localStorage
  useEffect(() => {
    const savedShows = localStorage.getItem('tv_calendar_shows');
    const savedWatched = localStorage.getItem('tv_calendar_watched');

    if (savedShows) {
      const parsedShows = JSON.parse(savedShows);
      // Migration : limiter le cast à 5 acteurs
      const migratedShows = parsedShows.map(show => {
        if (show.cast && show.cast.length > 5) {
          return { ...show, cast: show.cast.slice(0, 5) };
        }
        return show;
      });
      setShows(migratedShows);
    }
    if (savedWatched) {
      setWatchedEpisodes(JSON.parse(savedWatched));
    }
  }, []);

  // Sauvegarder dans localStorage ET sync cloud si connecté
  useEffect(() => {
    localStorage.setItem('tv_calendar_shows', JSON.stringify(shows));

    // Auto-sync vers Firebase si connecté, sinon ajouter à la queue
    if (user && shows.length > 0) {
      syncAllData(shows, watchedEpisodes).catch(err => {
        console.error('Erreur auto-sync shows:', err);
        // Ajouter à la queue en cas d'échec
        addToSyncQueue({
          type: 'shows',
          data: { shows, watchedEpisodes }
        });
        setPendingSyncCount(getPendingSyncCount());
      });
    } else if (shows.length > 0) {
      // Pas connecté, ajouter à la queue pour sync future
      addToSyncQueue({
        type: 'shows',
        data: { shows, watchedEpisodes }
      });
      setPendingSyncCount(getPendingSyncCount());
    }
  }, [shows]);

  useEffect(() => {
    localStorage.setItem('tv_calendar_watched', JSON.stringify(watchedEpisodes));

    // Auto-sync vers Firebase si connecté, sinon ajouter à la queue
    if (user && Object.keys(watchedEpisodes).length > 0) {
      syncAllData(shows, watchedEpisodes).catch(err => {
        console.error('Erreur auto-sync watched:', err);
        // Ajouter à la queue en cas d'échec
        addToSyncQueue({
          type: 'watched',
          data: { shows, watchedEpisodes }
        });
        setPendingSyncCount(getPendingSyncCount());
      });
    } else if (Object.keys(watchedEpisodes).length > 0) {
      // Pas connecté, ajouter à la queue pour sync future
      addToSyncQueue({
        type: 'watched',
        data: { shows, watchedEpisodes }
      });
      setPendingSyncCount(getPendingSyncCount());
    }
  }, [watchedEpisodes]);

  // Charger le calendrier au démarrage et quand on ajoute/supprime une série
  useEffect(() => {
    if (shows.length > 0) {
      loadCalendar();
    } else {
      setCalendar([]);
    }
  }, [shows]);
  
  // Nettoyage du cache et initialisation au démarrage
  useEffect(() => {
    // Nettoyer les images expirées au démarrage
    cleanExpiredImages().then(count => {
      if (count > 0) {
        console.log(`🧹 ${count} images expirées nettoyées`);
      }
    });

    // Nettoyer le cache d'épisodes expiré
    cleanExpiredCache().then(count => {
      if (count > 0) {
        console.log(`🧹 ${count} cache(s) d'épisodes expiré(s) nettoyé(s)`);
      }
    });

    // Vérifier les syncs en attente
    setPendingSyncCount(getPendingSyncCount());
  }, []);

  // Utiliser le Web Worker pour filtrer/trier les séries
  useEffect(() => {
    if (!isWorkerReady || shows.length === 0) {
      setFilteredShows(shows);
      return;
    }

    const filters = {
      searchQuery: showsSearchQuery,
      sortBy,
      filterQuality,
      filterStatus
    };

    filterAndSortShowsWorker(shows, calendar, watchedEpisodes, filters, (result) => {
      setFilteredShows(result);
    });
  }, [shows, calendar, watchedEpisodes, showsSearchQuery, sortBy, filterQuality, filterStatus, isWorkerReady, filterAndSortShowsWorker]);

  // Observer l'authentification Firebase + Auto-connexion
  useEffect(() => {
    const initFirebase = async () => {
      // Auto-connexion au démarrage
      await initAuth();
      
      // Observer les changements d'auth
      const unsubscribe = onAuthChange(async (firebaseUser) => {
        console.log('🔐 État auth:', firebaseUser ? 'Connecté' : 'Déconnecté');
        setUser(firebaseUser);
  
        // Si l'utilisateur vient de se connecter, fusionner intelligemment
        if (firebaseUser && !firebaseUser.isAnonymous) {
          const cloudData = await loadAllData();
          const localShows = shows;
          const localWatched = watchedEpisodes;

          // Fusionner les séries (union par ID)
          const mergedShows = [...localShows];
          cloudData.shows.forEach(cloudShow => {
            if (!mergedShows.find(s => s.id === cloudShow.id)) {
              mergedShows.push(cloudShow);
            }
          });

          // Fusionner les épisodes vus (union des clés)
          const mergedWatched = { ...localWatched, ...cloudData.watchedEpisodes };

          const hasCloudData = cloudData.shows.length > 0 || Object.keys(cloudData.watchedEpisodes).length > 0;
          const hasLocalData = localShows.length > 0 || Object.keys(localWatched).length > 0;

          if (hasCloudData && hasLocalData && mergedShows.length > Math.max(localShows.length, cloudData.shows.length)) {
            // Données dans les deux endroits ET différentes
            const confirmMerge = window.confirm(
              `Fusion des données:\n- Local: ${localShows.length} séries\n- Cloud: ${cloudData.shows.length} séries\n- Total après fusion: ${mergedShows.length} séries\n\nFusionner les données ?`
            );

            if (confirmMerge) {
              setShows(mergedShows);
              setWatchedEpisodes(mergedWatched);
              await syncAllData(mergedShows, mergedWatched);
              console.log('✅ Données fusionnées et synchronisées !');
            }
          } else if (hasCloudData && !hasLocalData) {
            // Seulement cloud → charger automatiquement
            setShows(cloudData.shows);
            setWatchedEpisodes(cloudData.watchedEpisodes);
            console.log('✅ Données cloud chargées automatiquement');
          } else if (!hasCloudData && hasLocalData) {
            // Seulement local → sync vers cloud automatiquement
            await syncAllData(localShows, localWatched);
            console.log('✅ Données locales synchronisées vers le cloud');
          }
        }
      });
  
      return () => unsubscribe();
    };
  
    initFirebase();
  }, []);

  // Charger le calendrier de l'année
  const loadCalendar = async (forceReload = false) => {
    setLoading(true);
    try {
      console.log('🔍 Chargement du calendrier TVMaze pour', shows.length, 'séries');
      
      if (forceReload) {
        console.log('🔄 Rechargement forcé des données...');
      }

      // Charger les épisodes pour chaque série suivie
      const allEpisodes = [];
      
      for (const show of shows) {
        console.log('📺 Chargement épisodes pour:', show.title, '(' + show.quality + ')');

        let episodes = [];

        // Essayer le cache IndexedDB d'abord
        if (!forceReload) {
          episodes = await getCachedEpisodes(show.tvmazeId);
        }

        // Si pas de cache ou force reload, charger depuis l'API
        if (!episodes || episodes.length === 0 || forceReload) {
          try {
            episodes = await getShowEpisodes(show.tvmazeId);
            // Sauvegarder dans IndexedDB (TTL 7 jours par défaut)
            await cacheEpisodes(show.tvmazeId, episodes);
            console.log('✅', episodes.length, 'épisodes récupérés et mis en cache pour', show.title);
          } catch (error) {
            // En cas d'erreur, tenter de récupérer depuis le cache même expiré
            const fallbackEpisodes = await getCachedEpisodes(show.tvmazeId);
            if (fallbackEpisodes && fallbackEpisodes.length > 0) {
              episodes = fallbackEpisodes;
              console.log('⚠️ Utilisation du cache (mode offline) pour', show.title);
            } else {
              console.error('❌ Impossible de charger les épisodes pour', show.title);
              continue;
            }
          }
        } else {
          console.log('💾 Épisodes chargés depuis IndexedDB pour', show.title);
        }

        // Ajouter avec la qualité de la série (tous les épisodes, toutes saisons)
        episodes.forEach(episode => {
          allEpisodes.push({
            ...episode,
            id: `${episode.showId}-${episode.season}-${episode.episode}-${show.quality}`,
            showTitle: show.title,
            quality: show.quality,
            image: episode.image || show.poster
          });
        });
      }

      console.log('📊 Total épisodes dans le calendrier:', allEpisodes.length);
      setCalendar(allEpisodes);

    } catch (error) {
      console.error('❌ Erreur chargement calendrier:', error);
      alert('❌ Erreur lors du chargement du calendrier.');
    }
    setLoading(false);
  };

  // Rechercher une série
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await searchShows(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
    }
    setLoading(false);
  };

  // Ajouter une série
  const addShow = async (show, quality) => {
    const exists = shows.find(s => s.tvmazeId === show.tvmazeId && s.quality === quality);
    if (exists) {
      alert('Cette série est déjà ajoutée avec cette qualité !');
      return;
    }

    // Enrichir avec TMDB pour synopsis français et cast
    const tmdbData = await getShowOverviewFR(show.title, show.imdbId);

    let cast = [];
    if (tmdbData?.tmdbId) {
      cast = await getShowCast(tmdbData.tmdbId);
    }

    const newShow = {
      ...show,
      quality,
      id: `${show.tvmazeId}-${quality}`,
      addedAt: new Date().toISOString(),
      // Ajouter les données TMDB si disponibles
      overviewFR: tmdbData?.overview || show.overview,
      tmdbId: tmdbData?.tmdbId || null,
      backgroundTMDB: tmdbData?.backdrop || null,
      cast: cast
    };

    setShows([...shows, newShow]);
    setSearchQuery('');
    setSearchResults([]);

    console.log('🎬 Série ajoutée ! Le calendrier va se recharger...');
  };

  // Supprimer une série
  const removeShow = (showId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette série ?')) {
      setShows(prev => prev.filter(s => s.id !== showId));
    }
  };

  // Marquer un épisode comme vu
  const toggleWatched = (episodeId) => {
    setWatchedEpisodes(prev => ({
      ...prev,
      [episodeId]: !prev[episodeId]
    }));
  };

  // Rafraîchir manuellement
  const handleRefresh = () => {
    if (shows.length === 0) {
      alert('Ajoutez d\'abord des séries pour recharger le calendrier.');
      return;
    }
    loadCalendar(true);
  };

  // Vérifier les mises à jour manuellement (appelle UpdateNotification via ref)
  const checkForUpdates = () => {
    if (updateNotificationRef.current) {
      updateNotificationRef.current.checkForUpdates();
    }
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Obtenir les jours du mois
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // getDay() retourne 0-6 (Dim-Sam), on convertit pour avoir Lun=0, Dim=6
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({ date, isCurrentMonth: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  // Obtenir les épisodes d'une date
  const getEpisodesForDate = (date) => {
    // Utiliser les méthodes locales au lieu de toISOString() pour éviter les problèmes de fuseau horaire
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return calendar.filter(ep => ep.airDate === dateStr);
  };

  // Grouper par date pour la vue liste
  const groupByDate = (episodes) => {
    const groups = {};
    episodes.forEach(ep => {
      if (!groups[ep.airDate]) {
        groups[ep.airDate] = [];
      }
      groups[ep.airDate].push(ep);
    });
    return groups;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const epDate = new Date(date);
    epDate.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (epDate.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (epDate.getTime() === tomorrow.getTime()) {
      return "Demain";
    }

    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Obtenir les épisodes d'une série
  const getShowEpisodesFiltered = (showId, quality) => {
    return calendar
      .filter(ep => ep.showId === showId && ep.quality === quality)
      .sort(compareEpisodesByDate);
  };

  // Générer une couleur unique pour une série (basée sur l'ID)
  // Utilise HSL pour générer des couleurs distinctes pour chaque série (jusqu'à plusieurs milliers)
  const getShowColor = (showId) => {
    // Créer un hash de l'ID pour générer une teinte unique
    const hash = showId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Utiliser le nombre d'or (golden ratio) pour espacer les teintes de manière optimale
    const goldenRatio = 0.618033988749895;
    const hue = (hash * goldenRatio * 360) % 360;

    // Saturation et luminosité fixes pour des couleurs vives et lisibles
    const saturation = 70; // Entre 65-75% pour des couleurs vives mais pas criardes
    const lightness = theme === 'dark' ? 55 : 50; // Légèrement plus clair en mode sombre

    return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
  };

  // Obtenir les jours de la semaine courante
  const getWeekDays = (date) => {
    const week = [];
    const currentDate = new Date(date);

    // Aller au lundi de la semaine
    const dayOfWeek = currentDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si dimanche (0), reculer de 6 jours
    currentDate.setDate(currentDate.getDate() + diff);
    currentDate.setHours(0, 0, 0, 0);

    // Ajouter 7 jours
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentDate);
      day.setDate(currentDate.getDate() + i);
      week.push(day);
    }

    return week;
  };

  // Ouvrir détails avec enrichissement TMDB si nécessaire
  const openShowDetails = async (show) => {
    setSelectedShowDetail(show);
    setShowAllFutureEpisodes(false); // Réinitialiser
    setShowAllPastEpisodes(false);

    // Si pas de synopsis français ou cast, essayer de les récupérer
    if (!show.overviewFR && !show.tmdbId) {
      console.log('📡 Récupération données TMDB pour:', show.title);
      const tmdbData = await getShowOverviewFR(show.title, show.imdbId);

      if (tmdbData && tmdbData.tmdbId) {
        // Récupérer aussi le cast
        const cast = await getShowCast(tmdbData.tmdbId);

        // Mettre à jour la série avec les données TMDB
        const updatedShow = {
          ...show,
          overviewFR: tmdbData.overview,
          tmdbId: tmdbData.tmdbId,
          backgroundTMDB: tmdbData.backdrop,
          cast: cast
        };

        // Mettre à jour dans la liste des séries
        const updatedShows = shows.map(s =>
          s.id === show.id ? updatedShow : s
        );
        setShows(updatedShows);

        // Mettre à jour la modal
        setSelectedShowDetail(updatedShow);

        console.log('✅ Données TMDB récupérées pour:', show.title);
      } else {
        console.log('⚠️ Pas de données TMDB trouvées pour:', show.title);
      }
    } else if (show.tmdbId && !show.enrichedDetails) {
      // Si on a le tmdbId mais pas les détails enrichis, les récupérer
      console.log('📡 Récupération détails enrichis pour:', show.title);
      const enriched = await getEnrichedShowDetails(show.tmdbId);

      const updatedShow = {
        ...show,
        enrichedDetails: enriched
      };

      const updatedShows = shows.map(s =>
        s.id === show.id ? updatedShow : s
      );
      setShows(updatedShows);
      setSelectedShowDetail(updatedShow);

      console.log('✅ Détails enrichis récupérés pour:', show.title);
    }
  };

  const closeShowDetails = () => {
    setSelectedShowDetail(null);
    setShowAllFutureEpisodes(false);
    setShowAllPastEpisodes(false);
  };

  // Ouvrir la modal de jour
  const openDayModal = (date, episodes) => {
    setSelectedDayEpisodes({ date, episodes });
  };

  const closeDayModal = () => {
    setSelectedDayEpisodes(null);
  };

  // Obtenir le dernier épisode vu pour une série
  const getLastWatchedEpisode = (showId, quality) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const watchedShowEpisodes = calendar
      .filter(ep => {
        const epDate = parseEpisodeDate(ep);
        epDate.setHours(0, 0, 0, 0);
        return ep.showId === showId &&
               ep.quality === quality &&
               epDate <= today &&
               watchedEpisodes[ep.id];
      })
      .sort((a, b) => {
        // Trier par saison puis par épisode (décroissant)
        if (b.season !== a.season) return b.season - a.season;
        return b.episode - a.episode;
      });

    return watchedShowEpisodes.length > 0 ? watchedShowEpisodes[0] : null;
  };

  // Obtenir la saison en cours basée sur le dernier épisode vu
  const getCurrentSeason = (showId, quality) => {
    const lastWatched = getLastWatchedEpisode(showId, quality);

    if (lastWatched) {
      // Utiliser la saison du dernier épisode vu
      return lastWatched.season;
    }

    // Si aucun épisode vu, prendre la saison la plus ancienne disponible
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availableEpisodes = calendar
      .filter(ep => {
        const epDate = parseEpisodeDate(ep);
        epDate.setHours(0, 0, 0, 0);
        return ep.showId === showId && ep.quality === quality && epDate <= today;
      })
      .sort((a, b) => {
        if (a.season !== b.season) return a.season - b.season;
        return a.episode - b.episode;
      });

    return availableEpisodes.length > 0 ? availableEpisodes[0].season : null;
  };

  // Obtenir le prochain épisode non vu d'une série
  const getNextUnwatchedEpisode = (showId, quality) => {
    const currentSeason = getCurrentSeason(showId, quality);
    if (currentSeason === null) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Chercher dans la saison en cours
    const seasonEpisodes = calendar
      .filter(ep => {
        const epDate = parseEpisodeDate(ep);
        epDate.setHours(0, 0, 0, 0);
        return ep.showId === showId &&
               ep.quality === quality &&
               ep.season === currentSeason &&
               epDate <= today;
      })
      .sort((a, b) => a.episode - b.episode);

    const nextInSeason = seasonEpisodes.find(ep => !watchedEpisodes[ep.id]);
    if (nextInSeason) return nextInSeason;

    // Vérifier s'il y a au moins un épisode vu dans la saison en cours
    const hasWatchedInCurrentSeason = seasonEpisodes.some(ep => watchedEpisodes[ep.id]);

    // Si on a vu au moins un épisode dans la saison en cours,
    // ne pas chercher dans les saisons précédentes (rester sur la saison actuelle)
    if (hasWatchedInCurrentSeason) {
      // Chercher uniquement dans les saisons suivantes
      const nextSeasonEpisodes = calendar
        .filter(ep => {
          const epDate = parseEpisodeDate(ep);
          epDate.setHours(0, 0, 0, 0);
          return ep.showId === showId &&
                 ep.quality === quality &&
                 ep.season > currentSeason &&
                 epDate <= today;
        })
        .sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.episode - b.episode;
        });

      return nextSeasonEpisodes.find(ep => !watchedEpisodes[ep.id]);
    }

    // Sinon (aucun épisode vu dans la saison en cours), chercher dans les saisons précédentes
    const previousSeasonEpisodes = calendar
      .filter(ep => {
        const epDate = parseEpisodeDate(ep);
        epDate.setHours(0, 0, 0, 0);
        return ep.showId === showId &&
               ep.quality === quality &&
               ep.season < currentSeason &&
               epDate <= today;
      })
      .sort((a, b) => {
        if (b.season !== a.season) return b.season - a.season;
        return a.episode - b.episode;
      });

    return previousSeasonEpisodes.find(ep => !watchedEpisodes[ep.id]);
  };

  // Obtenir toutes les séries avec épisodes à regarder
  const getShowsToWatch = () => {
    const showsWithUnwatched = shows.map(show => {
      const nextEpisode = getNextUnwatchedEpisode(show.tvmazeId, show.quality);
      if (!nextEpisode) return null;

      const currentSeason = nextEpisode.season;
      const seasonEpisodes = calendar.filter(ep =>
        ep.showId === show.tvmazeId &&
        ep.quality === show.quality &&
        ep.season === currentSeason
      );
      const watchedCount = seasonEpisodes.filter(ep => watchedEpisodes[ep.id]).length;
      const totalEpisodes = seasonEpisodes.length;

      return {
        ...show,
        nextEpisode,
        currentSeason,
        watchedCount,
        totalEpisodes,
        progress: totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0
      };
    }).filter(show => show !== null);

    return showsWithUnwatched.sort((a, b) => {
      return parseEpisodeDate(a.nextEpisode) - parseEpisodeDate(b.nextEpisode);
    });
  };

  // Calculer les statistiques pour une série
  const getShowStats = (showId, quality) => {
    const nextEpisode = getNextUnwatchedEpisode(showId, quality);

    if (!nextEpisode) {
      // Si pas de prochain épisode, on retourne des stats vides
      return {
        watchedCount: 0,
        totalEpisodes: 0,
        progress: 0,
        nextEpisode: null,
        currentSeason: null
      };
    }

    const currentSeason = nextEpisode.season;
    const seasonEpisodes = calendar.filter(ep =>
      ep.showId === showId &&
      ep.quality === quality &&
      ep.season === currentSeason
    );
    const watchedCount = seasonEpisodes.filter(ep => watchedEpisodes[ep.id]).length;
    const totalEpisodes = seasonEpisodes.length;

    return {
      watchedCount,
      totalEpisodes,
      progress: totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0,
      nextEpisode,
      currentSeason
    };
  };

  // Fonctions Firebase
  const handleSignIn = async (email, password, isSignUp = false) => {
    try {
      if (isSignUp) {
        await signUp(email, password);
        alert('✅ Compte créé avec succès !');
      } else {
        await signIn(email, password);
        alert('✅ Connecté avec succès !');
      }
    } catch (error) {
      const errorMessages = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Mot de passe trop faible (min 6 caractères)',
        'auth/user-not-found': 'Utilisateur non trouvé',
        'auth/wrong-password': 'Mot de passe incorrect'
      };
      alert('❌ ' + (errorMessages[error.code] || error.message));
    }
  };
  
  const handleSignOut = async () => {
    if (confirm('Voulez-vous vous déconnecter ? Les données resteront sauvegardées localement.')) {
      await logOut();
      alert('✅ Déconnecté');
    }
  };
  
  const handleSync = async () => {
    if (!user) {
      alert('⚠️ Connectez-vous d\'abord pour synchroniser');
      return;
    }

    setIsSyncing(true);

    // D'abord, synchroniser les données actuelles
    const success = await syncAllData(shows, watchedEpisodes);

    // Ensuite, traiter la queue de sync en attente
    if (hasPendingSync()) {
      const queueResult = await processSyncQueue(async (data) => {
        await syncAllData(data.shows, data.watchedEpisodes);
      });

      setPendingSyncCount(queueResult.remaining);

      if (queueResult.success) {
        console.log(`✅ ${queueResult.processed} opérations en attente synchronisées`);
      } else {
        console.log(`⚠️ ${queueResult.processed} synchronisées, ${queueResult.failed} échouées`);
      }
    }

    setIsSyncing(false);

    if (success) {
      alert('✅ Données synchronisées sur le cloud !');
    } else {
      alert('❌ Erreur lors de la synchronisation');
    }
  };
  
  // Fonctions Export/Import
  const handleExport = () => {
    const success = exportData(shows, watchedEpisodes);
    if (success) {
      alert('✅ Backup téléchargé !');
    } else {
      alert('❌ Erreur lors de l\'export');
    }
  };
  
  const handleImport = async (file) => {
    try {
      const data = await importData(file);
      
      const confirmImport = confirm(
        `Importer ces données ?\n- ${data.shows.length} séries\n- ${Object.values(data.watchedEpisodes).filter(v => v).length} épisodes vus\n- Export du: ${new Date(data.exportDate).toLocaleDateString('fr-FR')}\n\n⚠️ Cela remplacera vos données actuelles !`
      );
      
      if (confirmImport) {
        setShows(data.shows);
        setWatchedEpisodes(data.watchedEpisodes);
        
        // Sync avec Firebase si connecté
        if (user) {
          await syncAllData(data.shows, data.watchedEpisodes);
        }
        
        alert('✅ Données importées avec succès !');
      }
    } catch (error) {
      alert('❌ Erreur lors de l\'import: ' + error.message);
    }
  };

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);

  // Filtrer les épisodes du mois courant pour la vue liste
  const currentMonthEpisodes = calendar.filter(ep => {
    const epDate = parseEpisodeDate(ep);
    return epDate.getMonth() === currentDate.getMonth() && epDate.getFullYear() === currentDate.getFullYear();
  });
  const groupedEpisodes = groupByDate(currentMonthEpisodes);
  const sortedDates = Object.keys(groupedEpisodes).sort();

  // Raccourcis clavier
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Rechercher une série"]');
        if (searchInput) searchInput.focus();
      }
    },
    { key: 'd', action: () => setView('dashboard') },
    { key: 'c', action: () => setView('calendar') },
    { key: 't', action: () => setView('towatch') },
    { key: 's', action: () => setView('shows') },
    {
      key: 'r',
      ctrl: true,
      action: () => {
        if (shows.length > 0) {
          loadCalendar();
        }
      }
    },
    { key: '?', shift: true, action: () => setShowKeyboardHelp(true) },
    {
      key: 'Escape',
      action: () => {
        setSelectedShowDetail(null);
        setSelectedDayEpisodes(null);
        setShowKeyboardHelp(false);
      }
    }
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white/80 dark:bg-black/30 backdrop-blur-lg border-b border-gray-200 dark:border-white/10 sticky top-0 z-50">
        <div className="max-w-[2000px] mx-auto px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-400" />
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  TV Calendar
                </h1>
                <button
                  onClick={checkForUpdates}
                  className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all text-xs font-bold cursor-pointer"
                  title="Cliquez pour vérifier les mises à jour"
                >
                  v{currentVersion}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle theme */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 transition-all"
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Composant Auth & Backup */}
              <AuthAndBackup
                user={user}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                onSync={handleSync}
                onExport={handleExport}
                onImport={handleImport}
                isSyncing={isSyncing}
              />

              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  view === 'dashboard' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  view === 'calendar' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendrier
              </button>
              <button
                onClick={() => setView('towatch')}
                className={`px-4 py-2 rounded-lg transition-all relative flex items-center gap-2 ${
                  view === 'towatch' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <Eye className="w-4 h-4" />
                À regarder
                {getShowsToWatch().length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                    {getShowsToWatch().length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setView('shows')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  view === 'shows' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <Tv className="w-4 h-4" />
                Mes Séries ({shows.length})
              </button>

              {/* Aide - Raccourcis clavier */}
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 transition-all flex items-center gap-2"
                title="Raccourcis clavier (Shift + ?)"
              >
                <span className="text-lg font-bold">?</span>
                Aide
              </button>
            </div>
          </div>

          {/* Barre de recherche globale */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher une série (Breaking Bad, The Office...)..."
                className="w-full bg-white/80 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="bg-white/90 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-gray-300 dark:border-white/10 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Résultats de recherche</h3>
                <button
                  onClick={() => { setSearchResults([]); setSearchQuery(''); }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {searchResults.map(show => (
                  <div key={show.id} className="bg-gray-100 dark:bg-white/5 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                    <img
                      src={show.poster || 'https://via.placeholder.com/100x150/1a1a1a/ffffff?text=No+Image'}
                      alt={show.title}
                      className="w-16 h-24 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">{show.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{show.year}</span>
                        {show.network && <><span>•</span><span>{show.network}</span></>}
                        {show.rating > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{show.rating.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {show.genres.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {show.genres.slice(0, 3).map(genre => (
                            <span key={genre} className="text-xs bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded">{genre}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => addShow(show, '720p')} className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-semibold transition-all">720p</button>
                      <button onClick={() => addShow(show, '1080p')} className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm font-semibold transition-all">1080p</button>
                      <button onClick={() => addShow(show, '4K')} className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm font-semibold transition-all">4K</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[2000px] mx-auto px-6 py-8">
        {view === 'dashboard' ? (
          <Dashboard
            shows={shows}
            calendar={calendar}
            watchedEpisodes={watchedEpisodes}
            onShowClick={openShowDetails}
            onEpisodeClick={(episode) => {
              const dayEpisodes = calendar.filter(ep => ep.airDate === episode.airDate);
              setSelectedDayEpisodes({ date: parseEpisodeDate(episode), episodes: dayEpisodes });
            }}
          />
        ) : view === 'calendar' ? (
          <div className="space-y-6">
            {/* Navigation */}
            {shows.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={goToPreviousMonth} className="p-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-all" title="Mois précédent">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={goToToday} className="px-4 py-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-all font-semibold">
                    Aujourd'hui
                  </button>
                  <button onClick={goToNextMonth} className="p-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-all" title="Mois suivant">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold capitalize ml-4">{monthName}</h2>

                  <button onClick={handleRefresh} disabled={loading} className="ml-4 p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-all disabled:opacity-50" title="Rafraîchir le calendrier">
                    <RefreshCw className={`w-5 h-5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setCalendarView('month')} className={`p-2 rounded-lg transition-all ${calendarView === 'month' ? 'bg-purple-600' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'}`} title="Vue mois">
                    <Grid className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCalendarView('week')} className={`p-2 rounded-lg transition-all ${calendarView === 'week' ? 'bg-purple-600' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'}`} title="Vue semaine">
                    <CalendarDays className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCalendarView('list')} className={`p-2 rounded-lg transition-all ${calendarView === 'list' ? 'bg-purple-600' : 'bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10'}`} title="Vue liste">
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Calendrier */}
            {loading && calendar.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
              </div>
            ) : calendar.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-300 dark:border-white/10">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-xl font-semibold mb-2">Aucun épisode</p>
                <p className="text-gray-600 dark:text-gray-400">Ajoutez des séries pour voir leur calendrier</p>
              </div>
            ) : calendarView === 'month' ? (
              <div className="bg-transparent">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="text-center font-semibold text-gray-500 dark:text-gray-500 py-3 text-sm uppercase tracking-wider">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    const dayEpisodes = getEpisodesForDate(day.date);
                    const isCurrentDay = isToday(day.date);
                    const isPastDay = isPast(day.date);

                    return (
                      <div
                        key={index}
                        className={`min-h-[200px] p-2 bg-white dark:bg-white/5 rounded-lg border border-gray-300 dark:border-white/10 relative ${
                          !day.isCurrentMonth ? 'opacity-40' : ''
                        } ${
                          isCurrentDay ? 'ring-2 ring-purple-500' : ''
                        }`}
                      >
                        <div className={`text-sm font-bold mb-2 ${isCurrentDay ? 'text-purple-400' : isPastDay ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                          {day.date.getDate()}
                        </div>
                        <div className="space-y-1.5">
                          {dayEpisodes.slice(0, 3).map(episode => {
                            const isWatched = watchedEpisodes[episode.id];
                            // Trouver la série correspondante pour obtenir l'affiche
                            const show = shows.find(s => s.tvmazeId === episode.showId && s.quality === episode.quality);
                            const bgColor = getShowColor(episode.showId);

                            return (
                              <div
                                key={episode.id}
                                onClick={() => toggleWatched(episode.id)}
                                className={`flex gap-2 p-1.5 rounded cursor-pointer transition-all hover:opacity-90 border-2 ${
                                  isWatched ? 'border-green-500/50 opacity-60' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: bgColor }}
                              >
                                <CachedImage
                                  src={show?.poster || 'https://via.placeholder.com/40x60/1a1a1a/ffffff?text=?'}
                                  alt={episode.showTitle}
                                  className={`w-10 h-14 rounded object-cover flex-shrink-0 ${isWatched ? 'opacity-60' : ''}`}
                                  fallback="https://via.placeholder.com/40x60/1a1a1a/ffffff?text=?"
                                />
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <div className="text-xs font-semibold truncate text-white">
                                    {episode.showTitle}
                                  </div>
                                  <div className="text-xs text-white/90">
                                    S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')}
                                  </div>
                                  {isWatched && (
                                    <Check className="w-3 h-3 text-green-400 absolute top-1 right-1" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {dayEpisodes.length > 3 && (
                            <div
                              onClick={() => openDayModal(day.date, dayEpisodes)}
                              className="text-xs text-center py-1.5 font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 cursor-pointer transition-all"
                            >
                              +{dayEpisodes.length - 3} plus
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : calendarView === 'week' ? (
              <div className="bg-transparent">
                {/* Vue semaine avec timeline */}
                <div className="grid grid-cols-8 gap-1">
                  {/* Colonne des heures */}
                  <div className="text-xs text-gray-500 dark:text-gray-500 font-semibold"></div>

                  {/* Headers des jours */}
                  {getWeekDays(currentDate).map((day, index) => {
                    const isDayToday = isToday(day);
                    return (
                      <div key={index} className={`text-center py-3 ${isDayToday ? 'bg-purple-500/20 dark:bg-purple-500/30 rounded-t-lg' : ''}`}>
                        <div className={`font-semibold text-sm ${isDayToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index]}
                        </div>
                        <div className={`text-2xl font-bold ${isDayToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                          {day.getDate()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {day.toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grille des épisodes */}
                <div className="grid grid-cols-8 gap-1 mt-2">
                  <div></div>
                  {getWeekDays(currentDate).map((day, dayIndex) => {
                    const dayEpisodes = getEpisodesForDate(day);
                    const isDayToday = isToday(day);

                    return (
                      <div key={dayIndex} className={`min-h-[400px] bg-white dark:bg-white/5 rounded-lg border border-gray-300 dark:border-white/10 p-2 ${isDayToday ? 'ring-2 ring-purple-500' : ''}`}>
                        <div className="space-y-2">
                          {dayEpisodes.length === 0 ? (
                            <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-4">
                              Aucun épisode
                            </div>
                          ) : (
                            dayEpisodes.map(episode => {
                              const isWatched = watchedEpisodes[episode.id];
                              const show = shows.find(s => s.tvmazeId === episode.showId && s.quality === episode.quality);
                              const bgColor = getShowColor(episode.showId);

                              return (
                                <div
                                  key={episode.id}
                                  onClick={() => toggleWatched(episode.id)}
                                  className={`relative rounded-lg cursor-pointer transition-all overflow-hidden ${
                                    isWatched ? 'opacity-50' : 'hover:scale-105'
                                  } border-2 ${isWatched ? 'border-green-500' : 'border-transparent'} bg-white dark:bg-white/5`}
                                  title={`${episode.showTitle} - ${episode.title}`}
                                >
                                  {show?.poster && (
                                    <CachedImage
                                      src={show.poster}
                                      alt={episode.showTitle}
                                      className="w-full aspect-[2/3] object-cover"
                                      fallback="https://via.placeholder.com/200x300/1a1a1a/ffffff?text=No+Poster"
                                    />
                                  )}
                                  <div className="p-2" style={{ backgroundColor: bgColor }}>
                                    <div className="text-white">
                                      <div className="font-bold text-xs truncate">{episode.showTitle}</div>
                                      <div className="text-[10px] opacity-90">
                                        S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')}
                                      </div>
                                      {show && (
                                        <div className="text-[9px] opacity-75 mt-1">
                                          {show.quality}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isWatched && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                      <div className="bg-green-500 rounded-full p-2">
                                        <Check className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => (
                  <div key={date} className="space-y-3">
                    <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2 sticky top-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg py-2 px-4 rounded-lg border border-gray-300 dark:border-white/10 z-10">
                      <Calendar className="w-5 h-5" />
                      {formatDate(date)}
                    </h2>

                    <div className="grid gap-4">
                      {groupedEpisodes[date].map(episode => {
                        const isWatched = watchedEpisodes[episode.id];
                        const show = shows.find(s => s.tvmazeId === episode.showId && s.quality === episode.quality);
                        return (
                          <div key={episode.id} onClick={() => toggleWatched(episode.id)} className={`bg-white dark:bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border transition-all cursor-pointer hover:scale-[1.02] ${
                            isWatched ? 'border-green-500/50 bg-green-500/10' : 'border-gray-300 dark:border-white/10 hover:border-purple-500/50'
                          }`}>
                            <div className="flex gap-4 p-4">
                              <div className="relative flex-shrink-0">
                                <CachedImage
                                  src={show?.poster || 'https://via.placeholder.com/200x300/2d3748/ffffff?text=No+Poster'}
                                  alt={episode.showTitle}
                                  className={`w-32 aspect-[2/3] rounded-lg object-cover ${isWatched ? 'opacity-50' : ''}`}
                                  fallback="https://via.placeholder.com/200x300/2d3748/ffffff?text=No+Poster"
                                />
                                {isWatched && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-green-500 rounded-full p-3"><Check className="w-8 h-8" /></div>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2 gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-bold text-purple-300 truncate">{episode.showTitle}</h3>
                                    <p className="text-2xl font-bold truncate">S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')} - {episode.title}</p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                                    episode.quality === '4K' ? 'bg-purple-600/20 text-purple-400' :
                                    episode.quality === '1080p' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
                                  }`}>{episode.quality}</span>
                                </div>

                                {episode.overview && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{episode.overview}</p>}

                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <span>📅 {episode.airDate}</span>
                                  {isWatched && <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" />Vu</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : view === 'towatch' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">À regarder</h2>
              {getShowsToWatch().length > 0 && <span className="text-gray-600 dark:text-gray-400">{getShowsToWatch().length} série{getShowsToWatch().length > 1 ? 's' : ''}</span>}
            </div>

            {getShowsToWatch().length === 0 ? (
              <div className="text-center py-12 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-300 dark:border-white/10">
                <Check className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <p className="text-xl font-semibold mb-2">Tout est à jour !</p>
                <p className="text-gray-600 dark:text-gray-400">Aucun épisode passé en attente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getShowsToWatch().map(show => {
                  const nextEp = show.nextEpisode;
                  const isWatched = watchedEpisodes[nextEp.id];

                  return (
                    <div key={show.id} className="bg-white dark:bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-300 dark:border-white/10 hover:border-purple-500/50 transition-all overflow-hidden">
                      <div className="flex gap-4 p-4">
                        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => openShowDetails(show)}>
                          <CachedImage
                            src={show.poster || 'https://via.placeholder.com/200x300/1a1a1a/ffffff?text=No+Image'}
                            alt={show.title}
                            className="w-32 h-48 rounded-lg object-cover"
                            fallback="https://via.placeholder.com/200x300/1a1a1a/ffffff?text=No+Image"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <h3 className="text-2xl font-bold cursor-pointer hover:text-purple-400 transition-all" onClick={() => openShowDetails(show)}>
                                {show.title}
                              </h3>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeShow(show.id); }}
                                className="text-red-400 hover:text-red-300 transition-all p-2"
                                title="Supprimer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                show.quality === '4K' ? 'bg-purple-600/20 text-purple-400' :
                                show.quality === '1080p' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
                              }`}>{show.quality}</span>
                              {show.rating > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span>{show.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>

                            <div className="bg-gray-100 dark:bg-white/5 rounded-xl p-4 mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-orange-400" />
                                <span className="font-semibold text-orange-400">Prochain épisode non vu</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <img
                                  src={nextEp.image || 'https://via.placeholder.com/160x90/2d3748/ffffff?text=No+Image'}
                                  alt={nextEp.title}
                                  className="w-40 h-24 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-lg mb-1">
                                    S{String(nextEp.season).padStart(2, '0')}E{String(nextEp.episode).padStart(2, '0')} - {nextEp.title}
                                  </h4>
                                  {nextEp.overview && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{nextEp.overview}</p>}
                                  <span className="text-xs text-gray-500 dark:text-gray-500">📅 {nextEp.airDate}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Progression</span>
                                <span className="text-sm font-semibold">{show.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                                  style={{ width: `${show.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-500 mt-1 block">
                                {show.watchedCount} / {show.totalEpisodes} épisodes vus
                              </span>
                            </div>

                            <button
                              onClick={() => toggleWatched(nextEp.id)}
                              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                                isWatched
                                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              {isWatched ? (
                                <>
                                  <Check className="w-5 h-5" />
                                  Vu
                                </>
                              ) : (
                                <>
                                  <Play className="w-5 h-5" />
                                  Marquer comme vu
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Mes Séries</h2>
              {shows.length > 0 && <span className="text-gray-600 dark:text-gray-400">{shows.length} série{shows.length > 1 ? 's' : ''}</span>}
            </div>

            {/* Barre de recherche et filtres */}
            {shows.length > 0 && (
              <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-300 dark:border-white/10 space-y-4">
                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={showsSearchQuery}
                    onChange={(e) => setShowsSearchQuery(e.target.value)}
                    placeholder="Rechercher dans mes séries..."
                    className="w-full bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Filtres et tri */}
                <div className="flex flex-wrap gap-3">
                  {/* Tri */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none px-4 py-2 pr-10 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer font-semibold shadow-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="added">➕ Date d'ajout</option>
                    <option value="name">🔤 Nom (A-Z)</option>
                    <option value="progress">📊 Progression</option>
                    <option value="next">📅 Prochain épisode</option>
                  </select>

                  {/* Filtre qualité */}
                  <select
                    value={filterQuality}
                    onChange={(e) => setFilterQuality(e.target.value)}
                    className="appearance-none px-4 py-2 pr-10 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer font-semibold shadow-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="all">Toutes qualités</option>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4K">4K</option>
                  </select>

                  {/* Filtre statut */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none px-4 py-2 pr-10 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer font-semibold shadow-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="all">Tous statuts</option>
                    <option value="watching">En cours</option>
                    <option value="completed">Terminées</option>
                    <option value="upcoming">À venir</option>
                    <option value="backlog">En retard</option>
                    <option value="hiatus">En pause</option>
                  </select>

                  {/* Reset */}
                  {(showsSearchQuery || sortBy !== 'added' || filterQuality !== 'all' || filterStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setShowsSearchQuery('');
                        setSortBy('added');
                        setFilterQuality('all');
                        setFilterStatus('all');
                      }}
                      className="px-4 py-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold"
                    >
                      ✕ Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            )}

            {shows.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-300 dark:border-white/10">
                <Plus className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-xl font-semibold mb-2">Aucune série</p>
                <p className="text-gray-600 dark:text-gray-400">Recherchez et ajoutez vos séries préférées</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-4">
                {filteredShows.map(show => {
                    const stats = getShowStats(show.tvmazeId, show.quality);
                    return (
                      <ShowCard
                        key={show.id}
                        show={show}
                        stats={stats}
                        onShowClick={openShowDetails}
                        onRemoveShow={removeShow}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de détails de série */}
      {selectedShowDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={closeShowDetails}>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-300 dark:border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-64 overflow-hidden rounded-t-3xl">
              <CachedImage
                src={selectedShowDetail.backgroundTMDB || selectedShowDetail.background || selectedShowDetail.poster || 'https://via.placeholder.com/1200x400/1a1a1a/ffffff?text=No+Image'}
                alt={selectedShowDetail.title}
                className="w-full h-full object-cover"
                fallback={selectedShowDetail.poster || 'https://via.placeholder.com/1200x400/1a1a1a/ffffff?text=No+Image'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-100 via-gray-100/50 to-transparent dark:from-gray-900 dark:via-gray-900/50 dark:to-transparent"></div>

              <button onClick={closeShowDetails} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <h2 className="text-4xl font-bold mb-2">{selectedShowDetail.title}</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{selectedShowDetail.year}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedShowDetail.quality === '4K' ? 'bg-purple-600/30 text-purple-400' :
                    selectedShowDetail.quality === '1080p' ? 'bg-green-600/30 text-green-400' : 'bg-blue-600/30 text-blue-400'
                  }`}>{selectedShowDetail.quality}</span>
                  {selectedShowDetail.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{selectedShowDetail.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {(selectedShowDetail.overviewFR || selectedShowDetail.overview) && (
                <div>
                  <h3 className="text-xl font-bold mb-3 text-purple-400">Synopsis</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedShowDetail.overviewFR || selectedShowDetail.overview}
                  </p>
                </div>
              )}

              {/* Informations série */}
              {selectedShowDetail.enrichedDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-100 dark:bg-white/5 rounded-xl p-4 border border-gray-300 dark:border-white/10">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Statut</p>
                    <p className="font-bold">{selectedShowDetail.enrichedDetails.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                    <p className="font-bold">{selectedShowDetail.enrichedDetails.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saisons</p>
                    <p className="font-bold">{selectedShowDetail.enrichedDetails.numberOfSeasons}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Épisodes</p>
                    <p className="font-bold">{selectedShowDetail.enrichedDetails.numberOfEpisodes}</p>
                  </div>
                </div>
              )}

              {/* Genres et réseaux */}
              {selectedShowDetail.enrichedDetails && (
                <div className="space-y-3">
                  {selectedShowDetail.enrichedDetails.genres.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedShowDetail.enrichedDetails.genres.map(genre => (
                          <span key={genre} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedShowDetail.enrichedDetails.networks.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Réseaux</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedShowDetail.enrichedDetails.networks.map(network => (
                          <span key={network} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                            {network}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Liens externes */}
              {selectedShowDetail.enrichedDetails?.externalIds && (
                <div>
                  <h3 className="text-xl font-bold mb-3 text-purple-400">Liens externes</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedShowDetail.enrichedDetails.externalIds.imdbId && (
                      <a
                        href={`https://www.imdb.com/title/${selectedShowDetail.enrichedDetails.externalIds.imdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-semibold hover:bg-yellow-500/30 transition-all"
                      >
                        IMDb
                      </a>
                    )}
                    {selectedShowDetail.enrichedDetails.homepage && (
                      <a
                        href={selectedShowDetail.enrichedDetails.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-semibold hover:bg-green-500/30 transition-all"
                      >
                        Site officiel
                      </a>
                    )}
                    {selectedShowDetail.enrichedDetails.externalIds.tvdbId && (
                      <a
                        href={`https://www.thetvdb.com/?tab=series&id=${selectedShowDetail.enrichedDetails.externalIds.tvdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/30 transition-all"
                      >
                        TheTVDB
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Acteurs principaux */}
              {(selectedShowDetail.cast?.length > 0 || selectedShowDetail.enrichedDetails?.cast?.length > 0) && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-purple-400">Acteurs principaux</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(selectedShowDetail.enrichedDetails?.cast || selectedShowDetail.cast || []).map(actor => (
                      <div key={actor.id} className="bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 hover:border-purple-500/50 transition-all">
                        <CachedImage
                          src={actor.profilePath || 'https://via.placeholder.com/185x278/1a1a1a/ffffff?text=No+Photo'}
                          alt={actor.name}
                          className="w-full aspect-[2/3] object-cover"
                          fallback="https://via.placeholder.com/185x278/1a1a1a/ffffff?text=No+Photo"
                        />
                        <div className="p-3">
                          <p className="font-bold text-sm truncate">{actor.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{actor.character}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold mb-4 text-purple-400">Saisons ({selectedShowDetail.quality})</h3>
                {(() => {
                  const showEpisodes = getShowEpisodesFiltered(selectedShowDetail.tvmazeId, selectedShowDetail.quality);

                  // Grouper par saison
                  const seasonGroups = {};
                  showEpisodes.forEach(ep => {
                    if (!seasonGroups[ep.season]) {
                      seasonGroups[ep.season] = [];
                    }
                    seasonGroups[ep.season].push(ep);
                  });

                  const seasons = Object.keys(seasonGroups).map(Number).sort((a, b) => b - a);

                  // Fonction pour marquer toute une saison
                  const markSeasonAsWatched = (season, watched) => {
                    const newWatched = { ...watchedEpisodes };
                    seasonGroups[season].forEach(ep => {
                      newWatched[ep.id] = watched;
                    });
                    setWatchedEpisodes(newWatched);
                  };

                  // Déterminer la saison en cours (celle avec des épisodes non vus et au moins un épisode passé)
                  const currentSeason = seasons.find(season => {
                    const seasonEpisodes = seasonGroups[season];
                    // Une saison est "en cours" si elle a au moins un épisode non vu
                    // ET au moins un épisode déjà diffusé (passé)
                    const hasUnwatched = seasonEpisodes.some(ep => !watchedEpisodes[ep.id]);
                    const hasPastEpisode = seasonEpisodes.some(ep => isPast(ep.airDate));
                    return hasUnwatched && hasPastEpisode;
                  });

                  return (
                    <div className="space-y-4">
                      {seasons.map(season => {
                        const episodes = seasonGroups[season];
                        const watchedCount = episodes.filter(ep => watchedEpisodes[ep.id]).length;
                        const totalCount = episodes.length;
                        const progress = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
                        const allWatched = watchedCount === totalCount;

                        // Inverser l'ordre des épisodes uniquement pour la saison en cours
                        const isCurrentSeason = season === currentSeason;
                        const displayEpisodes = isCurrentSeason ? [...episodes].reverse() : episodes;

                        return (
                          <div key={season} className="bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-300 dark:border-white/10 overflow-hidden">
                            <div className="p-4 bg-gray-200 dark:bg-white/5 border-b border-gray-300 dark:border-white/10">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold mb-2">
                                    Saison {season}
                                    {isCurrentSeason && <span className="ml-2 text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">En cours</span>}
                                  </h4>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="w-full bg-gray-300 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                                          style={{ width: `${progress}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                      {watchedCount}/{totalCount} ({progress}%)
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markSeasonAsWatched(season, !allWatched);
                                  }}
                                  className={`ml-4 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                    allWatched
                                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                      : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                                  }`}
                                >
                                  {allWatched ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Tout vu
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Marquer tout
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="p-4 space-y-2">
                              {displayEpisodes.map(episode => {
                                const isWatched = watchedEpisodes[episode.id];
                                const isFuture = !isPast(episode.airDate);
                                return (
                                  <div
                                    key={episode.id}
                                    onClick={() => toggleWatched(episode.id)}
                                    className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      isWatched ? 'bg-green-500/10 border-green-500/50' : 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 hover:border-purple-500/50'
                                    }`}
                                  >
                                    <img
                                      src={episode.image || 'https://via.placeholder.com/160x90/2d3748/ffffff?text=No+Image'}
                                      alt={episode.title}
                                      className="w-28 h-16 rounded-lg object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-1">
                                        <h5 className="font-bold text-sm truncate">
                                          E{String(episode.episode).padStart(2, '0')} - {episode.title}
                                        </h5>
                                        {isWatched && <Check className="w-4 h-4 text-green-400 flex-shrink-0 ml-2" />}
                                      </div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{episode.overview}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-500">📅 {episode.airDate}</span>
                                        {isFuture && <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">À venir</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {seasons.length === 0 && (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Aucun épisode trouvé</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal du jour - Tous les épisodes d'une date */}
      {selectedDayEpisodes && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={closeDayModal}>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-300 dark:border-white/20" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-300 dark:border-white/10 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-1">
                    {formatDate(selectedDayEpisodes.date.toISOString().split('T')[0])}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{selectedDayEpisodes.episodes.length} épisode{selectedDayEpisodes.episodes.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={closeDayModal} className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white p-3 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Liste des épisodes */}
            <div className="p-6 space-y-4">
              {selectedDayEpisodes.episodes.map(episode => {
                const isWatched = watchedEpisodes[episode.id];
                const show = shows.find(s => s.tvmazeId === episode.showId && s.quality === episode.quality);
                return (
                  <div
                    key={episode.id}
                    onClick={() => toggleWatched(episode.id)}
                    className={`bg-white dark:bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border transition-all cursor-pointer hover:scale-[1.02] ${
                      isWatched ? 'border-green-500/50 bg-green-500/10' : 'border-gray-300 dark:border-white/10 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex gap-4 p-4">
                      <div className="relative flex-shrink-0">
                        <CachedImage
                          src={show?.poster || 'https://via.placeholder.com/200x300/2d3748/ffffff?text=No+Poster'}
                          alt={episode.showTitle}
                          className={`w-32 aspect-[2/3] rounded-lg object-cover transition-opacity ${isWatched ? 'opacity-50' : ''}`}
                          fallback="https://via.placeholder.com/200x300/2d3748/ffffff?text=No+Poster"
                        />
                        {isWatched && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-green-500 rounded-full p-3">
                              <Check className="w-8 h-8" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-purple-300 truncate">{episode.showTitle}</h3>
                            <p className="text-2xl font-bold truncate">
                              S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')} - {episode.title}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                            episode.quality === '4K' ? 'bg-purple-600/20 text-purple-400' :
                            episode.quality === '1080p' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
                          }`}>
                            {episode.quality}
                          </span>
                        </div>

                        {episode.overview && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{episode.overview}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>📅 {episode.airDate}</span>
                          {isWatched && (
                            <span className="text-green-400 flex items-center gap-1">
                              <Check className="w-4 h-4" />
                              Vu
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Update Notification */}
      <UpdateNotification ref={updateNotificationRef} />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Powered by <a href="https://www.tvmaze.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">TVMaze</a>
        </p>
      </footer>
    </div>
  );
};

export default App;