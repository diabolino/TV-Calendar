# TV Calendar V3 🎬

Application de calendrier TV moderne et légère, construite avec **Tauri** + React + Vite.

## ✨ Nouveautés V3

### 🌍 Traduction automatique des résumés d'épisodes
- Synopsis des épisodes automatiquement traduits en français
- 3 niveaux de traduction intelligente :
  - **🇫🇷 TMDB** : Traductions officielles en priorité
  - **✨ Auto** : Traduction automatique via LibreTranslate si nécessaire
  - **🇬🇧 Original** : Texte anglais si aucune traduction disponible
- Indicateurs visuels pour identifier la source de traduction
- Support LibreTranslate auto-hébergé

### 🎭 Détails enrichis des séries
- Acteurs principaux avec photos et rôles
- Affichage limité à 5 acteurs avec bouton "Voir plus"
- Genres, réseaux, statut de production
- Liens externes (IMDb, TheTVDB, réseaux sociaux)
- Synopsis complets dans les modales

### 📊 Modes de filtrage avancés
- **Mode Backlog** : Séries avec épisodes en retard
- **Mode Hiatus** : Séries en pause sans épisodes futurs
- Filtres par statut (En cours, Terminé, À venir)

### ⚡ Performance et cache
- Web Workers pour filtrage/tri non-bloquant
- Cache IndexedDB avec TTL de 7 jours
- Traductions mises en cache avec les épisodes
- Mode offline robuste

### 🎨 Interface améliorée
- Dashboard avec statistiques détaillées
- Raccourcis clavier pour navigation rapide
- Optimisation pour grands écrans (jusqu'à 8 colonnes)
- Système de couleurs unique par série
- Mode clair/sombre

### 🔧 Corrections importantes
- Fix timezone robuste (UTC via airstamp)
- Suppression complète des séries (cache + historique)
- Auto-updater fonctionnel avec notifications

## 🚀 Fonctionnalités principales

- 📺 Suivi de vos séries préférées (multi-qualité : 720p, 1080p, 4K)
- 📅 Calendrier intelligent des épisodes (vue mensuelle/hebdomadaire)
- ✅ Marquer les épisodes comme vus
- 🔄 Synchronisation cloud via Firebase
- 💾 Export/Import de vos données
- 🌍 Traduction automatique des résumés en français
- 🎨 Interface moderne et réactive
- 🌐 Données fournies par TVMaze API et TMDB

## 📦 Téléchargement

Téléchargez la dernière version depuis [Releases](https://github.com/diabolino/TV-Calendar/releases)

- **Windows** : `.exe` (installer NSIS) ou `.msi` - [📖 Guide d'installation](WINDOWS_INSTALL.md)
- **macOS** : `.dmg` - [📖 Guide d'installation](MACOS_INSTALL.md)
- **Linux** : `.AppImage` ou `.deb`

> ⚠️ **Note** : L'application n'est pas signée numériquement. Windows et macOS afficheront un avertissement de sécurité (c'est normal). Consultez les guides d'installation ci-dessus.

## 🛠️ Développement

### Prérequis

- Node.js 20+
- Rust (installé automatiquement via rustup)

### Installation

```bash
# Cloner le repo
git clone https://github.com/diabolino/TV-Calendar.git
cd TV-Calendar

# Copier le fichier d'environnement
cp .env.example .env

# Configurer vos clés API dans .env
# - VITE_TMDB_API_KEY : Clé API TMDB (https://www.themoviedb.org/settings/api)
# - VITE_FIREBASE_* : Configuration Firebase (pour sync cloud)

# Installer les dépendances
npm install

# Lancer en mode dev
npm run tauri:dev
```

### Build

```bash
# Build de production
npm run tauri:build

# Build de debug (plus rapide)
npm run tauri:build:debug
```

### Configuration de la traduction automatique

La traduction automatique se configure directement dans l'application :

1. Cliquez sur l'icône ⚙️ **Paramètres** dans la barre de navigation
2. Saisissez l'URL de votre serveur LibreTranslate
3. Cliquez sur **Sauvegarder**
4. Rechargez vos séries pour appliquer les traductions

**Options LibreTranslate :**
- Instance publique (limitée) : `https://libretranslate.com/translate`
- Auto-hébergé avec Docker :
  ```bash
  docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
  ```
  URL locale : `http://localhost:5000/translate`

💡 **Note** : Laissez le champ vide pour désactiver la traduction automatique. Seules les traductions officielles TMDB seront utilisées.

## 🏗️ Stack Technique

- **Frontend** : React 18 + Vite 5
- **Desktop** : Tauri 2.x (Rust + WebView natif)
- **Styling** : Tailwind CSS
- **Backend** : Firebase (Auth + Firestore)
- **APIs** : TVMaze + TMDB + LibreTranslate
- **Cache** : IndexedDB avec Web Workers

## 📝 Licence

MIT

## 🙏 Crédits

- Données TV par [TVMaze](https://www.tvmaze.com/)
- Métadonnées et traductions par [TMDB](https://www.themoviedb.org/)
- Traduction automatique par [LibreTranslate](https://libretranslate.com/)
- Icônes par [Lucide](https://lucide.dev/)
