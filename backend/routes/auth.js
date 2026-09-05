const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const router = require('express').Router();
const User = require('../models/User');
const GuardianInvitation = require('../models/GuardianInvitation');
const GuardianLink = require('../models/GuardianLink');
const { generateToken, requireMerchant, JWT_SECRET } = require('../utils/auth');
const { hashPassword, verifyPassword } = require('../utils/passwords');
const { generateMerchantId } = require('../utils/merchant');
const { initializeMerchantDatabase } = require('../utils/merchantDb');
const { normalizePhoneNumber, maskPhoneNumber } = require('../utils/phone');
const { issueOtp, consumeOtp } = require('../services/otp');
const { sendUserWelcomeEmail, sendMerchantWelcomeEmail, sendGuardianAcceptedEmail } = require('../services/email');

const roles = new Set(['user', 'merchant', 'guardian']);
const invitationHash = token => crypto.createHash('sha256').update(token).digest('hex');
const roleLabel = role => role.charAt(0).toUpperCase() + role.slice(1);

function serializeUser(user) {
  return { id: user._id, name: user.merchantName || user.name, merchantName: user.merchantName, email: user.email, phoneNumber: user.phoneNumber, role: user.role, merchantId: user.merchantId, businessName: user.businessName, upiId: user.upiId, profilePhoto: user.profilePhoto };
}
function makeOnboardingToken(identity) { return jwt.sign({ ...identity, purpose: 'auth-onboarding' }, JWT_SECRET, { expiresIn: '15m' }); }
function readOnboardingToken(token) {
  const identity = jwt.verify(token, JWT_SECRET);
  if (identity.purpose !== 'auth-onboarding') throw new Error('Invalid onboarding token');
  return identity;
}
async function safelySendWelcome(user) {
  if (!user.email) return undefined;
  try {
    if (user.role === 'merchant') await sendMerchantWelcomeEmail({ email: user.email, merchantName: user.merchantName, businessName: user.businessName, merchantId: user.merchantId, upiId: user.upiId });
    else if (user.role === 'user') await sendUserWelcomeEmail({ email: user.email, name: user.name });
    return 'sent';
  } catch (_) {
    console.error(`${roleLabel(user.role)} welcome email delivery failed`);
    return 'failed';
  }
}
async function activateInvitation(token, guardian) {
  if (!token) return false;
  const invitation = await GuardianInvitation.findOne({ tokenHash: invitationHash(token), status: 'pending' }).select('+tokenHash');
  if (!invitation || invitation.expiresAt <= new Date() || invitation.guardianEmail !== guardian.email) return false;
  const protectedUser = await User.findById(invitation.userId);
  if (!protectedUser || protectedUser.role !== 'user') return false;
  await GuardianLink.findOneAndUpdate(
    { guardianId: guardian._id, protectedUserId: protectedUser._id },
    { guardianName: guardian.name, guardianEmail: guardian.email, protectedUserName: protectedUser.name, protectedUserEmail: protectedUser.email, status: 'accepted', acceptedAt: new Date(), $unset: { removedAt: 1, rejectedAt: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  invitation.status = 'accepted'; invitation.acceptedAt = new Date(); await invitation.save();
  await Promise.allSettled([
    sendGuardianAcceptedEmail({ email: guardian.email, userName: protectedUser?.name || 'the protected user', guardianName: guardian.name, guardianEmail: guardian.email, audience: 'guardian' }),
    protectedUser?.email ? sendGuardianAcceptedEmail({ email: protectedUser.email, userName: protectedUser.name, guardianName: guardian.name, guardianEmail: guardian.email, audience: 'user' }) : Promise.resolve(),
  ]);
  return true;
}
async function finishMerchant(data, identity) {
  const email = String(data.email || identity.email || '').toLowerCase().trim();
  if (!email || !data.merchantName || !data.businessName) throw Object.assign(new Error('Merchant name, business name and email are required'), { status: 400 });
  if (await User.exists({ $or: [{ email }, ...(identity.phoneNumber ? [{ phoneNumber: identity.phoneNumber }] : [])] })) throw Object.assign(new Error('An account with this identity already exists'), { status: 409 });
  const merchantId = await generateMerchantId();
  const passwordHash = data.password ? hashPassword(data.password) : undefined;
  if (!identity.googleSub && !passwordHash) throw Object.assign(new Error('A password is required to complete merchant onboarding'), { status: 400 });
  const merchant = await User.create({ name: data.merchantName, merchantName: data.merchantName, businessName: data.businessName, email, phoneNumber: identity.phoneNumber, phoneVerifiedAt: identity.phoneNumber ? new Date() : undefined, passwordHash, role: 'merchant', merchantId, upiId: data.upiId || `${merchantId.toLowerCase()}@trustpay`, googleSub: identity.googleSub, googleLinked: Boolean(identity.googleSub), profilePhoto: identity.profilePhoto });
  try { await initializeMerchantDatabase(merchantId); } catch (error) { await User.deleteOne({ _id: merchant._id }); throw error; }
  return merchant;
}

router.get('/me', requireMerchant, async (req, res) => {
  const merchant = await User.findById(req.user.id);
  if (!merchant || merchant.role !== 'merchant') return res.status(404).json({ success: false, message: 'Merchant not found' });
  return res.json({ success: true, user: { _id: merchant._id, name: merchant.merchantName || merchant.name, role: merchant.role, merchantId: merchant.merchantId, merchantName: merchant.merchantName, businessName: merchant.businessName, upiId: merchant.upiId } });
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'user', phoneNumber, businessName, upiId } = req.body;
    if (!roles.has(role) || !name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, password and a valid role are required' });
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : undefined;
    if (await User.exists({ $or: [{ email: normalizedEmail }, ...(normalizedPhone ? [{ phoneNumber: normalizedPhone }] : [])] })) return res.status(409).json({ success: false, message: 'An account with this email or phone number already exists' });
    let user;
    if (role === 'merchant') user = await finishMerchant({ merchantName: name, businessName: businessName || name, email: normalizedEmail, password, upiId }, { phoneNumber: normalizedPhone });
    else user = await User.create({ name, email: normalizedEmail, phoneNumber: normalizedPhone, password: hashPassword(password), role });
    const emailStatus = await safelySendWelcome(user);
    return res.json({ success: true, token: generateToken(user), user: serializeUser(user), ...(emailStatus ? { emailStatus } : {}) });
  } catch (error) {
    console.error('signup error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !roles.has(role)) return res.status(400).json({ success: false, message: 'Email, password and account type are required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    const stored = user?.passwordHash || user?.password;
    if (!user || !stored || !verifyPassword(password, stored)) return res.status(401).json({ success: false, message: 'Incorrect email or password' });
    if (user.role !== role) return res.status(403).json({ success: false, code: 'WRONG_ROLE', message: `This account is registered as a ${roleLabel(user.role)}. Select ${roleLabel(user.role)} to continue.` });
    if (user.role === 'merchant') {
      if (!user.merchantId) user.merchantId = await generateMerchantId();
      if (!user.merchantName) user.merchantName = user.name;
      if (!user.businessName) user.businessName = user.name;
      if (!user.upiId) user.upiId = `${user.merchantId.toLowerCase()}@trustpay`;
      if (!user.passwordHash) user.passwordHash = stored;
      await user.save(); await initializeMerchantDatabase(user.merchantId);
    }
    return res.json({ success: true, token: generateToken(user), user: serializeUser(user) });
  } catch (error) { console.error('login error:', error.message); return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/send-otp', async (req, res) => {
  try {
    if (!roles.has(req.body.role)) return res.status(400).json({ success: false, message: 'Select a valid account type' });
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    await issueOtp(phoneNumber, req.body.role);
    return res.json({ success: true, message: 'Verification code sent', phoneNumber: maskPhoneNumber(phoneNumber) });
  } catch (error) {
    const configuration = ['SMS_NOT_CONFIGURED', 'OTP_NOT_CONFIGURED'].includes(error.code);
    const status = configuration ? 503 : error.code?.includes('OTP_') ? 429 : 400;
    console.error(`OTP delivery failed: ${error.code || 'invalid request'}`);
    return res.status(status).json({ success: false, code: error.code, message: configuration && process.env.NODE_ENV !== 'production' ? `${error.message}. Configure the backend SMS/OTP environment variables.` : ['OTP_COOLDOWN', 'OTP_RATE_LIMIT'].includes(error.code) ? error.message : 'We could not send the verification code. Please try again.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const role = req.body.role;
    if (!roles.has(role)) return res.status(400).json({ success: false, message: 'Select a valid account type' });
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    if (!/^\d{6}$/.test(String(req.body.otp || '')) || !await consumeOtp(phoneNumber, role, req.body.otp)) return res.status(400).json({ success: false, message: 'Incorrect or expired code.' });
    const user = await User.findOne({ phoneNumber });
    if (user) {
      if (user.role !== role) return res.status(403).json({ success: false, code: 'WRONG_ROLE', message: 'This phone number belongs to a different TrustPay account type.' });
      if (!user.phoneVerifiedAt) { user.phoneVerifiedAt = new Date(); await user.save(); }
      return res.json({ success: true, token: generateToken(user), user: serializeUser(user) });
    }
    return res.json({ success: true, requiresProfileCompletion: role !== 'merchant', requiresMerchantOnboarding: role === 'merchant', onboardingToken: makeOnboardingToken({ role, phoneNumber }) });
  } catch (_) { return res.status(400).json({ success: false, message: 'Incorrect or expired code.' }); }
});

router.post('/google', async (req, res) => {
  try {
    const { credential, role, invitationToken } = req.body;
    if (!credential || !roles.has(role)) return res.status(400).json({ success: false, message: 'Google credential and account type are required.' });
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, message: 'Google sign-in is not configured.' });
    const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) throw new Error('Unverified Google identity');
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleSub: payload.sub }, { email }] }).select('+googleSub');
    if (user) {
      if (user.role !== role) return res.status(403).json({ success: false, code: 'WRONG_ROLE', message: 'This account belongs to a different TrustPay account type.' });
      if (user.googleSub && user.googleSub !== payload.sub) return res.status(409).json({ success: false, message: 'Google sign-in could not be linked to this account.' });
      if (!user.googleSub) { user.googleSub = payload.sub; user.googleLinked = true; user.profilePhoto = payload.picture; await user.save(); }
      const accepted = role === 'guardian' ? await activateInvitation(invitationToken, user) : false;
      return res.json({ success: true, token: generateToken(user), user: serializeUser(user), guardianInvitationAccepted: accepted });
    }
    if (role === 'merchant') return res.json({ success: true, requiresMerchantOnboarding: true, onboardingToken: makeOnboardingToken({ role, googleSub: payload.sub, email, name: payload.name, profilePhoto: payload.picture }) });
    user = await User.create({ name: payload.name || email.split('@')[0], email, role, googleSub: payload.sub, googleLinked: true, profilePhoto: payload.picture });
    const emailStatus = await safelySendWelcome(user);
    const accepted = role === 'guardian' ? await activateInvitation(invitationToken, user) : false;
    return res.json({ success: true, token: generateToken(user), user: serializeUser(user), emailStatus, guardianInvitationAccepted: accepted });
  } catch (_) { console.error('Google identity verification failed'); return res.status(401).json({ success: false, message: 'Google sign-in could not be verified.' }); }
});

router.post('/complete-onboarding', async (req, res) => {
  try {
    const identity = readOnboardingToken(req.body.onboardingToken);
    let user;
    if (identity.role === 'merchant') user = await finishMerchant(req.body, identity);
    else {
      const email = String(req.body.email || identity.email || '').toLowerCase().trim();
      if (!req.body.name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });
      if (await User.exists({ $or: [{ email }, ...(identity.phoneNumber ? [{ phoneNumber: identity.phoneNumber }] : [])] })) return res.status(409).json({ success: false, message: 'An account with this identity already exists' });
      user = await User.create({ name: req.body.name, email, phoneNumber: identity.phoneNumber, phoneVerifiedAt: identity.phoneNumber ? new Date() : undefined, password: req.body.password ? hashPassword(req.body.password) : undefined, role: identity.role, googleSub: identity.googleSub, googleLinked: Boolean(identity.googleSub), profilePhoto: identity.profilePhoto });
    }
    const emailStatus = await safelySendWelcome(user);
    return res.json({ success: true, token: generateToken(user), user: serializeUser(user), emailStatus });
  } catch (error) { console.error('onboarding error:', error.message); return res.status(error.status || 400).json({ success: false, message: error.status ? error.message : 'Onboarding session is invalid or expired.' }); }
});

module.exports = router;
