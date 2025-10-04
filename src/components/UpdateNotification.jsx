import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import axios from 'axios';
import packageJson from '../../package.json';

const UpdateNotification = forwardRef((props, ref) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showNoUpdateMessage, setShowNoUpdateMessage] = useState(false);

  useEffect(() => {
    checkForUpdates(false);
  }, []);

  const checkForUpdates = async (isManual = false) => {
    try {
      // Récupérer le package.json depuis GitHub
      const response = await axios.get(
        'https://raw.githubusercontent.com/diabolino/TV-Calendar/refs/heads/main/package.json',
        { timeout: 5000 }
      );

      const latestVersion = response.data.version;
      const currentVersion = packageJson.version;

      console.log(`Version actuelle: ${currentVersion}, Dernière version: ${latestVersion}`);

      // Comparer les versions
      if (isNewerVersion(latestVersion, currentVersion)) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: latestVersion,
          currentVersion: currentVersion
        });
        console.log('Mise à jour disponible:', latestVersion);
      } else if (isManual) {
        // Afficher le message "Vous êtes à jour" seulement si vérification manuelle
        setShowNoUpdateMessage(true);
        setTimeout(() => setShowNoUpdateMessage(false), 5000);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
      if (isManual) {
        // En cas d'erreur, informer l'utilisateur
        alert('Impossible de vérifier les mises à jour. Vérifiez votre connexion internet.');
      }
    }
  };

  // Comparer deux versions (format: X.Y.Z)
  const isNewerVersion = (latest, current) => {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    return false;
  };

  // Exposer la fonction checkForUpdates au parent via ref
  useImperativeHandle(ref, () => ({
    checkForUpdates: () => checkForUpdates(true)
  }));

  const openReleasePage = async () => {
    try {
      // Ouvrir la page des releases GitHub
      await openUrl(`https://github.com/diabolino/TV-Calendar/releases/tag/v${updateInfo.version}`);
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la page de release:', error);
    }
  };

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">Mise à jour disponible</h3>
              <p className="text-sm opacity-90">
                Version {updateInfo?.version} (actuelle: {updateInfo?.currentVersion})
              </p>
            </div>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <p className="text-sm mb-3 opacity-90">
            Une nouvelle version est disponible sur GitHub !
          </p>

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
      )}

      {showNoUpdateMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">✅ Vous êtes à jour !</h3>
              <p className="text-sm opacity-90">Aucune mise à jour disponible</p>
            </div>
            <button
              onClick={() => setShowNoUpdateMessage(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
});

export default UpdateNotification;
