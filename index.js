require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
let numUsers = 0;

io.on('connection', (socket) => {
  let addedUser = false;

  // Load previous messages
  Message.find().sort({ timestamp: -1 }).limit(50)
    .then(messages => {
      socket.emit('load messages', messages.reverse());
    })
    .catch(err => console.error('Error loading messages:', err));

  // New message handler
  socket.on('new message', async (data) => {
    if (!addedUser) return;

    try {
      // Save message to database
      const newMessage = new Message({
        username: socket.username,
        message: data
      });
      await newMessage.save();

      // Broadcast to all users
      io.emit('new message', {
        username: socket.username,
        message: data
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Add user handler
  socket.on('add user', (username) => {
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    addedUser = true;
    
    socket.emit('login', { numUsers });
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // Typing indicators
  socket.on('typing', () => {
    socket.broadcast.emit('typing', { username: socket.username });
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', { username: socket.username });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
