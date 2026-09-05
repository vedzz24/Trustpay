const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const GuardianLink = require('../models/GuardianLink');
const GuardianAlert = require('../models/GuardianAlert');
const { requireGuardian, generateToken } = require('../utils/auth');
const { hashPassword, verifyPassword } = require('../utils/passwords');

const emailPattern = /^\S+@\S+\.\S+$/;
const safeAccount = account => ({ id: account._id, name: account.name, email: account.email, role: account.role });
const publicAlert = alert => ({ id: alert._id, alertId: alert.alertId,
  protectedUser: alert.protectedUserId && typeof alert.protectedUserId === 'object' ? { id: alert.protectedUserId._id, name: alert.protectedUserId.name, email: alert.protectedUserId.email } : null,
  protectedUserId: alert.protectedUserId?._id || alert.protectedUserId, alertType: alert.alertType, riskLevel: alert.riskLevel,
  reason: alert.reason, riskReasons: alert.riskReasons, transactionId: alert.transactionId, qrInfo: alert.qrInfo,
  status: alert.status, createdAt: alert.createdAt, resolvedAt: alert.resolvedAt });

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim(); const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || ''); const confirmPassword = req.body.confirmPassword == null ? password : String(req.body.confirmPassword);
  if (name.length < 2 || !emailPattern.test(email) || password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: 'Enter a valid full name, email and password of at least 8 characters.' });
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  if (await User.exists({ email })) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  const guardian = await User.create({ name, email, passwordHash: hashPassword(password), role: 'guardian' });
  return res.status(201).json({ success: true, token: generateToken(guardian), user: safeAccount(guardian) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(); const guardian = await User.findOne({ email, role: 'guardian' }).select('+passwordHash');
  if (!guardian || !verifyPassword(String(req.body.password || ''), guardian.passwordHash || guardian.password)) return res.status(401).json({ success: false, message: 'Incorrect guardian email or password.' });
  return res.json({ success: true, token: generateToken(guardian), user: safeAccount(guardian) });
});

router.post('/link-request', requireGuardian, async (req, res) => {
  const email = String(req.body.protectedUserEmail || '').trim().toLowerCase();
  if (!emailPattern.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid protected user email.' });
  if (email === req.user.email) return res.status(400).json({ success: false, message: 'You cannot link your own email.' });
  const protectedUser = await User.findOne({ email }).select('name email role').lean();
  if (!protectedUser) return res.status(404).json({ success: false, message: 'No TrustPay user found with this email.' });
  if (protectedUser.role !== 'user') return res.status(400).json({ success: false, message: 'Only normal TrustPay users can be protected.' });
  const existing = await GuardianLink.findOne({ guardianId: req.user.id, protectedUserId: protectedUser._id });
  if (existing?.status === 'accepted') return res.status(409).json({ success: false, message: 'This user is already protected by you.' });
  if (existing?.status === 'pending') return res.status(409).json({ success: false, message: 'A protection request is already pending.' });
  const values = { guardianName: req.user.name, guardianEmail: req.user.email, protectedUserName: protectedUser.name, protectedUserEmail: protectedUser.email, status: 'pending' };
  if (existing) await GuardianLink.updateOne({ _id: existing._id }, { $set: values, $unset: { acceptedAt: 1, rejectedAt: 1, removedAt: 1 } });
  else await GuardianLink.create({ guardianId: req.user.id, protectedUserId: protectedUser._id, ...values });
  return res.status(201).json({ success: true, message: 'Protection request sent successfully.' });
});

router.get('/link-requests', requireGuardian, async (req, res) => {
  const pendingRequests = await GuardianLink.find({ guardianId: req.user.id, status: 'pending' }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, pendingRequests });
});

router.get('/protected-users', requireGuardian, async (req, res) => {
  const links = await GuardianLink.find({ guardianId: req.user.id, status: 'accepted' }).sort({ acceptedAt: -1 }).lean();
  const userIds = links.map(link => link.protectedUserId);
  const [users, alertCounts] = await Promise.all([
    User.find({ _id: { $in: userIds }, role: 'user' }).select('name email profilePhoto updatedAt').lean(),
    GuardianAlert.aggregate([{ $match: { guardianId: new mongoose.Types.ObjectId(req.user.id), protectedUserId: { $in: userIds } } },
      { $group: { _id: '$protectedUserId', securityAlerts: { $sum: 1 }, highRisk: { $sum: { $cond: [{ $in: ['$riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0] } }, lastActivity: { $max: '$createdAt' } } }]),
  ]);
  const counts = new Map(alertCounts.map(row => [String(row._id), row])); const byId = new Map(users.map(user => [String(user._id), user]));
  const protectedUsers = links.map(link => { const user = byId.get(String(link.protectedUserId)); const stats = counts.get(String(link.protectedUserId)); return {
    id: link.protectedUserId, linkId: link._id, name: user?.name || link.protectedUserName, email: user?.email || link.protectedUserEmail,
    avatar: user?.profilePhoto, status: 'ACTIVE', linkedAt: link.acceptedAt, securityAlerts: stats?.securityAlerts || 0,
    highRisk: stats?.highRisk || 0, lastActivity: stats?.lastActivity || user?.updatedAt || link.acceptedAt }; });
  return res.json({ success: true, protectedUserCount: protectedUsers.length, protectedUsers });
});

router.delete('/protected-users/:id', requireGuardian, async (req, res) => {
  const selector = mongoose.isValidObjectId(req.params.id) ? { $or: [{ _id: req.params.id }, { protectedUserId: req.params.id }] } : { _id: null };
  const link = await GuardianLink.findOneAndUpdate({ guardianId: req.user.id, status: { $in: ['accepted', 'pending'] }, ...selector }, { status: 'removed', removedAt: new Date() }, { new: true });
  if (!link) return res.status(404).json({ success: false, message: 'Protected user or pending request not found.' });
  return res.json({ success: true, message: 'Protection removed.' });
});

router.get('/alerts', requireGuardian, async (req, res) => {
  const query = { guardianId: req.user.id }; if (req.query.userId) query.protectedUserId = req.query.userId;
  if (req.query.riskLevel) query.riskLevel = String(req.query.riskLevel).toUpperCase(); if (req.query.status) query.status = req.query.status;
  const alerts = await GuardianAlert.find(query).populate('protectedUserId', 'name email').sort({ createdAt: -1 }).limit(250).lean();
  return res.json({ success: true, guardianAlerts: alerts.map(publicAlert) });
});

router.get('/alerts/:id', requireGuardian, async (req, res) => {
  const identity = mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }, { alertId: req.params.id }] : [{ alertId: req.params.id }];
  const alert = await GuardianAlert.findOne({ guardianId: req.user.id, $or: identity }).populate('protectedUserId', 'name email').lean();
  if (!alert) return res.status(404).json({ success: false, message: 'Guardian alert not found.' });
  return res.json({ success: true, alert: publicAlert(alert) });
});

router.patch('/alerts/:id/resolve', requireGuardian, async (req, res) => {
  const identity = mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }, { alertId: req.params.id }] : [{ alertId: req.params.id }];
  const alert = await GuardianAlert.findOneAndUpdate({ guardianId: req.user.id, $or: identity }, { status: 'resolved', resolvedAt: new Date() }, { new: true });
  if (!alert) return res.status(404).json({ success: false, message: 'Guardian alert not found.' });
  return res.json({ success: true, alert });
});

router.get('/dashboard', requireGuardian, async (req, res) => {
  const links = await GuardianLink.find({ guardianId: req.user.id, status: 'accepted' }).select('protectedUserId').lean(); const userIds = links.map(link => link.protectedUserId);
  const match = { guardianId: req.user.id, protectedUserId: { $in: userIds } };
  const [alerts, activeAlerts, highRiskAlerts, resolvedAlerts] = await Promise.all([
    GuardianAlert.find(match).populate('protectedUserId', 'name email').sort({ createdAt: -1 }).limit(8).lean(),
    GuardianAlert.countDocuments({ ...match, status: 'active' }), GuardianAlert.countDocuments({ ...match, status: 'active', riskLevel: { $in: ['HIGH', 'CRITICAL'] } }),
    GuardianAlert.countDocuments({ ...match, status: 'resolved' })]);
  return res.json({ success: true, summary: { protectedUsers: links.length, activeAlerts, highRiskAlerts, resolvedAlerts }, recentAlerts: alerts.map(publicAlert) });
});

module.exports = router;
