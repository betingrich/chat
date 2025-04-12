$(function() {
  const FADE_TIME = 150;
  const TYPING_TIMER_LENGTH = 400;
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // DOM elements
  const $window = $(window);
  const $usernameInput = $('.usernameInput');
  const $messages = $('.messages');
  const $inputMessage = $('.inputMessage');
  const $loginPage = $('.login.page');
  const $chatPage = $('.chat.page');

  const socket = io();

  let username = '';
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  // Set username
  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  };

  // Send message
  const sendMessage = () => {
    let message = $inputMessage.val();
    message = cleanInput(message);
    
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({ username, message });
      socket.emit('new message', message);
    }
  };

  // Add chat message
  const addChatMessage = (data, options = {}) => {
    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    const $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  };

  // Add message element
  const addMessageElement = (el, options) => {
    const $el = $(el);
    
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    $messages.append($el);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  };

  // Clean input
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  };

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

  // Socket events
  socket.on('login', (data) => {
    connected = true;
    log('Welcome to the chat');
    addParticipantsMessage(data);
  });

  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  socket.on('user joined', (data) => {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  socket.on('user left', (data) => {
    log(data.username + ' left');
    addParticipantsMessage(data);
  });

  // Helper functions
  function addParticipantsMessage(data) {
    const message = data.numUsers === 1 ?
      "There's 1 participant" :
      `There are ${data.numUsers} participants`;
    log(message);
  }

  function log(message) {
    const $el = $('<li>').addClass('log').text(message);
    addMessageElement($el);
  }

  function getUsernameColor(username) {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    return COLORS[Math.abs(hash % COLORS.length)];
  }
});
