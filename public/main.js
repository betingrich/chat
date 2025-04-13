$(function() {
  // Constants
  const FADE_TIME = 150;
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // DOM Elements
  const $usernameInput = $('.usernameInput');
  const $messages = $('.messages');
  const $inputMessage = $('.inputMessage');
  const $loginPage = $('.login.page');
  const $chatPage = $('.chat.page');
  const $loadingIndicator = $('<div class="loading">Loading messages...</div>');

  const socket = io();

  // User state
  let username = '';
  let connected = false;

  // Set username and join chat
  function setUsername() {
    username = $usernameInput.val().trim();
    
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show().prepend($loadingIndicator);
      $inputMessage.focus();
      socket.emit('add user', username);
    }
  }

  // Send message
  function sendMessage() {
    const message = $inputMessage.val().trim();
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({ username, message });
      socket.emit('new message', message);
    }
  }

  // Add chat message to UI
  function addChatMessage(data, options = {}) {
    const $messageDiv = $('<li class="message"/>')
      .append($('<span class="username"/>')
        .text(data.username)
        .css('color', getUsernameColor(data.username)))
      .append($('<span class="messageBody">')
        .text(data.message));
    
    $messages.append($messageDiv);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Get color for username
  function getUsernameColor(username) {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    return COLORS[Math.abs(hash % COLORS.length)];
  }

  // Socket event handlers
  socket.on('login', (data) => {
    connected = true;
    $loadingIndicator.remove();
    addSystemMessage('Welcome to the chat!');
    addSystemMessage(`There ${data.numUsers === 1 ? 'is' : 'are'} ${data.numUsers} participant${data.numUsers === 1 ? '' : 's'}`);
  });

  socket.on('message history', (messages) => {
    $loadingIndicator.remove();
    messages.forEach(msg => {
      addChatMessage(msg, { fade: false });
    });
  });

  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  socket.on('user joined', (data) => {
    addSystemMessage(`${data.username} joined`);
    addSystemMessage(`There ${data.numUsers === 1 ? 'is' : 'are'} ${data.numUsers} participant${data.numUsers === 1 ? '' : 's'}`);
  });

  socket.on('user left', (data) => {
    addSystemMessage(`${data.username} left`);
    addSystemMessage(`There ${data.numUsers === 1 ? 'is' : 'are'} ${data.numUsers} participant${data.numUsers === 1 ? '' : 's'}`);
  });

  socket.on('load_error', (msg) => {
    $loadingIndicator.text(msg).css('color', 'red');
  });

  // Helper function for system messages
  function addSystemMessage(msg) {
    $messages.append($('<li class="system-message">').text(msg));
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Event listeners
  $inputMessage.on('keydown', (e) => {
    if (e.which === 13) { // Enter key
      sendMessage();
    }
  });

  $usernameInput.on('keydown', (e) => {
    if (e.which === 13) {
      setUsername();
    }
  });
});
