const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  protectedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  guardianName: { type: String, required: true, trim: true },
  guardianEmail: { type: String, required: true, lowercase: true, trim: true },
  protectedUserName: { type: String, required: true, trim: true },
  protectedUserEmail: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'removed'], default: 'pending', index: true },
  acceptedAt: Date,
  rejectedAt: Date,
  removedAt: Date,
}, { timestamps: true, collection: 'guardianLinks' });

schema.index({ guardianId: 1, protectedUserId: 1 }, { unique: true });
schema.index({ guardianId: 1, status: 1, createdAt: -1 });
schema.index({ protectedUserId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.models.GuardianLink || mongoose.model('GuardianLink', schema);
