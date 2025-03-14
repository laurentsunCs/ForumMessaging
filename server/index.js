require("dotenv").config({ path: "../.env" });
const express = require("express");
const rateLimit = require('express-rate-limit');
const cors = require("cors");
const helmet = require("helmet");
const sanitizeHtml = require("sanitize-html");
const app = express();
const port = process.env.PORT || 3000;
// Ajouter en haut du fichier
const path = require("path");

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

// Routes modifiées
app.post('/msg/post', postLimiter, sanitizeInput, (req, res)  => {
  const { message, pseudo = "Anonyme" } = req.body;

  if (!message) return res.status(400).json({ code: 0, error: "Message vide" });

  if (allMsgs.length > MAX_MESSAGES) {
    allMsgs.pop(); // Supprimer le plus ancien
  }

  const newMsg = {
    id: ++lastId,
    msg: message,
    pseudo: pseudo,
    date: new Date().toISOString(),
  };

  allMsgs.unshift(newMsg);
  res.json({ code: 1, message: "Message ajouté", id: newMsg.id });
});

app.delete('/msg/del/:id', deleteLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = allMsgs.length;

  allMsgs = allMsgs.filter((msg) => msg.id !== id);

  if (allMsgs.length === initialLength) {
    return res.status(404).json({ code: 0, error: "Message non trouvé" });
  }

  res.json({ code: 1 });
});

// Route pour obtenir un message par son numéro
app.get("/msg/get/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 0 || id >= allMsgs.length) {
    return res.json({ code: 0 });
  }
  res.json({ code: 1, msg: allMsgs[id] });
});

// Route pour obtenir tous les messages
app.get("/msg/getAll", (req, res) => {
  // Trier les messages par date décroissante
  const sortedMessages = [...allMsgs].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  res.json(sortedMessages);
});

// Route pour obtenir le nombre de messages
app.get("/msg/nber", (req, res) => {
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

// Démarrage du serveur
app.listen(port, () => {
  console.log(
    `l'Application est démarrée sur le port ${port}, accéder à http://localhost:${port}`
  );
});
