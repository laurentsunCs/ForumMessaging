require("dotenv").config({ path: "../.env" });
const express = require("express");
const rateLimit = require('express-rate-limit');
const cors = require("cors");
const helmet = require("helmet");
const sanitizeHtml = require("sanitize-html");
const path = require("path");
const app = express();

// Configuration globale
const CONFIG = {
  PORT: process.env.PORT || 3000,
  MAX_MESSAGES: process.env.MAX_MESSAGES || 10,
  RATE_LIMITS: {
    POST: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requêtes/minute
    },
    DELETE: {
      windowMs: 60 * 1000,
      max: 5,
    }
  },
  SANITIZE_OPTIONS: {
    allowedTags: [], // Ne permet aucune balise HTML
    allowedAttributes: {}, // Ne permet aucun attribut
  }
};

// Fonction de logging simplifiée
function logWithTimestamp(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Fonction pour obtenir l'IP réelle du client
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket?.remoteAddress;
}

// Fonction pour vérifier si le User-Agent est un navigateur
function isBrowserUserAgent(userAgent) {
  if (!userAgent) return false;
  return userAgent.includes('Mozilla/') || userAgent.includes('Chrome/') || 
         userAgent.includes('Safari/') || userAgent.includes('Firefox/') || 
         userAgent.includes('Edge/');
}

// Middleware pour bloquer les requêtes non-navigateur
const blockNonBrowser = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  if (!isBrowserUserAgent(userAgent)) {
    logWithTimestamp(`Tentative d'accès bloquée - IP: ${getClientIP(req)} - User-Agent: ${userAgent}`, 'WARNING');
    return res.status(403).json({ code: 0, error: "Accès non autorisé" });
  }
  next();
};

// Configuration des middlewares
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.static(path.join(__dirname, "../client")));

// Middleware de logging des requêtes
app.use((req, res, next) => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'];
  logWithTimestamp(`IP: ${ip} - ${req.method} ${req.url} - User-Agent: ${userAgent}`, 'ACCESS');
  next();
});

// Rate limiters
const postLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMITS.POST.windowMs,
  max: CONFIG.RATE_LIMITS.POST.max,
  message: {
    code: 0,
    error: "Trop de tentatives. Merci de patienter 1 minute."
  },
  skipSuccessfulRequests: false, // Ne pas ignorer les requêtes réussies
  keyGenerator: (req) => `${getClientIP(req)}_post` // Utiliser l'IP comme clé
});

const deleteLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMITS.DELETE.windowMs,
  max: CONFIG.RATE_LIMITS.DELETE.max,
  keyGenerator: (req) => `${req.ip}_delete`,
  handler: (req, res) => {
    res.status(429).json({
      code: 0,
      error: "Maximum 2 suppressions par minute autorisées"
    });
  }
});

// Middleware de sanitization amélioré
const sanitizeInput = (req, res, next) => {
  try {
    if (req.body.message) {
      req.body.message = sanitizeHtml(req.body.message, CONFIG.SANITIZE_OPTIONS);
    }
    if (req.body.pseudo) {
      req.body.pseudo = sanitizeHtml(req.body.pseudo, CONFIG.SANITIZE_OPTIONS);
    }
    next();
  } catch (error) {
    logWithTimestamp(`Erreur de sanitization - IP: ${getClientIP(req)}`, 'ERROR');
    res.status(400).json({ code: 0, error: "Contenu invalide" });
  }
};

// État de l'application
let lastId = 2;
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

// Routes avec gestion d'erreurs améliorée
app.post('/msg/post', blockNonBrowser, postLimiter, sanitizeInput, async (req, res) => {
  try {
    const ip = getClientIP(req);
    const { message, pseudo = "Anonyme" } = req.body;

    if (!message) {
      logWithTimestamp(`IP: ${ip} - Tentative d'envoi d'un message vide par ${pseudo}`, 'WARNING');
      return res.status(400).json({ code: 0, error: "Message vide" });
    }

    if (allMsgs.length > CONFIG.MAX_MESSAGES) {
      logWithTimestamp(`IP: ${ip} - Limite de messages atteinte (${CONFIG.MAX_MESSAGES})`, 'INFO');
      allMsgs.pop();
    }

    const newMsg = {
      id: ++lastId,
      msg: message,
      pseudo: pseudo,
      date: new Date().toISOString(),
    };

    allMsgs.unshift(newMsg);
    logWithTimestamp(`IP: ${ip} - Nouveau message #${newMsg.id} créé par ${pseudo}`, 'SUCCESS');
    res.json({ code: 1, message: "Message ajouté", id: newMsg.id });
  } catch (error) {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Erreur lors de la création du message: ${error.message}`, 'ERROR');
    res.status(500).json({ code: 0, error: "Erreur lors de la création du message" });
  }
});

app.delete('/msg/del/:id', deleteLimiter, async (req, res) => {
  try {
    const ip = getClientIP(req);
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      logWithTimestamp(`IP: ${ip} - ID de message invalide: ${req.params.id}`, 'WARNING');
      return res.status(400).json({ code: 0, error: "ID de message invalide" });
    }

    const initialLength = allMsgs.length;
    logWithTimestamp(`IP: ${ip} - Tentative de suppression du message #${id}`, 'INFO');

    allMsgs = allMsgs.filter((msg) => msg.id !== id);

    if (allMsgs.length === initialLength) {
      logWithTimestamp(`IP: ${ip} - Message #${id} non trouvé pour la suppression`, 'WARNING');
      return res.status(404).json({ code: 0, error: "Message non trouvé" });
    }

    logWithTimestamp(`IP: ${ip} - Message #${id} supprimé avec succès`, 'SUCCESS');
    res.json({ code: 1 });
  } catch (error) {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Erreur lors de la suppression: ${error.message}`, 'ERROR');
    res.status(500).json({ code: 0, error: "Erreur lors de la suppression" });
  }
});

app.get("/msg/get/:id", async (req, res) => {
  try {
    const ip = getClientIP(req);
    const id = parseInt(req.params.id);

    if (isNaN(id) || id < 0 || id >= allMsgs.length) {
      logWithTimestamp(`IP: ${ip} - Tentative d'accès à un message invalide #${id}`, 'WARNING');
      return res.status(400).json({ code: 0, error: "ID de message invalide" });
    }

    logWithTimestamp(`IP: ${ip} - Message #${id} récupéré`, 'INFO');
    res.json({ code: 1, msg: allMsgs[id] });
  } catch (error) {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Erreur lors de la récupération: ${error.message}`, 'ERROR');
    res.status(500).json({ code: 0, error: "Erreur lors de la récupération" });
  }
});

app.get("/msg/getAll", async (req, res) => {
  try {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Récupération de tous les messages (${allMsgs.length} messages)`, 'INFO');
    const sortedMessages = [...allMsgs].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sortedMessages);
  } catch (error) {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Erreur lors de la récupération des messages: ${error.message}`, 'ERROR');
    res.status(500).json({ code: 0, error: "Erreur lors de la récupération des messages" });
  }
});

app.get("/msg/nber", (req, res) => {
  try {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Nombre de messages demandé: ${allMsgs.length}`, 'INFO');
    res.json(allMsgs.length);
  } catch (error) {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Erreur lors du comptage: ${error.message}`, 'ERROR');
    res.status(500).json({ code: 0, error: "Erreur lors du comptage des messages" });
  }
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
  const ip = getClientIP(req);
  logWithTimestamp(`IP: ${ip} - Erreur non gérée: ${err.message} - URL: ${req.url}`, 'ERROR');
  res.status(500).json({ error: "Erreur serveur interne" });
});

// Démarrage du serveur avec gestion d'erreur
app.listen(CONFIG.PORT, () => {
  logWithTimestamp(`Serveur démarré sur le port ${CONFIG.PORT} - http://localhost:${CONFIG.PORT}`, 'STARTUP');
  logWithTimestamp(`Configuration: MAX_MESSAGES=${CONFIG.MAX_MESSAGES}`, 'CONFIG');
}).on('error', (error) => {
  logWithTimestamp(`Erreur au démarrage du serveur: ${error.message}`, 'ERROR');
  process.exit(1);
});
