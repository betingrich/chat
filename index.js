require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});
const Message = mongoose.model('Message', messageSchema);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
let numUsers = 0;

io.on('connection', async (socket) => {
  let addedUser = false;

  // Load message history for new connections
  try {
    const messages = await Message.find()
      .sort({ timestamp: 1 }) // Oldest first
      .limit(100); // Limit to 100 messages
    socket.emit('message history', messages);
  } catch (err) {
    console.error('Error loading message history:', err);
    socket.emit('history_error', 'Failed to load message history');
  }

  // When client sends a new message
  socket.on('new message', async (data) => {
    if (!addedUser) return;

    try {
      // Save to database
      const newMessage = new Message({
        username: socket.username,
        message: data
      });
      await newMessage.save();

      // Broadcast to all clients including sender
      io.emit('new message', {
        username: socket.username,
        message: data,
        timestamp: newMessage.timestamp
      });
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('message_error', 'Failed to send message');
    }
  });

  // When client adds a user
  socket.on('add user', (username) => {
    if (addedUser) return;

    // Store username and update count
    socket.username = username;
    addedUser = true;
    numUsers++;

    // Notify user and others
    socket.emit('login', {
      numUsers: numUsers,
      username: username
    });
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // When client disconnects
  socket.on('disconnect', () => {
    if (addedUser) {
      numUsers--;
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
