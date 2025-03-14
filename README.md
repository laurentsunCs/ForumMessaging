# Application de Messagerie Web

Forum de discussion simple et moderne.

## Installation

1. Cloner le projet
2. Installer les dépendances :
```bash
cd server && npm install
```
3. Copier `.env.example` en `.env` :
```bash
cp .env.example .env
```

## Lancement

1. Démarrer le serveur :
```bash
cd server && npm start
```

2. Ouvrir `client/index.html` dans un navigateur

## Utilisation

- **Messages** : Écrire et envoyer des messages avec un pseudo
- **Actualisation** : Automatique (30s) ou manuelle via le bouton
- **Thème** : Basculer entre mode clair/sombre
- **Suppression** : Bouton sous chaque message

## Configuration

Fichier `.env` :
```
PORT=5555              # Port du serveur
HOST=localshot         # Host du serveur
MAX_MESSAGES=100       # Limite de messages
``` 