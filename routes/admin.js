
// routes/admin.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Requirement = require('../models/Requirement');
const Inventory = require('../models/Inventory');
const multer = require('multer');
const { uploadBuffer } = require('../cloudinary');

const upload = multer(); // memory

router.use(adminAuth);

// GET customers (latest first)
router.get('/customers', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('phone name createdAt');
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET requirements (optionally filter by user id via ?user=<id>)
router.get('/requirements', async (req, res) => {
  try {
    const filter = {};
    if (req.query.user) filter.user = req.query.user;
    const list = await Requirement.find(filter).populate('user', 'phone name').sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

async function handleReply(req, res) {
  try {
    const id = req.params.id;
    const r = await Requirement.findById(id);
    if (!r) return res.status(404).json({ msg: 'Requirement not found' });

    // parse fields
    let availableItems = [];
    if (req.body.availableItems) {
      try { availableItems = JSON.parse(req.body.availableItems); } catch (e) { availableItems = []; }
    }
    const totalAmount = req.body.totalAmount ? Number(req.body.totalAmount) : 0;
    const note = req.body.note || '';

    // if admin uploaded a payment image
    let paymentImageUrl = null;
    if (req.file && req.file.buffer) {
      paymentImageUrl = await uploadBuffer(req.file.buffer, 'payments');
    }

    r.reply = {
      availableItems,
      totalAmount,
      note,
      paymentImage: paymentImageUrl || (r.reply && r.reply.paymentImage) || ''
    };
    r.status = req.body.status || 'replied';

    await r.save();
    const populated = await r.populate('user', 'phone name');

    // notify the user via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(r.user)}`).emit('requirement_update', populated);
      io.to('admins').emit('requirement_updated', populated);
    }

    res.json(populated);
  } catch (err) {
    console.error('admin reply error', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

// route accepts single file named 'paymentImage'
router.post('/requirements/:id/reply', upload.single('paymentImage'), handleReply);
router.post('/reply/:id', upload.single('paymentImage'), handleReply);

// Inventory endpoints
router.get('/inventory', async (req, res) => {
  try {
    const inv = await Inventory.find();
    res.json(inv);
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server error' }); }
});

router.post('/inventory', async (req, res) => {
  try {
    const inv = new Inventory(req.body);
    await inv.save();
    res.json(inv);
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
