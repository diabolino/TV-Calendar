# Configuration du projet TV Calendar

## Variables d'environnement

Ce projet utilise des variables d'environnement pour stocker des clés API sensibles.

### Configuration locale (développement)

1. Copiez le fichier `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Éditez le fichier `.env` et remplacez les valeurs d'exemple par vos vraies clés :
   - TMDB : Obtenez une clé gratuite sur https://www.themoviedb.org/settings/api
   - Firebase : Copiez depuis https://console.firebase.google.com/

### Configuration GitHub Actions (production)

Pour que les builds automatiques fonctionnent, vous devez ajouter toutes les clés comme secrets GitHub :

1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Secrets and variables** → **Actions**
4. Cliquez sur **New repository secret** pour créer chaque secret :

**Secrets TMDB :**
- `VITE_TMDB_API_KEY` → Votre clé API TMDB

**Secrets Firebase :**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Le workflow GitHub Actions créera automatiquement le fichier `.env` lors du build avec ces secrets.

> **Note V3.0.7+** : Le plugin `tauri-plugin-updater` et les signatures ont été supprimés. Plus besoin de `TAURI_SIGNING_PRIVATE_KEY`.

## Sécurité

⚠️ **IMPORTANT** :
- Le fichier `.env` est dans `.gitignore` et ne sera JAMAIS commité
- Ne partagez jamais votre clé API publiquement
- Les secrets GitHub sont chiffrés et sécurisés
