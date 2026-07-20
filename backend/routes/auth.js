const router  = require('express').Router();
const User    = require('../models/User');
const crypto  = require('crypto');

// Helper to hash password with salt using PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

// Helper to verify password (supports plain-text fallback for pre-existing users)
function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.startsWith('pbkdf2$')) {
    return password === storedPassword;
  }
  const parts = storedPassword.split('$');
  const salt = parts[1];
  const hash = parts[2];
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });

    const hashedPassword = hashPassword(password);
    const user = await User.create({ name, email, password: hashedPassword, role: role || 'user' });
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !verifyPassword(password, user.password))
      return res.status(401).json({ success: false, message: 'Incorrect email or password' });

    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
