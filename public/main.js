$(function() {
  // Constants
  const FADE_TIME = 150;
  const TYPING_TIMER_LENGTH = 400;
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // DOM Elements
  const $window = $(window);
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
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  // Helper functions
  function addParticipantsMessage(data) {
    const message = data.numUsers === 1 ?
      "There's 1 participant" :
      `There are ${data.numUsers} participants`;
    log(message);
  }

  function setUsername() {
    username = cleanInput($usernameInput.val().trim());

    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $chatPage.prepend($loadingIndicator);
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();
      socket.emit('add user', username);
    }
  }

  function sendMessage() {
    const message = cleanInput($inputMessage.val());
    if (message && connected) {
      $inputMessage.val('');
      socket.emit('new message', message);
    }
  }

  function log(message, options = {}) {
    const $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  function addChatMessage(data, options = {}) {
    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    const $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  function addMessageElement($el, options) {
    if (!options.fade) {
      $el.css('opacity', 1);
    }
    $messages.append($el);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function cleanInput(input) {
    return $('<div/>').text(input).html();
  }

  function getUsernameColor(username) {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    return COLORS[Math.abs(hash % COLORS.length)];
  }

  // Socket events
  socket.on('login', (data) => {
    connected = true;
    log(`Welcome, ${data.username}!`);
    addParticipantsMessage(data);
  });

  socket.on('message history', (messages) => {
    $loadingIndicator.remove();
    messages.forEach(msg => {
      addChatMessage({
        username: msg.username,
        message: msg.message
      }, { fade: false });
    });
  });

  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  socket.on('user joined', (data) => {
    log(`${data.username} joined`);
    addParticipantsMessage(data);
  });

  socket.on('user left', (data) => {
    log(`${data.username} left`);
    addParticipantsMessage(data);
  });

  socket.on('disconnect', () => {
    log('You have been disconnected');
  });

  socket.on('reconnect', () => {
    log('You have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('connect_error', () => {
    log('Unable to connect to server');
  });

  socket.on('history_error', (err) => {
    $loadingIndicator.text('Error loading messages').css('color', 'red');
    console.error(err);
  });

  // Keyboard events
  $window.keydown(event => {
    if (event.which === 13) { // Enter key
      if (username) {
        sendMessage();
      } else {
        setUsername();
      }
    }
  });
});
