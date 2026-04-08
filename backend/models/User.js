const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // plain-text for demo; hash in production
  role:     { type: String, enum: ['user', 'merchant'], default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
