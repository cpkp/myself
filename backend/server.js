const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "FRONTEND_URL=https://myself-ashen.vercel.app
",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store active users and their socket IDs
const activeUsers = new Map();

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // User joins - register them
  socket.on('register', (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit('user_list', Array.from(activeUsers.keys()));
    console.log(`User registered: ${userId} with socket ${socket.id}`);
  });

  // Incoming call
  socket.on('call', ({ from, to, offer }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('incoming_call', { 
        from, 
        offer,
        fromSocketId: socket.id 
      });
    }
  });

  // Call answer
  socket.on('answer_call', ({ to, answer }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call_answered', { 
        answer,
        fromSocketId: socket.id 
      });
    }
  });

  // ICE candidate exchange
  socket.on('ice_candidate', ({ to, candidate }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('ice_candidate', { 
        candidate,
        fromSocketId: socket.id 
      });
    }
  });

  // Send message
  socket.on('send_message', ({ roomId, text, sender, timestamp }) => {
    io.to(roomId).emit('receive_message', { 
      text, 
      sender, 
      timestamp,
      senderSocketId: socket.id 
    });
  });

  // End call
  socket.on('end_call', ({ to }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call_ended', { fromSocketId: socket.id });
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    let disconnectedUserId;
    for (const [userId, sid] of activeUsers.entries()) {
      if (sid === socket.id) {
        disconnectedUserId = userId;
        activeUsers.delete(userId);
        break;
      }
    }
    io.emit('user_list', Array.from(activeUsers.keys()));
    console.log(`User disconnected: ${disconnectedUserId}`);
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server running', message: 'Socket.IO server is active' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
