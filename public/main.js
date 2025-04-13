document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginPage = document.querySelector('.login.page');
  const chatPage = document.querySelector('.chat.page');
  const usernameInput = document.querySelector('.usernameInput');
  const passwordInput = document.querySelector('.passwordInput');
  const loginButton = document.querySelector('.login-button');
  const messageInput = document.querySelector('.inputMessage');
  const sendButton = document.querySelector('.send-button');
  const messagesList = document.querySelector('.messages');
  const passwordToggle = document.querySelector('.password-toggle');

  // Socket.io connection
  const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // State
  let username = '';
  let connected = false;

  // Password toggle
  passwordToggle?.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    passwordToggle.textContent = type === 'password' ? '👁️' : '🔒';
  });

  // Login handler
  loginButton?.addEventListener('click', (e) => {
    e.preventDefault();
    username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username && password) {
      loginPage.style.display = 'none';
      chatPage.style.display = 'block';
      messageInput.focus();
      socket.emit('add user', username);
      addSystemMessage('Welcome to MARISEL\'S CHATROOM');
    }
  });

  // Send message handler
  function sendMessage() {
    const message = messageInput.value.trim();
    if (message && connected) {
      socket.emit('new message', message);
      addChatMessage({
        username: 'You',
        message: message,
        timestamp: new Date()
      }, true);
      messageInput.value = '';
    }
  }

  // Enter key handler
  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  sendButton?.addEventListener('click', sendMessage);

  // Add chat message to UI
  function addChatMessage(data, isSelf = false) {
    const messageElement = document.createElement('li');
    messageElement.className = `message ${isSelf ? 'sent' : 'received'}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const header = document.createElement('div');
    header.className = 'message-header';
    header.innerHTML = `
      <span class="message-user">${data.username}</span>
      <span class="message-time">${formatTime(data.timestamp)}</span>
    `;

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = data.message;

    bubble.appendChild(header);
    bubble.appendChild(content);
    messageElement.appendChild(bubble);
    messagesList.appendChild(messageElement);
    scrollToBottom();
  }

  // Add system message
  function addSystemMessage(text) {
    const element = document.createElement('li');
    element.className = 'system-message';
    element.textContent = text;
    messagesList.appendChild(element);
    scrollToBottom();
  }

  // Format time
  function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Scroll to bottom
  function scrollToBottom() {
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  // Socket.io events
  socket.on('connect', () => {
    connected = true;
    console.log('Connected to server');
    addSystemMessage('Connected to chat server');
  });

  socket.on('disconnect', () => {
    connected = false;
    addSystemMessage('Disconnected from server');
  });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err);
    addSystemMessage('Connection error. Trying to reconnect...');
  });

  socket.on('message history', (messages) => {
    messages.forEach(msg => {
      addChatMessage({
        username: msg.username,
        message: msg.message,
        timestamp: msg.timestamp
      });
    });
  });

  socket.on('new message', (data) => {
    addChatMessage({
      username: data.username,
      message: data.message,
      timestamp: data.timestamp
    });
  });

  socket.on('user joined', (data) => {
    addSystemMessage(`${data.username} joined the chat`);
  });

  socket.on('user left', (data) => {
    addSystemMessage(`${data.username} left the chat`);
  });

  socket.on('load error', (err) => {
    addSystemMessage(`Error: ${err}`);
  });

  socket.on('message error', (err) => {
    addSystemMessage(`Error: ${err}`);
  });
});
