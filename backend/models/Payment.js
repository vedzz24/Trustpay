const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  txnId:  { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  name:   { type: String, default: 'Anonymous' },   // Indian name of payer
  note:   { type: String, default: '' },
  method: { type: String, default: 'UPI' },
  status: {
    type: String,
    enum: ['pending', 'verified', 'suspicious', 'unmatched'],
    default: 'pending',
  },
  proofLink: { type: String },  // e.g. trustpay-verify:TRX...
  time:      { type: Number, default: () => Date.now() }, // Unix ms timestamp
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
