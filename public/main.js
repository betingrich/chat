document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginForm = document.getElementById('login-form');
  const chatContainer = document.getElementById('chat-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const messagesList = document.getElementById('messages');
  const usernameDisplay = document.getElementById('username-display');

  // Socket.io with mobile optimizations
  const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    transports: ['websocket']
  });

  // State
  let currentUsername = '';

  // Login Handler
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUsername = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (currentUsername && password) {
      loginForm.style.display = 'none';
      chatContainer.style.display = 'block';
      usernameDisplay.textContent = currentUsername;
      addSystemMessage('Connected to chatroom');
    }
  });

  // Message Handler
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      socket.emit('send_message', {
        username: currentUsername,
        message: message
      });
      addMessage(currentUsername, message, true);
      messageInput.value = '';
    }
  });

  // Socket Events
  socket.on('connect', () => {
    addSystemMessage('Connected to server');
  });

  socket.on('disconnect', () => {
    addSystemMessage('Disconnected - reconnecting...');
  });

  socket.on('message_history', (messages) => {
    messages.forEach(msg => {
      addMessage(msg.username, msg.message, msg.username === currentUsername);
    });
  });

  socket.on('new_message', (msg) => {
    if (msg.username !== currentUsername) {
      addMessage(msg.username, msg.message, false);
    }
  });

  // Helper Functions
  function addMessage(username, message, isOwn) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwn ? 'own' : ''}`;
    messageEl.innerHTML = `
      <div class="message-header">
        <span class="username">${username}</span>
        <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <div class="message-content">${message}</div>
    `;
    messagesList.appendChild(messageEl);
    scrollToBottom();
  }

  function addSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'system-message';
    el.textContent = text;
    messagesList.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesList.scrollTop = messagesList.scrollHeight;
  }
});
