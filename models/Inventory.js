

// models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  inStock: { type: Boolean, default: true },
  qty: { type: Number, default: 0 },
  imageUrl: String
});

module.exports = mongoose.model('Inventory', InventorySchema);
