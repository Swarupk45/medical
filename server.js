
// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const reqRoutes = require('./routes/requirements');
const adminRoutes = require('./routes/admin');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/req', reqRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (req, res) => res.send('API running'));

// Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Attach io to app (so routes can emit events)
app.set('io', io);

// Handle socket connections
io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;

  // Admin socket auth
  if (token && token === process.env.ADMIN_SECRET) {
    socket.join('admins');
    console.log('✅ Admin connected:', socket.id);
    return;
  }

  // User socket auth (JWT)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRoom = `user:${decoded.id}`;
    socket.join(userRoom);
    console.log('✅ User connected:', userRoom, socket.id);
  } catch (err) {
    console.warn('⚠️ Socket auth failed:', err?.message);
    // Keep connection but no rooms
  }
});

// Start server after MongoDB connects
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });
