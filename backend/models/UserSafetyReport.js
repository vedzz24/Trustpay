const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  checkType: { type: String, enum: ['QR', 'MESSAGE', 'OTP', 'PAYMENT_PROOF', 'SHIELD'], required: true },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NORMAL', 'SUSPICIOUS', 'UNKNOWN'], required: true },
  resultCode: { type: String, required: true },
  summary: { type: String, required: true, maxlength: 500 },
}, { timestamps: true, collection: 'userSafetyReports' });

module.exports = mongoose.models.UserSafetyReport || mongoose.model('UserSafetyReport', schema);
