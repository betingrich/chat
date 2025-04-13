require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  pingTimeout: 60000, // Higher timeout for mobile
  transports: ['websocket'] // Better for mobile data
});

// MongoDB Connection
const uri = process.env.MONGODB_URI.replace(
  '<db_password>',
  encodeURIComponent(process.env.DB_PASSWORD)
);

const client = new MongoClient(uri, {
  connectTimeoutMS: 15000,
  socketTimeoutMS: 30000,
  serverApi: { version: '1' }
});

let db;
const connectDB = async () => {
  try {
    await client.connect();
    db = client.db('chatdb');
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ DB Connection Error:', err);
    process.exit(1);
  }
};

// Chatroom Logic
io.on('connection', async (socket) => {
  console.log('📱 New mobile connection:', socket.id);

  // Load last 50 messages
  try {
    const messages = await db.collection('messages')
      .find()
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    socket.emit('message_history', messages.reverse());
  } catch (err) {
    console.error('Error loading messages:', err);
  }

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const newMsg = {
        username: data.username,
        message: data.message,
        timestamp: new Date()
      };
      
      await db.collection('messages').insertOne(newMsg);
      io.emit('new_message', newMsg);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('📱 User disconnected:', socket.id);
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  server.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
  });
};

startServer();
