const API_URL = window.location.origin

let messages = [];
let autoRefreshInterval;
let isRefreshing = false;
let deleteCount = 0;
let maxDeletes = 5;
let isSendCooldown = false;

// Éléments du DOM
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("message");
const pseudoInput = document.getElementById("pseudo");
const sendButton = document.getElementById("sendButton");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-icon");
const refreshButton = document.getElementById("refreshButton");
const refreshIcon = refreshButton.querySelector(".refresh-icon");
const messageCount = document.getElementById("messageCount");

// Gestion du thème
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  themeIcon.textContent = theme === "light" ? "🌙" : "☀️";
}

// Fonction pour mettre à jour le compteur de messages
function updateMessageCount() {
  messageCount.textContent = messages.length;
}

// Fonction pour rafraîchir les messages
async function refreshMessages() {
  if (isRefreshing) return;
  isRefreshing = true;
  refreshButton.classList.add("loading");

  try {
    const response = await fetch(`${API_URL}/msg/getAll`);
    console.log("La réponse est : ", response);
    if (!response.ok) {
      console.warn('Serveur non disponible');
      return;
    }

    const newMessages = await response.json();
    messages = (newMessages || []).sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    // Mettre à jour l'affichage
    messagesContainer.innerHTML = '';
    messages.forEach(message => {
      const messageElement = createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });

    updateMessageCount();
    updateDeleteButtons();
  } catch (error) {
    console.log("L'erreur est : ", error);
    console.warn("Serveur non disponible");
    messages = [];
    messagesContainer.innerHTML = '<div class="message-error">Serveur non disponible</div>';
    updateMessageCount();
  } finally {
    refreshButton.classList.remove("loading");
    isRefreshing = false;
  }
}


function showFeedback(message, isError = false) {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${isError ? 'error' : 'success'}`;
  feedback.textContent = message;

  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}


function createMessageElement(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  if (new Date() - new Date(message.date) < 60000) { // Messages de moins d'1 minute
    messageDiv.classList.add('new');
  }

  const header = document.createElement("div");
  header.className = "message-header";

  const pseudo = document.createElement("span");
  pseudo.className = "message-pseudo";
  pseudo.textContent = message.pseudo;

  const date = document.createElement("span");
  date.className = "message-date";
  date.textContent = formatDate(message.date);

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = message.msg;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-button";
  deleteBtn.textContent = "Supprimer";
  deleteBtn.onclick = () => deleteMessage(message.id);

  header.append(pseudo, date);
  messageDiv.append(header, content, deleteBtn);

  return messageDiv;
}

// Fonction pour formater la date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fonction pour vérifier si les champs sont valides
function checkFields() {
  const pseudo = pseudoInput.value.trim();
  const content = messageInput.value.trim();

  // Désactiver si champs vides OU cooldown actif
  sendButton.disabled = !pseudo || !content || isSendCooldown;
}

// Fonction pour mettre à jour le texte du bouton avec le décompte
function updateSendButtonText(seconds) {
    if (seconds > 0) {
        sendButton.textContent = `Attendre (${seconds}s)`;
    } else {
        sendButton.textContent = 'Envoyer';
    }
}

// Fonction pour envoyer un message
async function sendMessage(e) {
    e.preventDefault();

    isSendCooldown = true;
    let countdown = 5;
    
    // Démarrer le décompte
    const countdownInterval = setInterval(() => {
        countdown--;
        updateSendButtonText(countdown);
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            isSendCooldown = false;
            checkFields();
        }
    }, 1000);

    checkFields();

    const pseudo = pseudoInput.value.trim();
    const content = messageInput.value.trim();

    if (!pseudo || !content) {
        showFeedback("Veuillez remplir tous les champs", true);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/msg/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content, pseudo })
        });

        if (response.status === 429) {
            showFeedback("Attendez 1 minute entre les messages", true);
            return;
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Erreur serveur");
        }

        showFeedback("Message envoyé !");
        messageInput.value = "";
        userHasScrolled = false; // Réinitialiser le flag de défilement
        await refreshMessages();
    } catch (error) {
        if (error.message.includes("429")) {
            showFeedback("Limite de messages atteinte - Patientez", true);
        } else {
            showFeedback(error.message || "Échec de l'envoi", true);
        }
    }
}

function updateDeleteButtons() {
  document.querySelectorAll('.delete-button').forEach(button => {
    const remainingDeletes = maxDeletes - deleteCount;
    button.disabled = deleteCount >= maxDeletes;
    button.title = remainingDeletes > 0
      ? `${remainingDeletes} suppression${remainingDeletes > 1 ? 's' : ''} restante${remainingDeletes > 1 ? 's' : ''} cette minute`
      : 'Limite atteinte (5/min)';
  });
}
// Fonction pour supprimer un message
async function deleteMessage(id) {
  try {
    const response = await fetch(`${API_URL}/msg/del/${id}`, {
      method: 'DELETE'
    });

    if (response.status === 429) {
      showFeedback("Attendez 1 minute entre les suppressions", true);
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Échec de la suppression");
    }

    deleteCount++;
    setTimeout(() => {
      deleteCount = Math.max(0, deleteCount - 1);
      updateDeleteButtons();
    }, 60000); // 60 secondes

    await refreshMessages();
    showFeedback("Message supprimé");
    updateDeleteButtons(); // Mettre à jour immédiatement

  } catch (error) {
    showFeedback(error.message || "Échec de la suppression", true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateDeleteButtons();
});

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshInterval = setInterval(refreshMessages, 30000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
}

// Événements
sendButton.addEventListener("click", sendMessage);
themeToggle.addEventListener("click", toggleTheme);
refreshButton.addEventListener("click", refreshMessages);

// Ajouter les écouteurs pour la validation des champs
pseudoInput.addEventListener("input", checkFields);
messageInput.addEventListener("input", checkFields);

// Initialisation
initTheme();
refreshMessages();
startAutoRefresh();
checkFields(); // Vérifier l'état initial des champs
