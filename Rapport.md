**Rapport Technique - Application de Messagerie Web (Version 2.1)**  
*(Mise à jour suite aux dernières modifications d'architecture)*  

---

### **1. Architecture Globale**  

#### **1.1 Backend (Node.js/Express)**  
- **Structure** :  
  - Dossier dédié `server/` avec séparation claire des responsabilités  
  - Serveur unique gérant à la fois :  
    - L'API REST via les routes `/msg/*`  
    - Le service des fichiers statiques du frontend (`client/`) via `express.static()`  
- **Port** : Configurable via `.env` (par défaut `3000`)  
- **Middlewares clés** :  
  - `cors()` avec origine `*` pour les requêtes cross-origin  
  - `helmet()` pour renforcer les en-têtes HTTP  
  - `sanitize-html` pour la purification des entrées utilisateur  
  - Gestion des routes SPA via `app.get('*', ...)` pour le routage côté client  

#### **1.2 Frontend (SPA - Single Page Application)**  
- **Structure** : Dossier `client/` avec fichiers statiques autonomes  
- **Caractéristiques SPA** :  
  - Mises à jour dynamiques via `fetch()` sans rechargement de page  
  - Routage virtuel géré par le serveur (toutes les routes non-API renvoient `index.html`)  
  - Gestion réactive du DOM avec `textContent` pour éviter les injections XSS  
- **Optimisations** :  
  - Actualisation automatique des messages (30s)  
  - Thèmes clair/sombre persistants via `localStorage`  
  - Feedback utilisateur via toasts animés (succès/erreur)  

---

### **2. Modifications Clés de l'API**  

| **Endpoint**         | **Méthode** | **Description**                                  | **Exemple de Requête**                    |  
|----------------------|-------------|--------------------------------------------------|-------------------------------------------|  
| `/msg/post`          | `POST`      | Crée un message avec validation et sanitization  | `{ message: "Hello", pseudo: "User" }`    |  
| `/msg/del/:id`       | `DELETE`    | Supprime un message par ID unique                | `DELETE /msg/del/42`                      |  

**Réponses Standardisées (Mises à Jour)** :  
```javascript  
// Succès  
{  
  code: 1,  
  data: { id: 42, msg: "Hello", pseudo: "User", date: "2024-01-01T12:00:00Z" }  
}  

// Erreur  
{  
  code: 0,  
  error: "Message non trouvé",  
  details: "ID 42 inexistant"  
}  
```  

---

### **3. Sécurité Renforcée**  

#### **Mesures Implémentées**  
| **Couche**       | **Technologie/Méthode**         | **Protection**                                  |  
|------------------|----------------------------------|------------------------------------------------|  
| **Transport**    | Helmet                           | Headers CSP, HSTS, XSS Filter                 |  
| **Validation**   | sanitize-html + textContent      | Neutralisation des scripts et balises HTML    |  
| **Architecture** | Isolation client/serveur         | Limitation des accès directs aux ressources   |  
| **UI**           | Désactivation proactive          | Prévention des actions concurrentes (ex: double-clic) |  

---

### **4. Évolutions Futures (Priorisées)**  

#### **Court Terme **  
- Persistance données
- Validation renforcée
- Pagination résultats

#### **Moyen Terme**
- Authentification
- Fichiers attachés
- Modération
- WebSocket

---

### **5. Déploiement sur Render**  
- **Configuration requise** :  
  - Un seul déploiement (Web Service) pour le backend + frontend  
  - Variables d'environnement :  
    ```env  
    PORT=10000  
    MAX_MESSAGES=150  
    NODE_ENV=production  
    ```  
- **Avantages** :  
  - Coût réduit (un seul service)  
  - Maintenance simplifiée  

---

**Note** : Ce rapport reflète l'état du projet après restructuration en dossiers `client/` et `server/`, avec une approche SPA et un déploiement unifié.