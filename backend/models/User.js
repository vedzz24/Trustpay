const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phoneNumber: { type: String, unique: true, sparse: true, trim: true },
  password:    { type: String, required: false }, // plain-text or PBKDF2 hash, not required for Google/Phone auth
  role:        { type: String, enum: ['user', 'merchant', 'guardian'], default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
