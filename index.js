require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = socketio(server);
const PORT = process.env.PORT || 3000;

// Enhanced MongoDB Connection
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Message Model
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io
io.on('connection', async (socket) => {
  console.log('🔌 New connection:', socket.id);

  // Load message history
  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(100);
    socket.emit('message_history', messages.reverse());
  } catch (err) {
    console.error('❌ Failed to load messages:', err);
    socket.emit('error', 'Failed to load messages');
  }

  // Handle new messages
  socket.on('send_message', async (data) => {
    try {
      const newMessage = new Message({
        username: data.username,
        message: data.message
      });
      await newMessage.save();
      io.emit('new_message', newMessage);
    } catch (err) {
      console.error('❌ Failed to save message:', err);
      socket.emit('error', 'Failed to send message');
    }
  });
});

// Start server
connectWithRetry();
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});
