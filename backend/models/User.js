const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, unique: true, sparse: true, lowercase: true, trim: true, required: function requireMerchantEmail() { return this.role === 'merchant'; } },
  phoneNumber: { type: String, unique: true, sparse: true, trim: true },
  phoneVerifiedAt: { type: Date },
  googleSub:   { type: String, unique: true, sparse: true, select: false },
  googleLinked:{ type: Boolean, default: false },
  profilePhoto:{ type: String, trim: true },
  password:    { type: String, required: false }, // Legacy field retained for existing non-merchant accounts
  passwordHash:{ type: String, required: function requireMerchantPassword() { return this.role === 'merchant' && !this.googleLinked; }, select: false },
  role:        { type: String, enum: ['user', 'merchant', 'guardian'], default: 'user' },
  merchantId:  { type: String, unique: true, sparse: true, immutable: true, trim: true, required: function requireMerchantId() { return this.role === 'merchant'; } },
  merchantName:{ type: String, trim: true, required: function requireMerchantName() { return this.role === 'merchant'; } },
  businessName:{ type: String, trim: true, required: function requireBusinessName() { return this.role === 'merchant'; } },
  upiId:       { type: String, unique: true, sparse: true, trim: true, required: function requireMerchantUpi() { return this.role === 'merchant'; } },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
