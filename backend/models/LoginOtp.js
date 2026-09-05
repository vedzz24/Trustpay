const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, index: true, immutable: true },
  role: { type: String, enum: ['user', 'merchant', 'guardian'], required: true, index: true, immutable: true },
  otpHash: { type: String, required: true, select: false },
  salt: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  attemptCount: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false, index: true },
  providerMessageId: { type: String, select: false },
}, { timestamps: true, collection: 'loginOtps', autoIndex: false });

schema.index({ phoneNumber: 1, role: 1, createdAt: -1 });
// Keep expired OTP audit records for 24 hours, then let MongoDB remove them.
// This is the only expiresAt index declaration for this schema.
schema.index({ expiresAt: 1 }, { name: 'expiresAt_1', expireAfterSeconds: 86400 });

module.exports = mongoose.models.LoginOtp || mongoose.model('LoginOtp', schema);
