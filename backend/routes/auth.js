const router  = require('express').Router();
const User    = require('../models/User');
const crypto  = require('crypto');

const otpStore = new Map();

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
    const { name, email, password, role, phoneNumber } = req.body;
    if (!name)
      return res.status(400).json({ success: false, message: 'Name is required' });

    if (!email && !phoneNumber)
      return res.status(400).json({ success: false, message: 'Email or Phone Number is required' });

    if (email) {
      const exists = await User.findOne({ email });
      if (exists)
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    if (phoneNumber) {
      const exists = await User.findOne({ phoneNumber });
      if (exists)
        return res.status(400).json({ success: false, message: 'An account with this phone number already exists' });
    }

    let hashedPassword;
    if (password) {
      hashedPassword = hashPassword(password);
    }

    const user = await User.create({
      name,
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
      password: hashedPassword,
      role: role || 'user'
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !user.password || !verifyPassword(password, user.password))
      return res.status(401).json({ success: false, message: 'Incorrect email or password' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in-memory for 5 minutes
    otpStore.set(phoneNumber, {
      otp,
      expires: Date.now() + 5 * 60 * 1000
    });

    console.log(`[OTP MOCK] OTP for ${phoneNumber} is ${otp}`);

    res.json({
      success: true,
      message: `OTP sent successfully. Code: ${otp}`,
      otp // Return OTP directly in response for local demo/toast access
    });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, role, name } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const record = otpStore.get(phoneNumber);
    if (!record || record.otp !== otp || record.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Clean up OTP
    otpStore.delete(phoneNumber);

    // Find or create user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      const tempName = name || `User ${phoneNumber.slice(-4)}`;
      user = await User.create({
        name: tempName,
        phoneNumber,
        role: role || 'user'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Email and name are required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        role: role || 'user'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (err) {
    console.error('google login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
