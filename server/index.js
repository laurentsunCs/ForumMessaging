require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost";

// Configuration
const MAX_MESSAGES = process.env.MAX_MESSAGES || 100;

// Activation de CORS pour permettre les requêtes depuis le client
app.use(cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Variable globale pour stocker les messages avec leurs métadonnées
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
  // Réindexer les IDs pour s'assurer qu'ils sont consécutifs
  allMsgs = allMsgs.map((msg, index) => ({
    ...msg,
    id: index
  }));
  res.json(allMsgs);
});

// Route pour obtenir le nombre de messages
app.get("/msg/nber", (req, res) => {
  res.json(allMsgs.length);
});

// Route pour poster un nouveau message
app.get("/msg/post/:message", (req, res) => {
  const message = decodeURIComponent(req.params.message);
  const pseudo = decodeURIComponent(req.query.pseudo || 'Anonyme');

  // Vérification de la limite de messages
  if (allMsgs.length >= MAX_MESSAGES) {
    allMsgs.shift(); // Supprime le plus ancien message
  }

  const newMsg = {
    id: allMsgs.length,
    msg: message,
    pseudo: pseudo,
    date: new Date().toISOString(),
  };

  allMsgs.push(newMsg);
  res.json({ code: 1, message: "Message ajouté" });
});

// Route pour supprimer un message
app.get("/msg/del/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 0 || id >= allMsgs.length) {
    return res.json({ code: 0 });
  }
  
  // Supprimer le message
  allMsgs = allMsgs.filter(msg => msg.id !== id);
  
  // Réindexer les messages restants
  allMsgs = allMsgs.map((msg, index) => ({
    ...msg,
    id: index
  }));
  
  res.json({ code: 1 });
});

// Route de test
app.get("/test/*", function (req, res) {
  const path = req.url.split("/test/")[1];
  res.json({ msg: path });
});

// Démarrage du serveur
app.listen(port, host, () => {
  console.log(`Serveur démarré sur http://${host}:${port}`);
});
