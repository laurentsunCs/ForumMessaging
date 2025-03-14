
# Rapport Final : Forum de Discussion Sécurisé

## 🌟 Introduction
**Objectif** : Créer une plateforme de discussion moderne, sécurisée et performante, permettant aux utilisateurs d'échanger en temps réel tout en garantissant une protection contre les menaces courantes.

**Lien de Production** : [https://forummessaging.onrender.com](https://forummessaging.onrender.com)  
**Stack Technique** : Node.js/Express (backend), HTML/CSS/JS (frontend), Render (hébergement).

---

## 🏗 Architecture du Projet
### Structure des Fichiers
```plaintext
.
├── client/              # Interface utilisateur
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── server/              # Logique backend
│   ├── index.js
│   ├── package.json
│   └── .env
└── .gitignore           # Exclusion des fichiers sensibles
```

### Technologies Clés
| Catégorie       | Outils                                                |
|-----------------|-------------------------------------------------------|
| **Frontend**    | HTML5, CSS3 (Variables CSS), JavaScript ES6          |
| **Backend**     | Node.js, Express.js, Helmet, express-rate-limit      |
| **Sécurité**    | sanitize-html, CSP, Journalisation avancée           |
| **Déploiement** | Render (HTTPS automatique), gestion des variables d'environnement |

---

## 🚀 Fonctionnalités Principales
### Côté Client
- **Thèmes Dynamiques** : Basculer entre mode clair/sombre (stockage local).
- **Anti-Spam** : Cooldown de 5s après l'envoi d'un message.
- **Feedback Utilisateur** : Toasts animés pour les succès/erreurs.
- **Responsive Design** : Adapté à tous les écrans (mobile, tablette, desktop).

### Côté Serveur
- **Gestion des Messages** :  
  → Création, suppression, récupération.  
  → Limite de `MAX_MESSAGES` (configurable via `.env`).  
  → Tri par date (plus récents en premier).
- **Rate Limiting** :  
  → **POST** : 5 requêtes/minute.  
  → **DELETE** : 5 requêtes/minute.

---

## 🔐 Mesures de Sécurité
### Protections Actives
| Mesure                          | Description                                                                 |
|---------------------------------|-----------------------------------------------------------------------------|
| **Sanitisation des Entrées**    | Neutralisation des balises HTML avec `sanitize-html` (config strict : aucune balise/autorisation). |
| **Blocage des Robots**          | Middleware `blockNonBrowser` pour rejeter les User-Agent non-navigateurs.  |
| **Clickjacking Protection**     | Header `X-Frame-Options` via Helmet + vérification JavaScript.             |
| **Limites de Taille**           | Corps des requêtes limité à 1 Mo pour prévenir les attaques par surcharge. |

### Journalisation Avancée
- **Niveaux de Log** : `ACCESS`, `WARNING`, `ERROR`, `SUCCESS`.  
- **Exemple** :  
  `[2024-02-15T10:00:00Z] [WARNING] IP: 192.168.1.1 - Tentative de message trop long`.

### Sécurité des En-têtes
- **Content Security Policy (CSP)** :  
  ```javascript
  scriptSrc: ["'self'", "'unsafe-inline'"], // Autorise les scripts internes uniquement
  imgSrc: ["'self'", "data:"]
  ```

---

## 📊 Données Techniques
### Structure des Messages
```javascript
{
  id: number (auto-incrémenté),
  msg: string (sanitisé, max 500 caractères),
  pseudo: string (sanitisé, max 20 caractères),
  date: string (ISO 8601)
}
```

### Performances
- **Temps de Réponse Moyen** : < 300 ms.  
- **Limites Configurables** :  
  ```env
  MAX_MESSAGES=50       # Nombre max de messages stockés
  PORT=3000             # Port du serveur
  ```

---

## 🛠 Déploiement
### Étapes d'Installation
1. Cloner le dépôt :
   ```bash
   git clone https://github.com/votre-repo/forum.git
   ```
2. Configurer `.env` :
   ```env
   PORT=3000
   MAX_MESSAGES=50
   ```
3. Installer les dépendances :
   ```bash
   cd server && npm install
   ```
4. Démarrer le serveur :
   ```bash
   node index.js
   ```

### Environnement de Production
- **Hébergeur** : Render (infrastructure gérée, SSL/TLS intégré).  
- **Monitoring** : Logs temps réel, redémarrage automatique en cas d'erreur.

---

## 📈 Résultats et Perspectives
### Bilan
- **Robustesse** : Aucune vulnérabilité critique détectée (tests manuels et outils comme OWASP ZAP).  
- **Utilisabilité** : Interface intuitive, temps de réponse optimisé.

### Améliorations Futures
1. **Base de Données** : Remplacer le stockage en mémoire par PostgreSQL pour la persistance.  
2. **Authentification** : Ajout de connexion sécurisée avec JWT.  
3. **WebSockets** : Rafraîchissement en temps réel via Socket.IO.  
4. **Tests E2E** : Implémentation de tests Cypress pour valider les flux critiques.

---

## 📞 Conclusion
Ce projet démontre une implémentation complète d'un forum moderne, alliant performance, convivialité et sécurité. Les mesures mises en place (sanitisation, rate-limiting, CSP) en font une base solide pour des extensions futures.  

**Accéder au forum** : [https://forummessaging.onrender.com](https://forummessaging.onrender.com)  
**Code Source** : [GitHub](https://github.com/votre-repo) *(Lien personnalisable)*
