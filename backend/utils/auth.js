const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'trustpay_super_secret_jwt_key_123';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query?.accessToken;

  if (token == null) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const identity = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(identity.id);
    if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists' });

    // Always rebuild the request identity from the database. Request body/query/URL
    // values and stale JWT claims can never select a different merchant.
    req.user = {
      id: user._id.toString(),
      role: user.role,
      merchantId: user.role === 'merchant' ? user.merchantId : undefined,
      name: user.merchantName || user.name,
      email: user.email,
    };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}

function requireMerchant(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'merchant' || !req.user.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied: Merchant only' });
    }
    next();
  });
}

function requireUser(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Access denied: User account required' });
    next();
  });
}

function requireGuardian(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'guardian') return res.status(403).json({ success: false, message: 'Access denied: Guardian only' });
    next();
  });
}

function optionalUser(req, res, next) {
  if (!req.headers.authorization) return next();
  authenticateToken(req, res, () => next());
}

function generateToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role, 
      merchantId: user.merchantId,
      name: user.merchantName || user.name,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticateToken, requireMerchant, requireUser, requireGuardian, optionalUser, generateToken, JWT_SECRET };
