# Installation sur Windows 🪟

L'application n'étant pas signée avec un certificat Microsoft, Windows SmartScreen affichera un avertissement.

## ✅ Comment installer l'application

### 1. Télécharger l'installateur

Téléchargez le fichier `.exe` depuis [Releases](https://github.com/diabolino/TV-Calendar/releases)

### 2. Contourner SmartScreen

Lorsque Windows affiche **"Windows a protégé votre ordinateur"** :

1. Cliquez sur **"Informations complémentaires"**
2. Cliquez sur **"Exécuter quand même"**

![Windows SmartScreen](https://i.imgur.com/SmartScreen.png)

### 3. Installer normalement

Suivez les étapes de l'installateur NSIS.

## 🔒 Pourquoi ce message ?

L'application est compilée sur GitHub Actions et n'est pas signée avec un certificat de signature de code Microsoft (300-500$/an).

L'app est **100% sûre** :
- ✅ Code source public sur GitHub
- ✅ Compilé automatiquement par GitHub Actions
- ✅ Aucun malware, aucun virus

## 📦 Versions disponibles

- **NSIS Installer** (`.exe`) : Installation classique avec désinstallateur
- **MSI** : Package Windows Installer (pour déploiements IT)

## ❓ Questions fréquentes

**Q : Pourquoi pas de signature de code ?**
R : Un certificat Microsoft coûte 300-500$/an. Le projet étant open-source et gratuit, ce coût n'est pas justifié.

**Q : Comment vérifier que c'est sûr ?**
R : Le code source est disponible sur GitHub. Vous pouvez le compiler vous-même ou vérifier sur VirusTotal.

**Q : L'antivirus bloque l'installation**
R : Ajoutez une exception dans votre antivirus pour `TVCalendar.exe`

---

**Besoin d'aide ?** Ouvrez une issue sur [GitHub](https://github.com/diabolino/TV-Calendar/issues)
