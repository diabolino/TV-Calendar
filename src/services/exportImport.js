// src/services/exportImport.js

// Exporter les données en JSON
export const exportData = (shows, watchedEpisodes) => {
  try {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      shows: shows,
      watchedEpisodes: watchedEpisodes,
      stats: {
        totalShows: shows.length,
        totalWatched: Object.values(watchedEpisodes).filter(v => v).length
      }
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tv-calendar-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Export réussi:', data.stats);
    return true;
  } catch (error) {
    console.error('❌ Erreur export:', error);
    return false;
  }
};

// Importer les données depuis JSON
export const importData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validation
        if (!data.shows || !data.watchedEpisodes) {
          throw new Error('Format de fichier invalide');
        }
        
        console.log('✅ Import réussi:', {
          shows: data.shows.length,
          watched: Object.keys(data.watchedEpisodes).length,
          exportDate: data.exportDate
        });
        
        resolve({
          shows: data.shows,
          watchedEpisodes: data.watchedEpisodes,
          exportDate: data.exportDate
        });
      } catch (error) {
        console.error('❌ Erreur parsing JSON:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lecture fichier'));
    };
    
    reader.readAsText(file);
  });
};

// Exporter uniquement les séries
export const exportShows = (shows) => {
  const jsonString = JSON.stringify(shows, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `tv-calendar-shows-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Exporter uniquement les épisodes vus
export const exportWatched = (watchedEpisodes) => {
  const jsonString = JSON.stringify(watchedEpisodes, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `tv-calendar-watched-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
