const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  txnId: { type: String, required: true, unique: true },
  merchantId: { type: String, immutable: true, index: true },
  razorpayOrderId: { type: String, sparse: true },
  razorpayPaymentId: { type: String, sparse: true },
  referenceId: { type: String, sparse: true },
  utr: { type: String, sparse: true },
  gatewayStatus: String,
  webhookSignatureValid: Boolean,
  duplicateEvent: { type: Boolean, default: false },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  billRef: { type: String, default: '' },
  name: { type: String, default: 'Anonymous' },
  note: { type: String, default: '' },
  method: { type: String, default: 'UPI' },
  status: {
    type: String,
    enum: ['pending', 'verified', 'suspicious', 'unmatched', 'failed'],
    default: 'pending',
  },
  proofLink: String,
  hash: String,
  screenshotAnalyzed: { type: Boolean, default: false },
  screenshotReport: mongoose.Schema.Types.Mixed,
  time: { type: Number, default: () => Date.now() },
  verifiedAt: Date,
}, { timestamps: true });

const billSchema = new mongoose.Schema({
  reference: { type: String, index: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'open' },
  details: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const fraudAlertSchema = new mongoose.Schema({
  category: { type: String, required: true },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  message: { type: String, default: '' },
  detectedKeywords: [String],
  actionTaken: { type: String, default: 'Blocked' },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const webhookLogSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  eventId: { type: String },
  eventType: String,
  payload: mongoose.Schema.Types.Mixed,
  processed: { type: Boolean, default: false },
  error: String,
}, { timestamps: true, autoIndex: false });

// One canonical declaration. The explicit name avoids colliding with the
// legacy non-unique `eventId_1` index while it is safely migrated.
webhookLogSchema.index(
  { eventId: 1 },
  { name: 'eventId_unique_sparse', unique: true, sparse: true },
);

const securityEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, immutable: true },
  merchantId: { type: String, required: true, immutable: true, index: true },
  type: {
    type: String,
    required: true,
    enum: [
      'PAYMENT_VERIFIED', 'INVALID_WEBHOOK_SIGNATURE', 'DUPLICATE_WEBHOOK',
      'PAYMENT_FAILED', 'PAYMENT_NOT_FOUND', 'AMOUNT_MISMATCH',
      'MERCHANT_MISMATCH', 'SSE_CONNECTED', 'SSE_DISCONNECTED',
      'INVALID_PAYMENT_PROOF', 'DUPLICATE_PROOF', 'PAYMENT_PROOF_VERIFIED',
      'UNREADABLE_PAYMENT_PROOF',
      'PAYMENT_PENDING',
      'PAYMENT_ORDER_CREATED', 'INVALID_PAYMENT_SIGNATURE',
    ],
  },
  severity: { type: String, enum: ['INFO', 'WARNING', 'HIGH', 'CRITICAL'], required: true },
  paymentId: String,
  orderId: String,
  transactionId: String,
  message: { type: String, required: true },
  status: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const proofAuditSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true, immutable: true },
  result: { type: String, required: true },
  transactionId: String,
  paymentId: String,
  orderId: String,
  referenceId: String,
}, { timestamps: true });

module.exports = { paymentSchema, billSchema, fraudAlertSchema, webhookLogSchema, securityEventSchema, proofAuditSchema };
