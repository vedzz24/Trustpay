const mongoose = require('mongoose');

const FamilyAlertSchema = new mongoose.Schema({
  elderlyName: { type: String, required: true },
  amount:      { type: Number, required: true },
  note:        { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  time:        { type: Number, default: () => Date.now() },
}, { timestamps: true });

module.exports = mongoose.model('FamilyAlert', FamilyAlertSchema);
