$(function() {
  const socket = io();

  const $loginPage = $('.login.page');
  const $chatPage = $('.chat.page');
  const $usernameInput = $('.usernameInput');
  const $messages = $('.messages');
  const $inputMessage = $('.inputMessage');
  const $sendButton = $('.sendButton');

  let username;

  const setUsername = () => {
    username = $usernameInput.val().trim();
    if (username) {
      $loginPage.hide();
      $chatPage.show();
      socket.emit('add user', username);
    }
  };

  const sendMessage = () => {
    const message = $inputMessage.val().trim();
    if (message) {
      $inputMessage.val('');
      addChatMessage({ username, message });
      socket.emit('new message', message);
    }
  };

  const addChatMessage = (data) => {
    const $message = $('<li class="message"/>')
      .append($('<span class="username"/>').text(data.username + ": "))
      .append($('<span class="messageBody"/>').text(data.message));
    $messages.append($message);
    $messages.scrollTop($messages[0].scrollHeight);
  };

  $usernameInput.keypress(event => {
    if (event.which === 13) {
      setUsername();
    }
  });

  $inputMessage.keypress(event => {
    if (event.which === 13) {
      sendMessage();
    }
  });

  $sendButton.click(() => {
    sendMessage();
  });

  socket.on('new message', data => {
    addChatMessage(data);
  });
});
