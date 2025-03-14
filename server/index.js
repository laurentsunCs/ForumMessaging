require("dotenv").config({ path: "../.env" });
const express = require("express");
const rateLimit = require('express-rate-limit');
const cors = require("cors");
const helmet = require("helmet");
const sanitizeHtml = require("sanitize-html");
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
// Ajouter en haut du fichier
const path = require("path");

// Configuration des logs
const LOG_DIR = path.join(__dirname, 'logs');
const ACCESS_LOG = path.join(LOG_DIR, 'access.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');

// Créer le dossier de logs s'il n'existe pas
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

// Fonction de logging améliorée
function logWithTimestamp(message, type = 'INFO', logFile = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;
    console.log(logMessage.trim());
    
    if (logFile) {
        fs.appendFile(logFile, logMessage, (err) => {
            if (err) console.error('Erreur d\'écriture des logs:', err);
        });
    }
}

// Fonction pour obtenir l'IP réelle du client
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.connection.socket?.remoteAddress;
}

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(helmet());
// Après helmet(), ajouter :
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // À limiter en production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Nécessaire pour certains cas CORS
  })
);
// Ajouter après app.use(express.json());
app.use(express.static(path.join(__dirname, "../client"))); // Servir les fichiers statiques

// Middleware de logging des requêtes avec IP détaillée
app.use((req, res, next) => {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    const logMessage = `IP: ${ip} - ${req.method} ${req.url} - User-Agent: ${userAgent}`;
    logWithTimestamp(logMessage, 'ACCESS', ACCESS_LOG);
    next();
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requêtes/minute
  message: {
    code: 0,
    error: "Trop de tentatives. Merci de patienter 1 minute."
  },
  skipSuccessfulRequests: true // Ne pas compter les requêtes réussies
});

const deleteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 2 requêtes max
  keyGenerator: (req) => {
    // Utilise l'IP + endpoint comme clé
    return `${req.ip}_delete`; 
  },
  handler: (req, res) => {
    res.status(429).json({ 
      code: 0,
      error: "Maximum 2 suppressions par minute autorisées" 
    });
  }
});

// Configuration
const MAX_MESSAGES = process.env.MAX_MESSAGES || 10;
let lastId = 2; // ID incrémental

// Middleware de sanitization
const sanitizeInput = (req, res, next) => {
  if (req.body.message) req.body.message = sanitizeHtml(req.body.message);
  if (req.body.pseudo) req.body.pseudo = sanitizeHtml(req.body.pseudo);
  next();
};




// Messages initiaux
let allMsgs = [
  {
    id: 0,
    msg: "Hello World",
    pseudo: "System",
    date: new Date().toISOString(),
  },
  {
    id: 1,
    msg: "Bienvenue sur le forum !",
    pseudo: "Admin",
    date: new Date().toISOString(),
  },
  {
    id: 2,
    msg: "CentraleSupelec Forever",
    pseudo: "Étudiant",
    date: new Date().toISOString(),
  },
];

// Routes modifiées avec logging
app.post('/msg/post', postLimiter, sanitizeInput, (req, res) => {
    const ip = getClientIP(req);
    const { message, pseudo = "Anonyme" } = req.body;

    if (!message) {
        logWithTimestamp(`IP: ${ip} - Tentative d'envoi d'un message vide par ${pseudo}`, 'WARNING', ERROR_LOG);
        return res.status(400).json({ code: 0, error: "Message vide" });
    }

    if (allMsgs.length > MAX_MESSAGES) {
        logWithTimestamp(`IP: ${ip} - Limite de messages atteinte (${MAX_MESSAGES})`, 'INFO', ACCESS_LOG);
        allMsgs.pop();
    }

    const newMsg = {
        id: ++lastId,
        msg: message,
        pseudo: pseudo,
        date: new Date().toISOString(),
    };

    allMsgs.unshift(newMsg);
    logWithTimestamp(`IP: ${ip} - Nouveau message #${newMsg.id} créé par ${pseudo}`, 'SUCCESS', ACCESS_LOG);
    res.json({ code: 1, message: "Message ajouté", id: newMsg.id });
});

app.delete('/msg/del/:id', deleteLimiter, (req, res) => {
    const ip = getClientIP(req);
    const id = parseInt(req.params.id);
    const initialLength = allMsgs.length;
    
    logWithTimestamp(`IP: ${ip} - Tentative de suppression du message #${id}`, 'INFO', ACCESS_LOG);

    allMsgs = allMsgs.filter((msg) => msg.id !== id);

    if (allMsgs.length === initialLength) {
        logWithTimestamp(`IP: ${ip} - Message #${id} non trouvé pour la suppression`, 'WARNING', ERROR_LOG);
        return res.status(404).json({ code: 0, error: "Message non trouvé" });
    }

    logWithTimestamp(`IP: ${ip} - Message #${id} supprimé avec succès`, 'SUCCESS', ACCESS_LOG);
    res.json({ code: 1 });
});

app.get("/msg/get/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 0 || id >= allMsgs.length) {
        logWithTimestamp(`Tentative d'accès à un message invalide #${id}`, 'WARNING');
        return res.json({ code: 0 });
    }
    logWithTimestamp(`Message #${id} récupéré`, 'INFO');
    res.json({ code: 1, msg: allMsgs[id] });
});

app.get("/msg/getAll", (req, res) => {
    logWithTimestamp(`Récupération de tous les messages (${allMsgs.length} messages)`, 'INFO');
    const sortedMessages = [...allMsgs].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
    res.json(sortedMessages);
});

app.get("/msg/nber", (req, res) => {
    logWithTimestamp(`Nombre de messages demandé: ${allMsgs.length}`, 'INFO');
    res.json(allMsgs.length);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Route de test
app.get("/test/*", function (req, res) {
  const path = req.url.split("/test/")[1];
  res.json({ msg: path });
});

// Middleware de logging des erreurs
app.use((err, req, res, next) => {
    const ip = getClientIP(req);
    const errorMessage = `IP: ${ip} - Erreur: ${err.message} - URL: ${req.url}`;
    logWithTimestamp(errorMessage, 'ERROR', ERROR_LOG);
    res.status(500).json({ error: "Erreur serveur interne" });
});

// Démarrage du serveur
app.listen(port, () => {
    logWithTimestamp(`Serveur démarré sur le port ${port} - http://localhost:${port}`, 'STARTUP');
    logWithTimestamp(`Configuration: MAX_MESSAGES=${MAX_MESSAGES}`, 'CONFIG');
});
