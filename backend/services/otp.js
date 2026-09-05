const crypto = require('crypto');
const LoginOtp = require('../models/LoginOtp');
const { sendLoginOtp } = require('./sms');

const expiryMinutes = () => Number(process.env.OTP_EXPIRES_MINUTES || 5);
const cooldownSeconds = () => Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const maxAttempts = () => Number(process.env.OTP_MAX_ATTEMPTS || 5);
const maxSends = () => Number(process.env.OTP_MAX_SENDS_PER_HOUR || 5);

function otpDigest(otp, salt) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    const error = new Error('OTP hashing is not configured');
    error.code = 'OTP_NOT_CONFIGURED';
    throw error;
  }
  return crypto.createHmac('sha256', secret).update(`${salt}:${otp}`).digest('hex');
}

async function issueOtp(phoneNumber, role) {
  const now = new Date();
  const latest = await LoginOtp.findOne({ phoneNumber, role }).sort({ createdAt: -1 }).lean();
  if (latest && now - latest.createdAt < cooldownSeconds() * 1000) {
    const error = new Error('Please wait before requesting another code.');
    error.code = 'OTP_COOLDOWN';
    throw error;
  }
  const sentLastHour = await LoginOtp.countDocuments({ phoneNumber, role, createdAt: { $gte: new Date(now - 3600000) } });
  if (sentLastHour >= maxSends()) {
    const error = new Error('Too many code requests. Please try again later.');
    error.code = 'OTP_RATE_LIMIT';
    throw error;
  }

  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  const record = await LoginOtp.create({
    phoneNumber, role, salt, otpHash: otpDigest(otp, salt),
    expiresAt: new Date(now.getTime() + expiryMinutes() * 60000),
  });
  try {
    const delivery = await sendLoginOtp(phoneNumber, otp);
    record.providerMessageId = delivery.messageId;
    await record.save();
  } catch (error) {
    await LoginOtp.deleteOne({ _id: record._id });
    throw error;
  }
}

async function consumeOtp(phoneNumber, role, otp) {
  const record = await LoginOtp.findOne({ phoneNumber, role, consumed: false }).sort({ createdAt: -1 }).select('+otpHash +salt');
  if (!record || record.expiresAt <= new Date() || record.attemptCount >= maxAttempts()) return false;
  const actual = Buffer.from(otpDigest(String(otp), record.salt), 'hex');
  const expected = Buffer.from(record.otpHash, 'hex');
  const valid = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!valid) {
    await LoginOtp.updateOne({ _id: record._id, consumed: false }, { $inc: { attemptCount: 1 } });
    return false;
  }
  const consumed = await LoginOtp.findOneAndUpdate(
    { _id: record._id, consumed: false, expiresAt: { $gt: new Date() }, attemptCount: { $lt: maxAttempts() } },
    { $set: { consumed: true }, $inc: { attemptCount: 1 } },
    { new: true },
  );
  return Boolean(consumed);
}

module.exports = { issueOtp, consumeOtp };
