
// // routes/admin.js
// const express = require('express');
// const router = express.Router();
// const adminAuth = require('../middleware/adminAuth');
// const User = require('../models/User');
// const Requirement = require('../models/Requirement');
// const Inventory = require('../models/Inventory');
// const multer = require('multer');
// const { uploadBuffer } = require('../cloudinary');

// const upload = multer(); // memory

// router.use(adminAuth);

// // GET customers (latest first)
// router.get('/customers', async (req, res) => {
//   try {
//     const users = await User.find().sort({ createdAt: -1 }).select('phone name createdAt');
//     res.json(users);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ msg: 'Server error' });
//   }
// });

// // GET requirements (optionally filter by user id via ?user=<id>)
// router.get('/requirements', async (req, res) => {
//   try {
//     const filter = {};
//     if (req.query.user) filter.user = req.query.user;
//     const list = await Requirement.find(filter).populate('user', 'phone name').sort({ createdAt: -1 });
//     res.json(list);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ msg: 'Server error' });
//   }
// });

// async function handleReply(req, res) {
//   try {
//     const id = req.params.id;
//     const r = await Requirement.findById(id);
//     if (!r) return res.status(404).json({ msg: 'Requirement not found' });

//     // parse fields
//     let availableItems = [];
//     if (req.body.availableItems) {
//       try { availableItems = JSON.parse(req.body.availableItems); } catch (e) { availableItems = []; }
//     }
//     const totalAmount = req.body.totalAmount ? Number(req.body.totalAmount) : 0;
//     const note = req.body.note || '';

//     // if admin uploaded a payment image
//     let paymentImageUrl = null;
//     if (req.file && req.file.buffer) {
//       paymentImageUrl = await uploadBuffer(req.file.buffer, 'payments');
//     }

//     r.reply = {
//       availableItems,
//       totalAmount,
//       note,
//       paymentImage: paymentImageUrl || (r.reply && r.reply.paymentImage) || ''
//     };
//     r.status = req.body.status || 'replied';

//     await r.save();
//     const populated = await r.populate('user', 'phone name');

//     // notify the user via socket
//     const io = req.app.get('io');
//     if (io) {
//       io.to(`user:${String(r.user)}`).emit('requirement_update', populated);
//       io.to('admins').emit('requirement_updated', populated);
//     }

//     res.json(populated);
//   } catch (err) {
//     console.error('admin reply error', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// }

// // route accepts single file named 'paymentImage'
// router.post('/requirements/:id/reply', upload.single('paymentImage'), handleReply);
// router.post('/reply/:id', upload.single('paymentImage'), handleReply);

// // Inventory endpoints
// router.get('/inventory', async (req, res) => {
//   try {
//     const inv = await Inventory.find();
//     res.json(inv);
//   } catch (e) { console.error(e); res.status(500).json({ msg: 'Server error' }); }
// });

// router.post('/inventory', async (req, res) => {
//   try {
//     const inv = new Inventory(req.body);
//     await inv.save();
//     res.json(inv);
//   } catch (e) { console.error(e); res.status(500).json({ msg: 'Server error' }); }
// });

// module.exports = router;


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

// new models
const Category = require('../models/Category');
const Product = require('../models/Product');

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

// DELETE /api/admin/requirements/:id
// Admin-only: delete a requirement document
router.delete('/requirements/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await Requirement.findById(id);
    if (!r) return res.status(404).json({ msg: 'Requirement not found' });

    // OPTIONAL: if you want to remove images from Cloudinary, you can do it here.
    // This requires you to have a helper that can delete by public id or URL.
    // Example (uncomment and adapt if you have a delete function):
    //
    // const { deleteByPublicId } = require('../cloudinary'); // <-- implement this if needed
    // if (Array.isArray(r.images) && r.images.length) {
    //   for (const imgUrl of r.images) {
    //     try {
    //       // derive public id from URL or store public_id in DB when uploading
    //       const publicId = extractPublicIdFromUrl(imgUrl); // implement extractor if needed
    //       if (publicId) await deleteByPublicId(publicId);
    //     } catch (err) {
    //       console.warn('Failed to delete cloudinary image', imgUrl, err);
    //     }
    //   }
    // }

    await Requirement.deleteOne({ _id: id });

    // Notify via sockets
    const io = req.app.get('io');
    if (io) {
      // notify the specific user room that their requirement was deleted
      if (r.user) io.to(`user:${String(r.user)}`).emit('requirement_deleted', { id, requirement: r });

      // also notify admins so admin UIs can refresh
      io.to('admins').emit('requirement_deleted', { id, requirement: r });
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error('admin delete requirement error', err);
    return res.status(500).json({ msg: 'Server error' });
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

// --- NEW: Category & Product endpoints ---

// GET categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await Category.find().sort({ createdAt: -1 });
    res.json(cats);
  } catch (err) { console.error('get categories err', err); res.status(500).json({ msg: 'Server error' }); }
});

// POST create category (optional single image field name 'image')
router.post('/categories', upload.single('image'), async (req, res) => {
  try {
    const name = req.body.name ? String(req.body.name).trim() : '';
    if (!name) return res.status(400).json({ msg: 'Category name required' });

    let imageUrl = '';
    if (req.file && req.file.buffer) {
      imageUrl = await uploadBuffer(req.file.buffer, 'categories');
    }

    const c = new Category({ name, imageUrl });
    await c.save();
    res.json(c);
  } catch (err) { console.error('create category err', err); res.status(500).json({ msg: 'Server error' }); }
});

// GET products for a category
router.get('/categories/:id/products', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { console.error('get products err', err); res.status(500).json({ msg: 'Server error' }); }
});

// POST create a product for a category (image field 'image')
router.post('/categories/:id/products', upload.single('image'), async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ msg: 'Category not found' });

    const name = req.body.name ? String(req.body.name).trim() : '';
    const mrp = req.body.mrp ? Number(req.body.mrp) : 0;
    const discountedMrp = req.body.discountedMrp ? Number(req.body.discountedMrp) : 0;

    if (!name || !mrp || mrp <= 0) return res.status(400).json({ msg: 'Product name and valid MRP required' });

    let imageUrl = '';
    if (req.file && req.file.buffer) {
      imageUrl = await uploadBuffer(req.file.buffer, 'products');
    }

    const p = new Product({ category: cat._id, name, mrp, discountedMrp, imageUrl });
    await p.save();
    res.json(p);
  } catch (err) { console.error('create product err', err); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
