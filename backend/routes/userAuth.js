const router = require('express').Router();
const User = require('../models/User');
const UserSafetyReport = require('../models/UserSafetyReport');
const { hashPassword, verifyPassword } = require('../utils/passwords');
const { generateToken, requireUser } = require('../utils/auth');
const { sendUserWelcomeEmail } = require('../services/email');
const GuardianLink = require('../models/GuardianLink');

const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role });

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 100) return res.status(400).json({ success: false, message: 'Enter your name.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: 'Password must be 8–128 characters.' });
  try {
    if (await User.exists({ email })) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const user = await User.create({ name, email, passwordHash: hashPassword(password), role: 'user' });
    let emailStatus = 'sent';
    try { await sendUserWelcomeEmail({ email, name }); }
    catch (_) { emailStatus = 'failed'; console.error('User welcome email delivery failed'); }
    return res.status(201).json({ success: true, token: generateToken(user), user: publicUser(user), emailStatus,
      message: emailStatus === 'sent' ? 'Account created successfully.' : 'Account created. Confirmation email could not be sent right now.' });
  } catch (error) {
    console.error('User registration failed:', error.message);
    return res.status(500).json({ success: false, message: 'Account could not be created.' });
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email, role: 'user' }).select('+passwordHash');
  if (!user || !verifyPassword(password, user.passwordHash || user.password)) return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
  return res.json({ success: true, token: generateToken(user), user: publicUser(user) });
});

router.get('/me', requireUser, async (req, res) => {
  const [reports, link, pendingGuardianRequests] = await Promise.all([
    UserSafetyReport.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean(),
    GuardianLink.findOne({ $or: [{ protectedUserId: req.user.id, status: 'accepted' }, { userId: req.user.id, status: 'active' }] }).lean(),
    GuardianLink.countDocuments({ protectedUserId: req.user.id, status: 'pending' }),
  ]);
  let guardian = null;
  if (link) guardian = await User.findById(link.guardianId).select('name email').lean();
  return res.json({ success: true, user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }, reports,
    guardianStatus: link ? 'ACTIVE' : 'NOT_LINKED', guardian: guardian ? { name: guardian.name, email: guardian.email } : null, pendingGuardianRequests });
});

module.exports = router;
