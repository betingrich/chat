document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginForm = document.getElementById('login-form');
  const chatContainer = document.getElementById('chat-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const messagesContainer = document.getElementById('messages');
  const usernameDisplay = document.getElementById('username-display');

  // Socket.io connection
  const socket = io({
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  });

  // State
  let currentUsername = '';

  // Login handler
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUsername = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (currentUsername && password) {
      loginForm.style.display = 'none';
      chatContainer.style.display = 'block';
      messageInput.focus();
      usernameDisplay.textContent = currentUsername;
      addSystemMessage('Welcome to the chat!');
    }
  });

  // Message handler
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

  // Socket events
  socket.on('connect', () => {
    addSystemMessage('Connected to server');
  });

  socket.on('disconnect', () => {
    addSystemMessage('Disconnected from server');
  });

  socket.on('message_history', (messages) => {
    messages.forEach(msg => {
      addMessage(msg.username, msg.message, msg.username === currentUsername);
    });
  });

  socket.on('new_message', (message) => {
    addMessage(message.username, message.message, message.username === currentUsername);
  });

  socket.on('error', (message) => {
    addSystemMessage(`Error: ${message}`);
  });

  // Helper functions
  function addMessage(username, message, isOwn) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwn ? 'own' : ''}`;
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="username">${username}</span>
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${message}</div>
    `;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
  }

  function addSystemMessage(message) {
    const element = document.createElement('div');
    element.className = 'system-message';
    element.textContent = message;
    messagesContainer.appendChild(element);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
});
