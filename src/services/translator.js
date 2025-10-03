// Service de traduction avec LibreTranslate
import axios from 'axios';

/**
 * Récupérer l'URL LibreTranslate depuis localStorage
 */
export const getLibreTranslateURL = () => {
  return localStorage.getItem('libreTranslateURL') || '';
};

/**
 * Définir l'URL LibreTranslate dans localStorage
 */
export const setLibreTranslateURL = (url) => {
  if (url && url.trim()) {
    localStorage.setItem('libreTranslateURL', url.trim());
  } else {
    localStorage.removeItem('libreTranslateURL');
  }
};

/**
 * Traduire un texte de l'anglais vers le français avec LibreTranslate
 */
export const translateToFrench = async (text) => {
  if (!text || text.trim() === '') {
    return null;
  }

  const LIBRETRANSLATE_URL = getLibreTranslateURL();

  // Si pas d'URL configurée, ne pas traduire
  if (!LIBRETRANSLATE_URL) {
    console.log('⚠️ LibreTranslate non configuré, traduction désactivée');
    return null;
  }

  try {
    const response = await axios.post(LIBRETRANSLATE_URL, {
      q: text,
      source: 'en',
      target: 'fr',
      format: 'text'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 secondes max pour instance auto-hébergée
    });

    return response.data.translatedText || null;
  } catch (error) {
    console.error('❌ Erreur traduction LibreTranslate:', error.message);
    return null;
  }
};

/**
 * Détecter si un texte est en anglais (heuristique simple)
 */
export const isEnglish = (text) => {
  if (!text) return false;

  // Mots anglais courants qui n'existent pas en français
  const englishWords = /\b(the|this|that|with|from|have|when|where|after|before|episode|season)\b/i;

  return englishWords.test(text);
};

/**
 * Vérifier si deux textes sont identiques ou très similaires
 */
export const areSimilar = (text1, text2) => {
  if (!text1 || !text2) return false;

  const normalized1 = text1.toLowerCase().trim();
  const normalized2 = text2.toLowerCase().trim();

  return normalized1 === normalized2;
};

export default {
  translateToFrench,
  setLibreTranslateURL,
  getLibreTranslateURL,
  isEnglish,
  areSimilar
};
