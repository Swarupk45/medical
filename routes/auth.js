
// // routes/auth.js
// const express = require('express');
// const router = express.Router();
// const User = require('../models/User');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// // Signup
// router.post('/signup', async (req, res) => {
//   try {
//     const { phone, password, name } = req.body;
//     if (!phone || !password) return res.status(400).json({ msg: 'Phone & password required' });

//     const existing = await User.findOne({ phone });
//     if (existing) return res.status(400).json({ msg: 'User already exists' });

//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, salt);

//     const user = new User({ phone, passwordHash: hash, name });
//     await user.save();

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//     res.json({ token, user: { id: user._id, phone: user.phone, name: user.name } });
//   } catch (err) {
//     console.error('Signup error', err);
//     res.status(500).json({ msg: 'Internal server error' });
//   }
// });

// // Login
// router.post('/login', async (req, res) => {
//   try {
//     const { phone, password } = req.body;
//     if (!phone || !password) return res.status(400).json({ msg: 'Phone & password required' });

//     const user = await User.findOne({ phone });
//     if (!user) return res.status(400).json({ msg: 'User not found' });

//     const isMatch = await bcrypt.compare(password, user.passwordHash);
//     if (!isMatch) return res.status(400).json({ msg: 'Invalid password' });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//     res.json({ token, user: { id: user._id, phone: user.phone, name: user.name } });
//   } catch (err) {
//     console.error('Login error', err);
//     res.status(500).json({ msg: 'Internal server error' });
//   }
// });

// module.exports = router;


// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password) return res.status(400).json({ msg: 'Phone & password required' });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ phone, passwordHash: hash, name });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ msg: 'Phone & password required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

module.exports = router;
