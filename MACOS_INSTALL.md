# Installation sur macOS 🍎

L'application n'étant pas signée par Apple, macOS Gatekeeper bloquera l'ouverture par défaut.

## ✅ Méthode 1 : Clic droit (Recommandée)

1. Téléchargez le fichier `.dmg`
2. Double-cliquez pour monter le volume
3. Glissez `TVCalendar.app` dans Applications
4. **Faites un clic droit** sur l'app → **Ouvrir**
5. Cliquez sur **Ouvrir** dans la boîte de dialogue

✨ Vous n'aurez à faire cette manipulation qu'une seule fois !

## ✅ Méthode 2 : Terminal (Alternative)

```bash
# Retirer la quarantaine de l'application
xattr -cr /Applications/TVCalendar.app

# Puis lancez l'app normalement
open /Applications/TVCalendar.app
```

## ❓ Pourquoi ce message ?

L'application est compilée sur GitHub Actions et n'est pas signée avec un certificat Apple Developer (99$/an).

L'app est **100% sûre** - le code source est disponible publiquement sur GitHub.

## 🔒 Vérifier l'intégrité (optionnel)

```bash
# Vérifier les permissions de l'app
codesign -dvv /Applications/TVCalendar.app
```

---

**Besoin d'aide ?** Ouvrez une issue sur [GitHub](https://github.com/diabolino/TV-Calendar/issues)
