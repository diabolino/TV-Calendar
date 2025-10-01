# Auto-Update Documentation

## Configuration

L'auto-update est configuré via le plugin Tauri Updater.

### Configuration actuelle

- **Endpoint**: `https://github.com/diabolino/TV-Calendar/releases/latest/download/latest.json`
- **Vérification**: Au démarrage de l'application
- **Signature**: Non configurée (pubkey vide)

### Fonctionnement

1. **Vérification automatique**: L'application vérifie les mises à jour au démarrage
2. **Notification**: Si une mise à jour est disponible, une notification apparaît en bas à droite
3. **Installation**: L'utilisateur peut choisir d'installer immédiatement ou plus tard
4. **Redémarrage**: Après installation, l'application redémarre automatiquement

### Composants

- **Backend**: Plugin `tauri-plugin-updater` dans `src-tauri/src/lib.rs`
- **Frontend**: Composant `UpdateNotification.jsx`
- **Configuration**: `src-tauri/tauri.conf.json`

### GitHub Actions

Le workflow `.github/workflows/tauri-build.yml` génère automatiquement:
- Les fichiers binaires pour chaque plateforme
- Le fichier `latest.json` requis pour l'updater
- La release GitHub avec tous les assets

### Notes de sécurité

⚠️ **Actuellement, la signature des mises à jour n'est pas activée** (`pubkey` est vide).

Pour activer la signature:

1. Générer une keypair:
```bash
npm run tauri signer generate -w ~/.tauri/tvcalendar.key
```

2. Copier la clé publique dans `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "VOTRE_CLE_PUBLIQUE_ICI"
    }
  }
}
```

3. Ajouter la clé privée comme secret GitHub:
   - Aller dans Settings → Secrets → Actions
   - Créer un nouveau secret `TAURI_PRIVATE_KEY`
   - Coller le contenu de `~/.tauri/tvcalendar.key`

4. Mettre à jour le workflow pour signer:
```yaml
- uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
```

### Test en local

Pour tester l'auto-update localement:

1. Compiler une version avec un numéro inférieur:
```bash
# Modifier version dans package.json et tauri.conf.json
npm run tauri:build
```

2. Installer cette version

3. Créer une nouvelle release sur GitHub avec un numéro supérieur

4. Lancer l'application installée → devrait détecter la mise à jour

### Désactivation

Pour désactiver l'auto-update, retirer le composant `<UpdateNotification />` de `App.jsx`.
