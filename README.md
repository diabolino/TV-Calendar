# TV Calendar V2 🎬

Application de calendrier TV moderne et légère, construite avec **Tauri** + React + Vite.

## ✨ Nouveautés V2

- **95% plus léger** : ~15 MB au lieu de 360 MB (migration d'Electron vers Tauri)
- Démarrage plus rapide
- Consommation mémoire réduite
- Mêmes fonctionnalités, meilleures performances

## 🚀 Fonctionnalités

- 📺 Suivi de vos séries préférées
- 📅 Calendrier intelligent des épisodes
- ✅ Marquer les épisodes comme vus
- 🔄 Synchronisation cloud via Firebase
- 💾 Export/Import de vos données
- 🎨 Interface moderne et réactive
- 🌐 Données fournies par TVMaze API

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

## 🏗️ Stack Technique

- **Frontend** : React 18 + Vite 5
- **Desktop** : Tauri 2.x (Rust + WebView natif)
- **Styling** : Tailwind CSS
- **Backend** : Firebase (Auth + Firestore)
- **API** : TVMaze

## 📝 Licence

MIT

## 🙏 Crédits

- Données TV par [TVMaze](https://www.tvmaze.com/)
- Icônes par [Lucide](https://lucide.dev/)
