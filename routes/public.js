// routes/public.js
const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const router = express.Router();

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await Category.find().sort({ createdAt: -1 });
    res.json(cats);
  } catch (err) {
    console.error('Public get categories error', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get products by category
router.get('/categories/:id/products', async (req, res) => {
  try {
    const list = await Product.find({ category: req.params.id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('Public get products error', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
