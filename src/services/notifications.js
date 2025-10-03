// Service de notifications desktop pour Tauri
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { parseEpisodeDate } from '../utils/dateHelpers';

// Demander la permission pour les notifications
export const requestNotificationPermission = async () => {
  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    return permissionGranted;
  } catch (error) {
    console.error('❌ Erreur demande permission notifications:', error);
    return false;
  }
};

// Envoyer une notification pour un nouvel épisode
export const notifyNewEpisode = async (episode, showTitle) => {
  try {
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      console.warn('⚠️ Permission notifications refusée');
      return false;
    }

    await sendNotification({
      title: `${showTitle} - Nouvel épisode !`,
      body: `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')} - ${episode.title}`,
      icon: 'icons/128x128.png'
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    return false;
  }
};

// Envoyer une notification groupée pour plusieurs épisodes
export const notifyMultipleEpisodes = async (count, timeframe = '24h') => {
  try {
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      return false;
    }

    await sendNotification({
      title: `${count} épisode${count > 1 ? 's' : ''} à venir !`,
      body: `Dans les prochaines ${timeframe}`,
      icon: 'icons/128x128.png'
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    return false;
  }
};

// Vérifier les nouveaux épisodes et notifier
export const checkAndNotifyNewEpisodes = async (calendar, lastCheck, watchedEpisodes) => {
  try {
    const now = new Date();
    const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Trouver les épisodes diffusés depuis le dernier check
    const newEpisodes = calendar.filter(ep => {
      const airDate = parseEpisodeDate(ep);
      return airDate > lastCheckDate && airDate <= now && !watchedEpisodes[ep.id];
    });

    if (newEpisodes.length === 0) {
      return { notified: 0, episodes: [] };
    }

    // Notifier pour chaque épisode (max 5 pour éviter le spam)
    const toNotify = newEpisodes.slice(0, 5);

    for (const episode of toNotify) {
      await notifyNewEpisode(episode, episode.showTitle);
      // Petit délai entre les notifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Si plus de 5, envoyer une notification groupée
    if (newEpisodes.length > 5) {
      await notifyMultipleEpisodes(newEpisodes.length - 5, 'récemment');
    }

    return { notified: newEpisodes.length, episodes: newEpisodes };
  } catch (error) {
    console.error('❌ Erreur check notifications:', error);
    return { notified: 0, episodes: [] };
  }
};

// Notifier pour les épisodes à venir dans les 24h
export const notifyUpcoming24h = async (calendar, watchedEpisodes) => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = calendar.filter(ep => {
      const airDate = parseEpisodeDate(ep);
      return airDate > now && airDate <= in24h && !watchedEpisodes[ep.id];
    });

    if (upcoming.length > 0) {
      await notifyMultipleEpisodes(upcoming.length, '24h');
      return upcoming.length;
    }

    return 0;
  } catch (error) {
    console.error('❌ Erreur notification 24h:', error);
    return 0;
  }
};
