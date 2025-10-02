// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,  // ← NOUVEAU
  signInWithEmailAndPassword        // ← NOUVEAU
} from 'firebase/auth'
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc,
  enableIndexedDbPersistence 
} from 'firebase/firestore';

// Configuration Firebase depuis les variables d'environnement
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Activer la persistance offline
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Persistance: Plusieurs onglets ouverts');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Persistance: Navigateur non supporté');
    }
  });
} catch (err) {
  console.error('Erreur persistance:', err);
}

// ==================== AUTH EMAIL PASS ====================

// Inscription
export const signUp = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Compte créé:', email);
    return result.user;
  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    throw error;
  }
};

// Connexion
export const signIn = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Connecté:', email);
    return result.user;
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    throw error;
  }
};

// Déconnexion (garder celle-ci)
export const logOut = async () => {
  try {
    await signOut(auth);
    console.log('✅ Déconnecté');
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    throw error;
  }
};

// Observer (garder)
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Utilisateur actuel (garder)
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Simplifier initAuth
export const initAuth = async () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// ==================== FIRESTORE - SÉRIES ====================

// Sauvegarder toutes les séries
export const saveShows = async (shows) => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ Utilisateur non connecté');
    return false;
  }

  try {
    console.log('💾 Sauvegarde de', shows.length, 'séries...');
    
    // Sauvegarder chaque série individuellement
    const promises = shows.map(show => 
      setDoc(doc(db, `users/${user.uid}/shows`, show.id), show)
    );
    
    await Promise.all(promises);
    console.log('✅ Séries sauvegardées sur Firebase');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde séries:', error);
    return false;
  }
};

// Charger toutes les séries
export const loadShows = async () => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ Utilisateur non connecté');
    return [];
  }

  try {
    console.log('📥 Chargement des séries depuis Firebase...');
    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/shows`));
    
    const shows = [];
    querySnapshot.forEach((doc) => {
      shows.push(doc.data());
    });
    
    console.log('✅', shows.length, 'séries chargées');
    return shows;
  } catch (error) {
    console.error('❌ Erreur chargement séries:', error);
    return [];
  }
};

// Supprimer une série
export const deleteShow = async (showId) => {
  const user = getCurrentUser();
  if (!user) return false;

  try {
    await deleteDoc(doc(db, `users/${user.uid}/shows`, showId));
    console.log('✅ Série supprimée de Firebase');
    return true;
  } catch (error) {
    console.error('❌ Erreur suppression série:', error);
    return false;
  }
};

// ==================== FIRESTORE - ÉPISODES VUS ====================

// Sauvegarder les épisodes vus
export const saveWatchedEpisodes = async (watchedEpisodes) => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ Utilisateur non connecté');
    return false;
  }

  try {
    console.log('💾 Sauvegarde des épisodes vus...');
    
    // Sauvegarder dans un seul document
    await setDoc(doc(db, `users/${user.uid}/data`, 'watchedEpisodes'), {
      episodes: watchedEpisodes,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Épisodes vus sauvegardés sur Firebase');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde épisodes vus:', error);
    return false;
  }
};

// Charger les épisodes vus
export const loadWatchedEpisodes = async () => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ Utilisateur non connecté');
    return {};
  }

  try {
    console.log('📥 Chargement des épisodes vus depuis Firebase...');
    const docSnap = await getDoc(doc(db, `users/${user.uid}/data`, 'watchedEpisodes'));
    
    if (docSnap.exists()) {
      console.log('✅ Épisodes vus chargés');
      return docSnap.data().episodes || {};
    } else {
      console.log('ℹ️ Aucun épisode vu enregistré');
      return {};
    }
  } catch (error) {
    console.error('❌ Erreur chargement épisodes vus:', error);
    return {};
  }
};

// ==================== SYNCHRONISATION ====================

// Synchroniser toutes les données
export const syncAllData = async (shows, watchedEpisodes) => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ Utilisateur non connecté - impossible de synchroniser');
    return false;
  }

  try {
    console.log('🔄 Synchronisation complète...');
    await Promise.all([
      saveShows(shows),
      saveWatchedEpisodes(watchedEpisodes)
    ]);
    console.log('✅ Synchronisation terminée');
    return true;
  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    return false;
  }
};

// Charger toutes les données
export const loadAllData = async () => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ Utilisateur non connecté');
    return { shows: [], watchedEpisodes: {} };
  }

  try {
    console.log('📥 Chargement complet des données...');
    const [shows, watchedEpisodes] = await Promise.all([
      loadShows(),
      loadWatchedEpisodes()
    ]);
    
    return { shows, watchedEpisodes };
  } catch (error) {
    console.error('❌ Erreur chargement données:', error);
    return { shows: [], watchedEpisodes: {} };
  }
};

export { auth, db };