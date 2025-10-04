

// routes/requirements.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadBuffer } = require('../cloudinary'); // your existing cloudinary helper
const Requirement = require('../models/Requirement');
const auth = require('../middleware/auth');

const upload = multer(); // memory

// helper to try parse coords from various map link formats or direct lat,lng
function parseCoordsFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.trim();

  // direct lat,lng
  let m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // @lat,lng
  m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // ?q=lat,lng or &query=lat,lng
  m = s.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // center param
  m = s.match(/[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // !3dLAT!4dLNG format
  m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  return null;
}

// GET user's requirements
router.get('/', auth, async (req, res) => {
  try {
    const list = await Requirement.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST new requirement (customer)
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { message } = req.body;

    // parse items safely and ensure qty numeric
    let items = [];
    if (req.body.items) {
      try {
        const parsed = JSON.parse(req.body.items);
        items = (Array.isArray(parsed) ? parsed : []).map(it => ({
          name: String(it.name || ''),
          qty: Number(it.qty) || 0,
          note: (it.note || '')
        }));
      } catch (e) {
        items = [];
      }
    }

    // keep raw location text (if any)
    const locationText = req.body.locationText ? String(req.body.locationText).trim() : null;

    // prefer client-sent location JSON (if client parsed already)
    let loc = null;
    if (req.body.location) {
      try {
        const parsedLoc = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
        if (parsedLoc && parsedLoc.lat && parsedLoc.lng) loc = { lat: Number(parsedLoc.lat), lng: Number(parsedLoc.lng) };
      } catch (e) {
        loc = null;
      }
    }

    // if we still don't have coords, try parse locationText
    if (!loc && locationText) {
      const parsedCoords = parseCoordsFromText(locationText);
      if (parsedCoords) loc = parsedCoords;
    }

    // upload images to cloudinary
    const uploaded = [];
    if (req.files && req.files.length) {
      for (const f of req.files) {
        const url = await uploadBuffer(f.buffer, 'requirements');
        uploaded.push(url);
      }
    }

    const r = new Requirement({
      user: req.userId,
      items,
      images: uploaded,
      message,
      location: loc,           // may be null
      locationText: locationText || ''
    });

    await r.save();
    const populated = await r.populate('user', 'phone name');

    // notify admins
    const io = req.app.get('io');
    if (io) io.to('admins').emit('new_requirement', populated);

    res.json(populated);
  } catch (err) {
    console.error('POST /req error', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
 