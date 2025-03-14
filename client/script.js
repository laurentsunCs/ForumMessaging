const API_URL = "http://localhost:3000";

let messages = [];
let autoRefreshInterval;
let isRefreshing = false;

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
    if (!response.ok) {
      console.warn('Serveur non disponible');
      return;
    }
    
    const newMessages = await response.json();
    messages = newMessages || [];
    
    // Mettre à jour l'affichage
    messagesContainer.innerHTML = '';
    messages.forEach(message => {
      const messageElement = createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });
    
    updateMessageCount();
  } catch (error) {
    console.warn("Serveur non disponible");
    messages = [];
    messagesContainer.innerHTML = '<div class="message-error">Serveur non disponible</div>';
    updateMessageCount();
  } finally {
    refreshButton.classList.remove("loading");
    isRefreshing = false;
  }
}

// Fonction pour créer un élément message
function createMessageElement(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-pseudo">${message.pseudo}</span>
      <span class="message-date">${formatDate(message.date)}</span>
    </div>
    <div class="message-content">${message.msg}</div>
    <button class="delete-button" onclick="deleteMessage(${message.id})">Supprimer</button>
  `;
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
  sendButton.disabled = !pseudo || !content;
}

// Fonction pour envoyer un message
async function sendMessage(e) {
  e.preventDefault();
  
  const pseudo = pseudoInput.value.trim();
  const content = messageInput.value.trim();
  
  if (!pseudo || !content) {
    alert("Veuillez remplir tous les champs");
    return;
  }
  
  sendButton.disabled = true;
  
  try {
    const encodedMessage = encodeURIComponent(content);
    const encodedPseudo = encodeURIComponent(pseudo);
    const response = await fetch(`${API_URL}/msg/post/${encodedMessage}?pseudo=${encodedPseudo}`);
    
    if (!response.ok) {
      console.warn('Serveur non disponible');
      return;
    }
    
    const data = await response.json();
    if (data.code === 1) {
      messageInput.value = "";
      await refreshMessages();
      checkFields();
    }
  } catch (error) {
    console.warn("Serveur non disponible");
  } finally {
    if (!sendButton.disabled) {
      checkFields();
    }
  }
}

// Fonction pour supprimer un message
async function deleteMessage(id) {
  const deleteButton = event.target;
  deleteButton.disabled = true;
  
  try {
    const response = await fetch(`${API_URL}/msg/del/${id}`);
    if (!response.ok) {
      console.warn('Serveur non disponible');
      return;
    }
    
    const data = await response.json();
    if (data.code === 1) {
      await refreshMessages();
    }
  } catch (error) {
    console.warn("Serveur non disponible");
  } finally {
    deleteButton.disabled = false;
  }
}

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
