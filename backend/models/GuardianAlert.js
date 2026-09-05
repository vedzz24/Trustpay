const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true, immutable: true },
  protectedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  alertType: { type: String, required: true, trim: true },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  reason: { type: String, required: true, maxlength: 500 },
  riskReasons: { type: [String], default: [] },
  transactionId: { type: String, trim: true },
  qrInfo: { type: String, maxlength: 300 },
  status: { type: String, enum: ['active', 'resolved'], default: 'active', index: true },
  resolvedAt: Date,
}, { timestamps: true, collection: 'guardianAlerts' });

schema.index({ guardianId: 1, status: 1, createdAt: -1 });
schema.index({ guardianId: 1, protectedUserId: 1, createdAt: -1 });
module.exports = mongoose.models.GuardianAlert || mongoose.model('GuardianAlert', schema);
