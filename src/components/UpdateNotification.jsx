import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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

  const installUpdate = async () => {
    if (!updateInfo) return;

    setDownloading(true);
    try {
      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            console.log('Download started');
            break;
          case 'Progress':
            setDownloadProgress(event.data.chunkLength);
            console.log(`Downloaded ${event.data.chunkLength} bytes`);
            break;
          case 'Finished':
            console.log('Download finished');
            break;
        }
      });

      // Restart the app after update
      await relaunch();
    } catch (error) {
      console.error('Error installing update:', error);
      setDownloading(false);
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
          disabled={downloading}
        >
          ✕
        </button>
      </div>

      {updateInfo?.body && (
        <p className="text-sm mb-3 opacity-90">{updateInfo.body}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={installUpdate}
          disabled={downloading}
          className="flex-1 bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? `Téléchargement... ${downloadProgress}` : 'Mettre à jour'}
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          disabled={downloading}
          className="px-4 py-2 rounded border border-white hover:bg-blue-700 disabled:opacity-50"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
