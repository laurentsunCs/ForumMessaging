# Rapport Technique - Application de Messagerie Web

## 1. Architecture Globale

### 1.1 Backend (Node.js/Express)
- Port 5555 configurable
- API RESTful avec routes GET
- CORS activé pour les requêtes cross-origin
- Stockage en mémoire (non persistant)

### 1.2 Frontend (HTML5/CSS3/JS)
- Application web statique
- Interface responsive et moderne
- Support thèmes clair/sombre
- Pas de dépendances externes

## 2. Structure des Données

```javascript
{
    id: number,          // Identifiant unique
    msg: string,         // Contenu
    pseudo: string,      // Auteur
    date: string         // Date ISO
}
```

## 3. API et Routes

- `GET /msg/get/:id` : Lecture message
- `GET /msg/getAll` : Liste messages
- `GET /msg/nber` : Nombre total
- `GET /msg/post/:message` : Création
- `GET /msg/del/:id` : Suppression

Réponses : `{ code: 1, ... }` (succès) ou `{ code: 0 }` (erreur)

## 4. Fonctionnalités Principales

### 4.1 Gestion Messages
- CRUD complet des messages
- Actualisation auto (30s) et manuelle
- Validation temps réel
- Compteur de messages

### 4.2 Interface
- Design responsive deux colonnes
- Thèmes personnalisables
- Animations et transitions
- États de chargement

### 4.3 Gestion Erreurs
- Traitement silencieux
- Messages utilisateur élégants
- Reconnexion automatique
- Logging console

## 5. Sécurité et Limitations

### 5.1 Implémenté
- Validation serveur
- Encodage caractères spéciaux
- Protection injections
- Variables d'environnement (.env)
- Exclusion fichiers sensibles (.gitignore)
- Gestion états concurrents

### 5.2 À Améliorer
- Authentification
- Persistance données
- Validation client
- WebSocket temps réel

## 6. Évolutions Futures

### Court Terme
- Persistance données
- Validation renforcée
- Pagination résultats

### Long Terme
- Authentification
- Fichiers attachés
- Modération
- WebSocket 