# Forum de Discussion Web

[![Déployé sur Render](https://img.shields.io/badge/Render-%46E3B7.svg?logo=render&logoColor=white)](https://votre-application.onrender.com)

Application de messagerie avec gestion de thème et modération

## 🚀 Déploiement

L'application est déployée sur Render :  
**URL de production** : [https://votre-application.onrender.com](https://votre-application.onrender.com)

## 💻 Développement local

### Prérequis
- Node.js v18+
- Navigateur moderne

### Structure du projet
```
.
├── client/
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── server/
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── .vscode/
├── README.md
├── Rapport.md
├── .env
├── .env.example
└── .gitignore
```

### Installation
1. Cloner le dépôt
```bash
git clone https://github.com/votre-utilisateur/forum-web.git
cd forum-web
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer l'environnement
```bash
cp .env.example .env
```

### Lancer l'application
```bash
npm start
```

L'application sera accessible sur : [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

Fichier `.env` :
```env
PORT=3000
MAX_MESSAGES=150
NODE_ENV=development
```

## 📚 Utilisation

### Fonctionnalités
- ✍️ Création de messages avec pseudo
- 🗑️ Suppression de messages
- 🔄 Actualisation automatique (30s)
- 🌗 Thème clair/sombre persistant
- 📱 Interface responsive
- 💬 Feedback utilisateur temps réel

### Commandes utiles
| Commande | Description |
|----------|-------------|
| `npm start` | Lance le serveur de production |
| `npm run dev` | Lance le serveur en mode développement |
| `npm test` | (À venir) Exécute les tests unitaires |

## 🌍 Déploiement

### Sur Render.com
1. Créer un nouveau "Web Service"
2. Connecter le dépôt GitHub
3. Configurer :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Ajouter les variables d'environnement :
   ```env
   PORT=10000
   MAX_MESSAGES=150
   NODE_ENV=production
   ```
5. Déployer !