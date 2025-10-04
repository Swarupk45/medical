
// middleware/adminAuth.js
require('dotenv').config();

module.exports = function(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'] || (req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null);
  if (!adminSecret) return res.status(401).json({ msg: 'Admin secret missing' });
  if (adminSecret !== process.env.ADMIN_SECRET) return res.status(401).json({ msg: 'Invalid admin secret' });
  next();
};
