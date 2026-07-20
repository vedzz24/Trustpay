const mongoose = require('mongoose');

const OtpAlertSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  detectedKeywords: [{ type: String }],
  actionTaken: { type: String, default: 'Blocked' },
  time: { type: Date, default: () => new Date() }
}, { timestamps: true });

module.exports = mongoose.model('OtpAlert', OtpAlertSchema);
