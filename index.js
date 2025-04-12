const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://ellyongiro8:<db_password>@cluster0.tyxcmm9.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schema and model
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

let numUsers = 0;

io.on('connection', (socket) => {
  let addedUser = false;

  socket.on('add user', async (username) => {
    if (addedUser) return;
    socket.username = username;
    ++numUsers;
    addedUser = true;

    const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('chat history', messages);

    socket.emit('login', { numUsers });
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  socket.on('new message', async (data) => {
    const newMsg = new Message({
      username: socket.username,
      message: data
    });
    await newMsg.save();

    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  socket.on('typing', () => {
    socket.broadcast.emit('typing', { username: socket.username });
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', { username: socket.username });
  });

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
