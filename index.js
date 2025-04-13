require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

// MongoDB Connection
const uri = process.env.MONGODB_URI || "mongodb+srv://ellyongiro8:<password>@cluster0.tyxcmm9.mongodb.net/chatdb?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
})
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
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
      .sort({ timestamp: 1 })
      .limit(100);
    socket.emit('message history', messages);
  } catch (err) {
    console.error('Error loading messages:', err);
    socket.emit('load_error', 'Failed to load messages');
  }

  // Handle new messages
  socket.on('new message', async (data) => {
    if (!addedUser) return;

    try {
      const newMessage = new Message({
        username: socket.username,
        message: data
      });
      await newMessage.save();
      
      io.emit('new message', {
        username: socket.username,
        message: data
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Handle user joining
  socket.on('add user', (username) => {
    if (addedUser) return;

    socket.username = username;
    addedUser = true;
    numUsers++;

    socket.emit('login', {
      numUsers: numUsers
    });
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // Handle disconnection
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
