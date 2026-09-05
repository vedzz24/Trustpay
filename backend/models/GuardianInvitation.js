const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  invitationId: { type: String, required: true, unique: true, immutable: true },
  tokenHash: { type: String, required: true, unique: true, select: false, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  guardianEmail: { type: String, required: true, lowercase: true, trim: true, index: true, immutable: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired', 'cancelled'], default: 'pending', index: true },
  expiresAt: { type: Date, required: true, index: true, immutable: true },
  acceptedAt: Date,
}, { timestamps: true, collection: 'guardianInvitations' });

module.exports = mongoose.models.GuardianInvitation || mongoose.model('GuardianInvitation', schema);
