const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ============================================================
   MONGODB SCHEMA DESIGN (ready for migration)
   ============================================================
   const mongoose = require('mongoose');

   const UserSchema = new mongoose.Schema({
     name:     { type: String, required: true },
     email:    { type: String, required: true, unique: true },
     password: { type: String, required: true }, // hash in production
     role:     { type: String, enum: ['user', 'merchant'], default: 'user' },
   }, { timestamps: true });

   const TransactionSchema = new mongoose.Schema({
     id:     { type: String, required: true, unique: true },
     amount: { type: Number, required: true },
     name:   { type: String, default: 'Anonymous' },
     method: { type: String, default: 'UPI' },
     status: { type: String, enum: ['pending','verified','suspicious','unmatched'], default: 'pending' },
     time:   { type: Number, default: () => Date.now() },
   }, { timestamps: true });

   To activate: connect mongoose, replace in-memory arrays with
   User.create(), Payment.find(), etc.
   ============================================================ */

// ── In-memory store ──────────────────────────────────────────────────────────
let users = [];
let payments = [
  { id: 'tx_demo_1', amount: 500, time: Date.now() - 1000 * 60 * 3, name: 'Rahul Sharma', status: 'verified', method: 'UPI' },
  { id: 'tx_demo_2', amount: 1200, time: Date.now() - 1000 * 60 * 10, name: 'Priya Patel', status: 'verified', method: 'Card' },
  { id: 'tx_demo_3', amount: 250, time: Date.now() - 1000 * 60 * 18, name: 'Arjun Reddy', status: 'unmatched', method: 'UPI' },
  { id: 'tx_demo_4', amount: 3500, time: Date.now() - 1000 * 60 * 25, name: 'Meera Nair', status: 'verified', method: 'NetBanking' },
  { id: 'tx_demo_5', amount: 800, time: Date.now() - 1000 * 60 * 40, name: 'Amit Kumar', status: 'suspicious', method: 'UPI' },
  { id: 'tx_demo_6', amount: 150, time: Date.now() - 1000 * 60 * 55, name: 'Sneha Desai', status: 'pending', method: 'UPI' },
  { id: 'tx_demo_7', amount: 4500, time: Date.now() - 1000 * 60 * 70, name: 'Vikram Singh', status: 'verified', method: 'Card' },
  { id: 'tx_demo_8', amount: 2100, time: Date.now() - 1000 * 60 * 90, name: 'Ananya Gupta', status: 'verified', method: 'UPI' },
];

const scamKeywords = [
  'urgent', 'otp', 'send now', 'prize', 'lottery', 'winner',
  'bank verify', 'kyc update', 'account blocked', 'click here', 'claim now'
];

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists' });
  }

  const user = { id: Date.now().toString(), name, email, password, role: role || 'user' };
  users.push(user);
  res.json({ success: true, user: { id: user.id, name, email, role: user.role } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Incorrect email or password' });
  }
  res.json({ success: true, user: { id: user.id, name: user.name, email, role: user.role } });
});

// ── Payments ─────────────────────────────────────────────────────────────────

// Returns all payments (for timeline / history views)
app.get('/api/payments', (req, res) => {
  res.json({ success: true, payments });
});

// Smart match — called when merchant manually clicks "Mark Verified"
app.post('/api/match', (req, res) => {
  const { amount, time } = req.body;

  const matches = payments.filter(p =>
    Math.abs(p.amount - amount) < 1 &&
    Math.abs(p.time - time) <= 60_000
  );

  if (matches.length === 0) {
    return res.json({ status: 'unmatched', message: 'No matching payment found within 60 seconds' });
  }
  if (matches.length > 1) {
    return res.json({ status: 'suspicious', message: 'Multiple similar payments detected. Verify manually.' });
  }

  if (matches[0].status === 'verified') {
    return res.json({ status: 'info', message: 'This payment is already verified' });
  }
  matches[0].status = 'verified';
  res.json({ status: 'verified', message: 'Payment matched and verified', payment: matches[0] });
});

// ── QR Generation (User generates proof) ─────────────────────────────────────

app.post('/api/generate-qr', async (req, res) => {
  const { amount, txnId, name } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  try {
    const safeTxnId = txnId
      ? `TRX_${txnId.replace(/\s+/g, '_').slice(0, 20)}_${Date.now()}`
      : `TRX${Date.now()}`;
    const proofLink = `trustpay-verify:${safeTxnId}`;
    const qrCodeData = await QRCode.toDataURL(proofLink, { width: 256, margin: 2 });

    // Register the transaction as "pending" so merchant can verify it
    payments.unshift({
      id: safeTxnId,
      amount: Number(amount),
      time: Date.now(),
      name: name || 'Customer',
      status: 'pending',
      method: 'UPI',
    });

    res.json({
      success: true,
      proofLink,
      qrCodeData,
      details: { amount: Number(amount), txnId: safeTxnId },
    });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
});

// ── QR Scan (Merchant verifies customer proof) ────────────────────────────────

app.post('/api/scan-qr', (req, res) => {
  const { qrData } = req.body;

  if (!qrData || !qrData.startsWith('trustpay-verify:')) {
    return res.json({
      success: false,
      status: 'suspicious',
      message: 'Invalid QR code. Only TrustPay-issued codes are accepted.',
    });
  }

  const txnId = qrData.replace('trustpay-verify:', '').trim();
  const txn = payments.find(p => p.id === txnId);

  if (!txn) {
    return res.json({
      success: false,
      status: 'unmatched',
      message: 'Transaction ID not found in the TrustPay network.',
    });
  }

  txn.status = 'verified';
  res.json({ success: true, status: 'verified', message: 'Payment proof validated successfully', payment: txn });
});

// ── Scam Checker ─────────────────────────────────────────────────────────────

app.post('/api/scam-check', (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ result: 'Safe', message: 'No text provided.' });

  const lower = text.toLowerCase();
  const found = scamKeywords.filter(kw => lower.includes(kw));

  if (found.length > 0) {
    res.json({
      result: 'Suspicious',
      message: `Potential scam detected! Found keywords: ${found.join(', ')}. Do not share any personal information.`,
    });
  } else {
    res.json({
      result: 'Safe',
      message: 'No common scam keywords found. The message appears safe.',
    });
  }
});

// ── Analytics ────────────────────────────────────────────────────────────────

app.get('/api/analytics', (req, res) => {
  const verified = payments.filter(p => p.status === 'verified').length;
  const suspicious = payments.filter(p => p.status === 'suspicious').length;
  const pending = payments.filter(p => ['pending', 'unmatched'].includes(p.status)).length;

  // Realistic pre-injected hourly distribution (represents a typical business day)
  const hourlyData = [
    { hour: '8 AM', volume: 12 },
    { hour: '9 AM', volume: 34 },
    { hour: '10 AM', volume: 55 },
    { hour: '11 AM', volume: 72 },
    { hour: '12 PM', volume: 98 },
    { hour: '1 PM', volume: 110 },
    { hour: '2 PM', volume: 88 },
    { hour: '3 PM', volume: 65 },
    { hour: '4 PM', volume: 48 },
    { hour: '5 PM', volume: 57 },
    { hour: '6 PM', volume: 80 },
    { hour: '7 PM', volume: 95 },
    { hour: '8 PM', volume: 74 },
    { hour: '9 PM', volume: 40 },
  ];

  const sorted = [...payments].sort((a, b) => b.amount - a.amount);
  const highestPayment = sorted[0] || null;
  const lowestPayment = sorted[sorted.length - 1] || null;

  res.json({
    metrics: {
      total: payments.length + 192,  // adds historical base
      verified: verified + 178,
      pending: pending + 10,
      failed: suspicious + 4,
    },
    hourlyData,
    highestPayment,
    lowestPayment,
  });
});

// ── Family Approval System ────────────────────────────────────────────────────
// Stores one pending approval at a time (in-memory).
// In production, this would be per-user via a DB + push notification.
let familyApprovalRequest = null; // { id, elderlyName, amount, note, status: 'pending'|'approved'|'rejected' }

// Elderly user submits a payment that needs approval
app.post('/api/family/request', (req, res) => {
  const { amount, note, elderlyName } = req.body;
  const id = `FAM_${Date.now()}`;
  familyApprovalRequest = { id, elderlyName: elderlyName || 'Family Member', amount, note: note || '', status: 'pending', time: Date.now() };
  console.log(`📩 Family approval requested for ₹${amount} by ${elderlyName}`);
  res.json({ success: true, requestId: id });
});

// Elderly user's page polls this to check if family responded
app.get('/api/family/status/:id', (req, res) => {
  if (!familyApprovalRequest || familyApprovalRequest.id !== req.params.id) {
    return res.json({ status: 'not_found' });
  }
  res.json({ status: familyApprovalRequest.status });
});

// Family portal fetches the pending request
app.get('/api/family/pending', (req, res) => {
  if (!familyApprovalRequest || familyApprovalRequest.status !== 'pending') {
    return res.json({ pending: false });
  }
  res.json({ pending: true, request: familyApprovalRequest });
});

// Family approves
app.post('/api/family/approve', (req, res) => {
  if (!familyApprovalRequest) return res.status(404).json({ success: false });
  familyApprovalRequest.status = 'approved';
  console.log(`✅ Family approved ₹${familyApprovalRequest.amount}`);
  res.json({ success: true });
});

// Family rejects
app.post('/api/family/reject', (req, res) => {
  if (!familyApprovalRequest) return res.status(404).json({ success: false });
  familyApprovalRequest.status = 'rejected';
  console.log(`❌ Family rejected ₹${familyApprovalRequest.amount}`);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ TrustPay backend running → http://localhost:${PORT}`);
  console.log(`   Family Portal: http://localhost:5173/family`);
});
