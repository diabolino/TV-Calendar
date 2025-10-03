import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { openUrl } from '@tauri-apps/plugin-opener';

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update?.available) {
        setUpdateAvailable(true);
        setUpdateInfo(update);
        console.log('Update available:', update.version);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const openReleasePage = async () => {
    try {
      // Ouvrir la page des releases GitHub
      await openUrl(`https://github.com/diabolino/TV-Calendar/releases/tag/v${updateInfo.version}`);
    } catch (error) {
      console.error('Error opening release page:', error);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-lg">Mise à jour disponible</h3>
          <p className="text-sm opacity-90">Version {updateInfo?.version}</p>
        </div>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {updateInfo?.body && (
        <p className="text-sm mb-3 opacity-90">{updateInfo.body}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={openReleasePage}
          className="flex-1 bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-gray-100"
        >
          Télécharger
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="px-4 py-2 rounded border border-white hover:bg-blue-700"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
