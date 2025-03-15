### Rapport Technique : Forum de Discussion

---

#### **Structure du Projet**
```
├── client/              # Interface utilisateur
│   ├── index.html       # Structure HTML avec protection anti-clickjacking
│   ├── styles.css       # Styles CSS avec thème clair/sombre
│   └── script.js        # Logique client (envoi/suppression de messages)
├── server/              # Backend
│   ├── index.js         # Serveur Express avec sécurité et gestion des messages
│   ├── package.json     # Dépendances (express, helmet, etc.)
│   └── .env             # Variables d'environnement (PORT, limites, etc.)
└── .gitignore           # Exclusion des fichiers sensibles (node_modules, .env)
```

---

#### **Choix Techniques**

1. **Stockage des Messages**  
   - **Structure de données** : Tableau d'objets en mémoire (`allMsgs`).  
     Exemple :
     ```javascript
     {
       id: 2,
       msg: "CentraleSupelec Forever",
       pseudo: "Étudiant",
       date: "2023-10-20T12:34:56Z"
     }
     ```
   - **Limite** : Les messages sont perdus au redémarrage du serveur (choisi pour la simplicité).

2. **Sécurité**  
   - **Sanitisation** : `sanitize-html` pour bloquer les balises HTML.  
   - **Protection DDoS** :  
     - Rate limiting par sous-réseau (`SUBNET_MESSAGE_LIMIT: 20/min`).  
     - Détection de rafales (`BURST_DETECTION: 3 requêtes/5s`).  
   - **En-têtes** : Helmet pour CSP, COEP, et désactivation de X-Powered-By.  
   - **Anti-Spam** : Vérification des messages similaires (seuil de 80%) et intervalle minimal entre les messages (1s).

3. **Performance**  
   - **Auto-rafraîchissement** : Toutes les 30 secondes côté client.  
   - **Préchargement** : Scripts et styles optimisés pour le chargement.

4. **Accessibilité**  
   - Rôles ARIA (`role="main"`, `aria-live`).  
   - Thème clair/sombre avec persistance en `localStorage`.

---

#### **Déploiement**

- **Lien de Démo** : [https://forum-discussion-example.glitch.me](https://forum-discussion-example.glitch.me)  
- **Code Source** : [GitHub Repository](https://github.com/laurentsunCs/ForumMessaging)  
- **Replit** : [https://forummessaging.onrender.com/](https://forummessaging.onrender.com/)

---

#### **Améliorations Possibles**

- **Base de données** : Remplacer le stockage en mémoire par PostgreSQL/MongoDB.  
- **Authentification** : Ajouter un système de connexion avec JWT.  
- **WebSockets** : Rafraîchissement en temps réel via Socket.IO.  
- **Tests** : Implémenter des tests unitaires avec Jest.

---

#### **Aperçu**

![Capture d'écran du forum](https://via.placeholder.com/800x600.png?text=Forum+de+Discussion)  
*Interface utilisateur avec thème sombre et messages dynamiques.*