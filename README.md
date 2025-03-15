# Forum de Discussion Web

[![Déployé sur Render](https://img.shields.io/badge/Render-%46E3B7.svg?logo=render&logoColor=white)](https://forummessaging.onrender.com/)

Application de messagerie avec gestion de thème et modération

## 🚀 Déploiement

L'application est déployée sur Render :  
**URL de production** : [https://forummessaging.onrender.com/](https://forummessaging.onrender.com/)

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
git clone https://github.com/laurentsunCs/ForumMessaging
cd server
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
# Configuration du serveur
PORT=3000
REQUEST_SIZE_LIMIT=1mb    # Limite de taille des requêtes

# Limites des messages
MAX_MESSAGES=10          # Nombre maximum de messages dans l'historique
MAX_MESSAGE_LENGTH=500   # Longueur maximale d'un message
MAX_PSEUDO_LENGTH=30    # Longueur maximale d'un pseudo

# Limites de requêtes
POST_RATE_LIMIT=5     # Nombre maximum de messages par minute
DELETE_RATE_LIMIT=5     # Nombre maximum de suppressions par minute
```

## 📚 Utilisation

### Fonctionnalités
- ✍️ Création de messages avec pseudo
- 🗑️ Suppression de messages
- 🔄 Actualisation automatique (30s)
- 🌗 Thème clair/sombre persistant
- 📱 Interface responsive
- 💬 Feedback utilisateur temps réel

### Limites et Sécurité
- 🛡️ Protection contre le spam :
  - Maximum 10 messages par minute par utilisateur
  - Maximum 20 messages par minute par sous-réseau
  - Délai minimum de 1 seconde entre les messages
  - Maximum 3 messages similaires autorisés
  - Maximum 3 requêtes en 5 secondes (anti-burst)
- 📝 Limites des messages :
  - Maximum 500 caractères par message
  - Maximum 30 caractères pour le pseudo
  - Maximum 150 messages dans l'historique
- 🚫 Restrictions d'accès :
  - Blocage des requêtes non-navigateur
  - Sanitization des entrées HTML
  - Rate limiting par IP et sous-réseau
- 🔒 Protection contre les attaques :
  - Détection des rafales de requêtes
  - Limitation par sous-réseau (/24)
  - Protection CORS et CSP configurée

### Commandes utiles
| Commande | Description |
|----------|-------------|
| `npm start` | Lance le serveur de production |
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