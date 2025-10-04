# Système de Mise à Jour

## Vue d'ensemble

Depuis la version 3.0.7, TV Calendar utilise un **système de vérification de version simplifié** sans signatures ni fichiers `.sig`.

## Comment ça fonctionne

### Vérification automatique

1. **Au démarrage**: L'application vérifie automatiquement les mises à jour
2. **Comparaison**: Compare la version locale avec `package.json` sur GitHub
3. **Notification**: Si une nouvelle version existe, affiche une notification en bas à droite
4. **Action manuelle**: L'utilisateur télécharge manuellement depuis GitHub Releases

### Composants

- **Frontend**: [src/components/UpdateNotification.jsx](src/components/UpdateNotification.jsx)
- **Endpoint**: `https://raw.githubusercontent.com/diabolino/TV-Calendar/refs/heads/main/package.json`
- **Pas de backend Tauri** : Le plugin `tauri-plugin-updater` a été supprimé

### GitHub Actions

Le workflow [.github/workflows/tauri-build.yml](.github/workflows/tauri-build.yml) génère automatiquement:
- ✅ Fichiers binaires pour chaque plateforme (DMG, EXE, AppImage, DEB)
- ✅ Release GitHub avec assets
- ❌ ~~Pas de fichier `latest.json`~~ (supprimé)
- ❌ ~~Pas de fichiers `.sig`~~ (supprimé)

## Pourquoi ce changement ?

**Avantages du système actuel :**
- ✅ Pas de complexité de signatures cryptographiques
- ✅ Pas de gestion de clés privées
- ✅ Builds plus rapides (pas de génération de `.sig`)
- ✅ Notification visible pour l'utilisateur
- ✅ Contrôle total sur le téléchargement

**Inconvénients :**
- ⚠️ L'utilisateur doit télécharger et installer manuellement
- ⚠️ Pas de vérification cryptographique de l'intégrité

## Vérification manuelle

L'utilisateur peut également vérifier manuellement :
1. Cliquer sur le bouton "Vérifier les mises à jour" dans la notification
2. Si une mise à jour existe → bouton "Télécharger" ouvre GitHub Releases
3. Télécharger et installer la nouvelle version

## Fichiers supprimés (V3.0.7+)

Ces fichiers/configurations ont été supprimés :
- ❌ `tauri-plugin-updater` (Cargo.toml, lib.rs)
- ❌ Section `plugins.updater` (tauri.conf.json)
- ❌ Fichiers `.sig` (plus générés)
- ❌ `latest.json` (plus généré)
- ❌ Secret `TAURI_SIGNING_PRIVATE_KEY` (GitHub Actions)

## Migration depuis V2.x

Si vous utilisez une ancienne version avec l'auto-updater Tauri :
1. La notification de mise à jour vous informera de la V3
2. Téléchargez manuellement depuis GitHub Releases
3. Installez la nouvelle version
4. Le nouveau système sera actif automatiquement

## Désactivation

Pour désactiver les notifications de mise à jour, commentez cette ligne dans [src/App.jsx](src/App.jsx) :
```javascript
// <UpdateNotification />
```
