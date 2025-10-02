// Service de gestion de la queue de synchronisation
const QUEUE_KEY = 'tv_calendar_sync_queue';

// Ajouter une opération à la queue
export const addToSyncQueue = (operation) => {
  try {
    const queue = getSyncQueue();
    queue.push({
      ...operation,
      timestamp: Date.now(),
      id: `${operation.type}_${Date.now()}_${Math.random()}`
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log('📝 Opération ajoutée à la queue de sync:', operation.type);
    return true;
  } catch (error) {
    console.error('❌ Erreur ajout à la queue:', error);
    return false;
  }
};

// Récupérer la queue de synchronisation
export const getSyncQueue = () => {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('❌ Erreur lecture queue:', error);
    return [];
  }
};

// Vider la queue de synchronisation
export const clearSyncQueue = () => {
  try {
    localStorage.removeItem(QUEUE_KEY);
    console.log('🧹 Queue de sync vidée');
    return true;
  } catch (error) {
    console.error('❌ Erreur vidage queue:', error);
    return false;
  }
};

// Supprimer une opération de la queue
export const removeFromSyncQueue = (operationId) => {
  try {
    const queue = getSyncQueue();
    const newQueue = queue.filter(op => op.id !== operationId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
    return true;
  } catch (error) {
    console.error('❌ Erreur suppression de la queue:', error);
    return false;
  }
};

// Traiter la queue de synchronisation
export const processSyncQueue = async (syncFunction) => {
  const queue = getSyncQueue();

  if (queue.length === 0) {
    console.log('✅ Queue de sync vide');
    return { success: true, processed: 0 };
  }

  console.log(`🔄 Traitement de ${queue.length} opérations en attente...`);

  let processed = 0;
  let failed = 0;

  for (const operation of queue) {
    try {
      // Exécuter la fonction de synchronisation avec les données de l'opération
      await syncFunction(operation.data);
      removeFromSyncQueue(operation.id);
      processed++;
      console.log(`✅ Opération ${operation.type} synchronisée`);
    } catch (error) {
      console.error(`❌ Échec sync opération ${operation.type}:`, error);
      failed++;

      // Retirer l'opération si elle a plus de 7 jours (éviter l'accumulation)
      if (Date.now() - operation.timestamp > 7 * 24 * 60 * 60 * 1000) {
        removeFromSyncQueue(operation.id);
        console.log(`🗑️ Opération expirée supprimée: ${operation.type}`);
      }
    }
  }

  console.log(`📊 Sync terminée: ${processed} réussies, ${failed} échouées`);

  return {
    success: failed === 0,
    processed,
    failed,
    remaining: getSyncQueue().length
  };
};

// Vérifier si la queue contient des opérations
export const hasPendingSync = () => {
  return getSyncQueue().length > 0;
};

// Obtenir le nombre d'opérations en attente
export const getPendingSyncCount = () => {
  return getSyncQueue().length;
};

export default {
  addToSyncQueue,
  getSyncQueue,
  clearSyncQueue,
  removeFromSyncQueue,
  processSyncQueue,
  hasPendingSync,
  getPendingSyncCount
};
