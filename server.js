
// // server.js
// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const { Server } = require('socket.io');

// const authRoutes = require('./routes/auth');
// const reqRoutes = require('./routes/requirements');
// const adminRoutes = require('./routes/admin');

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: '8mb' }));
// app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// // API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/req', reqRoutes);
// app.use('/api/admin', adminRoutes);

// // health
// app.get('/', (req, res) => res.send('API running'));

// // create HTTP server and socket.io
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: '*' } });
// app.set('io', io);

// // socket handling
// io.on('connection', (socket) => {
//   const token = socket.handshake.auth?.token;

//   // admin secret
//   if (token && token === process.env.ADMIN_SECRET) {
//     socket.join('admins');
//     console.log('Admin connected:', socket.id);
//     return;
//   }

//   // user JWT
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const userRoom = `user:${decoded.id}`;
//     socket.join(userRoom);
//     console.log('User connected:', userRoom, socket.id);
//   } catch (err) {
//     console.warn('Socket auth failed:', err?.message);
//   }
// });

// // Mongo connection & start
// const PORT = process.env.PORT || 5000;
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
//   .then(() => {
//     console.log('MongoDB connected');
//     server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//   })
//   .catch(err => {
//     console.error('Mongo connection error:', err);
//     process.exit(1);
//   });

// // graceful shutdown
// process.on('SIGINT', () => {
//   console.log('SIGINT received: closing server');
//   io.close();
//   mongoose.disconnect().then(() => process.exit(0));
// });

// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const reqRoutes = require('./routes/requirements');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/req', reqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// health
app.get('/', (req, res) => res.send('API running'));

// create HTTP server and socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// socket handling
io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;

  // admin secret (connect as admin if passes secret)
  if (token && token === process.env.ADMIN_SECRET) {
    socket.join('admins');
    console.log('Admin connected:', socket.id);
    return;
  }

  // user JWT
  try {
    if (!token) {
      console.warn('Socket connection without token:', socket.id);
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRoom = `user:${decoded.id}`;
    socket.join(userRoom);
    console.log('User connected to room:', userRoom, socket.id);
  } catch (err) {
    console.warn('Socket auth failed:', err?.message);
  }
});

// Mongo connection & start
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });

// graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received: closing server');
  io.close();
  mongoose.disconnect().then(() => process.exit(0));
});
