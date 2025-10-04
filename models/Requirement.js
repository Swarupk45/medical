
// models/Requirement.js
const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ name: String, qty: Number, note: String }],
  images: [String],
  message: String,
  location: { lat: Number, lng: Number },    // parsed coords if available
  locationText: String,                      // raw pasted link or address
  status: { type: String, default: 'pending' },
  reply: {
    availableItems: [{ name: String, qty: Number }],
    totalAmount: Number,
    note: String,
    paymentImage: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Requirement', RequirementSchema);
