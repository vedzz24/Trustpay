const mongoose = require('mongoose');

const razorpayOrderOwnerSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true, immutable: true },
  merchantId: { type: String, required: true, index: true, immutable: true },
  trustpayTransactionId: { type: String, required: true, unique: true, immutable: true },
  amountPaise: { type: Number, required: true, immutable: true },
}, { timestamps: true, collection: 'razorpayOrderOwners' });

module.exports = mongoose.models.RazorpayOrderOwner
  || mongoose.model('RazorpayOrderOwner', razorpayOrderOwnerSchema);
