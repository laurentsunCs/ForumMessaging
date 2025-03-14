require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const sanitizeHtml = require("sanitize-html");
const app = express();
const port = process.env.PORT || 3000;

// Configuration
const MAX_MESSAGES = process.env.MAX_MESSAGES || 100;
let lastId = 2; // ID incrémental

app.use(cors());
app.use(express.json());
app.use(helmet());

// Middleware de sanitization
const sanitizeInput = (req, res, next) => {
  if (req.body.message) req.body.message = sanitizeHtml(req.body.message);
  if (req.body.pseudo) req.body.pseudo = sanitizeHtml(req.body.pseudo);
  next();
};

// Messages initiaux
let allMsgs = [
  { id: 0, msg: "Hello World", pseudo: "System", date: new Date().toISOString() },
  { id: 1, msg: "Bienvenue sur le forum !", pseudo: "Admin", date: new Date().toISOString() },
  { id: 2, msg: "CentraleSupelec Forever", pseudo: "Étudiant", date: new Date().toISOString() },
];

// Routes modifiées
app.post("/msg/post", sanitizeInput, (req, res) => {
  const { message, pseudo = 'Anonyme' } = req.body;
  
  if (!message) return res.status(400).json({ code: 0, error: "Message vide" });

  if (allMsgs.length >= MAX_MESSAGES) {
    allMsgs.shift();
  }

  const newMsg = {
    id: ++lastId,
    msg: message,
    pseudo: pseudo,
    date: new Date().toISOString(),
  };

  allMsgs.push(newMsg);
  res.json({ code: 1, message: "Message ajouté", id: newMsg.id });
});

app.delete("/msg/del/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = allMsgs.length;
  
  allMsgs = allMsgs.filter(msg => msg.id !== id);
  
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


// Route de test
app.get("/test/*", function (req, res) {
  const path = req.url.split("/test/")[1];
  res.json({ msg: path });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
