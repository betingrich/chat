require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = process.env.PORT || 3000;

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Message Schema
const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message too long']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});
const Message = mongoose.model('Message', messageSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io Connection
io.on('connection', async (socket) => {
  console.log('🔌 New client connected:', socket.id);
  let addedUser = false;

  // Load message history
  try {
    const messages = await Message.find()
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();
    socket.emit('message history', messages);
    console.log(`Sent ${messages.length} historical messages`);
  } catch (err) {
    console.error('Error loading messages:', err);
    socket.emit('load error', 'Failed to load message history');
  }

  // Handle new messages
  socket.on('new message', async (data) => {
    if (!addedUser || !data.trim()) return;

    try {
      const newMessage = new Message({
        username: socket.username,
        message: data
      });
      await newMessage.save();
      
      io.emit('new message', {
        username: socket.username,
        message: data,
        timestamp: newMessage.timestamp
      });
      console.log('New message saved:', data.substring(0, 20) + '...');
    } catch (err) {
      console.error('Message save error:', err);
      socket.emit('message error', 'Failed to send message');
    }
  });

  // Handle user joining
  socket.on('add user', (username) => {
    if (addedUser) return;

    socket.username = username;
    addedUser = true;
    io.emit('user joined', {
      username: username,
      numUsers: io.engine.clientsCount
    });
    console.log(`User joined: ${username}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (addedUser) {
      io.emit('user left', {
        username: socket.username,
        numUsers: io.engine.clientsCount
      });
      console.log(`User left: ${socket.username}`);
    }
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🔗 http://localhost:${port}`);
  });
};

startServer();

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
  process.exit(1);
});
