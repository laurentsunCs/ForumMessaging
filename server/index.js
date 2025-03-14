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
  MAX_MESSAGES: parseInt(process.env.MAX_MESSAGES) || 10,
  MAX_LENGTH: {
    MESSAGE: parseInt(process.env.MAX_MESSAGE_LENGTH) || 500,
    PSEUDO: parseInt(process.env.MAX_PSEUDO_LENGTH) || 30
  },
  REQUEST_LIMIT: process.env.REQUEST_SIZE_LIMIT || '1mb',
  RATE_LIMITS: {
    POST: {
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.POST_RATE_LIMIT) || 10,
    },
    DELETE: {
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.DELETE_RATE_LIMIT) || 5,
    }
  },
  SANITIZE_OPTIONS: {
    allowedTags: [], // Ne permet aucune balise HTML
    allowedAttributes: {}, // Ne permet aucun attribut
  },
  SPAM_PROTECTION: {
    MIN_INTERVAL_BETWEEN_MESSAGES: 1000, // 1 seconde minimum entre les messages
    MAX_SIMILAR_MESSAGES: 3, // Nombre maximum de messages similaires autorisés
    SIMILARITY_THRESHOLD: 0.8, // Seuil de similarité pour détecter les messages similaires
    MESSAGE_HISTORY_SIZE: 100 // Taille de l'historique pour la détection de spam
  }
};

// Structure pour stocker l'historique des messages récents pour la détection de spam
const messageHistory = {
  messages: [],
  lastMessageTimes: new Map(), // Map IP -> timestamp du dernier message
  similarityCount: new Map(), // Map contenu -> nombre d'occurrences
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
app.use(express.json({ limit: CONFIG.REQUEST_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.REQUEST_LIMIT }));
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

// Fonction pour vérifier la similarité entre deux chaînes
function stringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

// Fonction pour calculer la distance d'édition (Levenshtein)
function editDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = str1[i - 1] === str2[j - 1] 
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Fonction pour vérifier si un message est du spam
function isSpam(message, ip) {
  const now = Date.now();
  
  // Vérifier l'intervalle minimum entre les messages
  const lastMessageTime = messageHistory.lastMessageTimes.get(ip) || 0;
  if (now - lastMessageTime < CONFIG.SPAM_PROTECTION.MIN_INTERVAL_BETWEEN_MESSAGES) {
    return "Messages trop rapprochés. Merci d'attendre un peu.";
  }
  
  // Vérifier les messages similaires
  let similarCount = 0;
  for (const oldMessage of messageHistory.messages) {
    if (stringSimilarity(message, oldMessage) > CONFIG.SPAM_PROTECTION.SIMILARITY_THRESHOLD) {
      similarCount++;
      if (similarCount >= CONFIG.SPAM_PROTECTION.MAX_SIMILAR_MESSAGES) {
        return "Trop de messages similaires détectés.";
      }
    }
  }
  
  // Mettre à jour l'historique
  messageHistory.lastMessageTimes.set(ip, now);
  messageHistory.messages.push(message);
  if (messageHistory.messages.length > CONFIG.SPAM_PROTECTION.MESSAGE_HISTORY_SIZE) {
    messageHistory.messages.shift();
  }
  
  return false;
}

// Rate limiters améliorés
const postLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMITS.POST.windowMs,
  max: CONFIG.RATE_LIMITS.POST.max,
  message: {
    code: 0,
    error: "Trop de tentatives. Merci de patienter 1 minute."
  },
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    // Utiliser les trois premiers octets de l'adresse IP pour le rate limiting
    return ip.split('.').slice(0, 3).join('.') + '_post';
  }
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
app.get('/config', (req, res) => {
  try {
    const clientConfig = {
      maxMessages: CONFIG.MAX_MESSAGES,
      maxMessageLength: CONFIG.MAX_LENGTH.MESSAGE,
      maxPseudoLength: CONFIG.MAX_LENGTH.PSEUDO,
      postRateLimit: CONFIG.RATE_LIMITS.POST.max,
      deleteRateLimit: CONFIG.RATE_LIMITS.DELETE.max
    };
    res.json(clientConfig);
  } catch (error) {
    const ip = getClientIP(req);
    logWithTimestamp(`IP: ${ip} - Erreur lors de la récupération de la configuration: ${error.message}`, 'ERROR');
    res.status(500).json({ error: "Erreur lors de la récupération de la configuration" });
  }
});

app.post('/msg/post', blockNonBrowser, postLimiter, sanitizeInput, async (req, res) => {
  try {
    const ip = getClientIP(req);
    const { message, pseudo = "Anonyme" } = req.body;

    if (!message) {
      logWithTimestamp(`IP: ${ip} - Tentative d'envoi d'un message vide par ${pseudo}`, 'WARNING');
      return res.status(400).json({ code: 0, error: "Message vide" });
    }

    // Vérification anti-spam
    const spamCheck = isSpam(message, ip);
    if (spamCheck) {
      logWithTimestamp(`IP: ${ip} - Tentative de spam détectée: ${spamCheck}`, 'WARNING');
      return res.status(429).json({ code: 0, error: spamCheck });
    }

    if (message.length > CONFIG.MAX_LENGTH.MESSAGE) {
      logWithTimestamp(`IP: ${ip} - Message trop long (${message.length} caractères) par ${pseudo}`, 'WARNING');
      return res.status(400).json({ code: 0, error: `Message trop long (maximum ${CONFIG.MAX_LENGTH.MESSAGE} caractères)` });
    }

    if (pseudo.length > CONFIG.MAX_LENGTH.PSEUDO) {
      logWithTimestamp(`IP: ${ip} - Pseudo trop long (${pseudo.length} caractères)`, 'WARNING');
      return res.status(400).json({ code: 0, error: `Pseudo trop long (maximum ${CONFIG.MAX_LENGTH.PSEUDO} caractères)` });
    }

    if (allMsgs.length >= CONFIG.MAX_MESSAGES) {
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
