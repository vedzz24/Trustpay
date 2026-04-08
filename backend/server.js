<<<<<<< Updated upstream
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
=======
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const seedDatabase = require('./seed');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const paymentRoutes  = require('./routes/payments');
const analyticsRoutes= require('./routes/analytics');
const familyRoutes   = require('./routes/family');
>>>>>>> Stashed changes

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

<<<<<<< Updated upstream
/* ================== MONGODB CONNECTION ================== */
mongoose.connect("mongodb://localhost:27017/trustpay")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

/* ================== MODELS ================== */
const User = mongoose.model("User", {
  name: String,
  email: String,
  password: String,
  role: String,
});

const Payment = mongoose.model("Payment", {
  id: String,
  amount: Number,
  name: String,
  method: String,
  status: String,
  time: Number,
});

/* ================== AUTH ================== */

// Signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "user"
  });

  res.json({ success: true, user });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ success: true, user });
});

/* ================== PAYMENTS ================== */

// Get all payments
app.get('/api/payments', async (req, res) => {
  const payments = await Payment.find().sort({ time: -1 });
  res.json({ success: true, payments });
});

// Generate QR + Save payment
app.post('/api/generate-qr', async (req, res) => {
  const { amount, txnId, name } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  const safeTxnId = txnId
    ? `TRX_${txnId}_${Date.now()}`
    : `TRX${Date.now()}`;

  const proofLink = `trustpay-verify:${safeTxnId}`;

  const qrCodeData = await QRCode.toDataURL(proofLink);

  await Payment.create({
    id: safeTxnId,
    amount: Number(amount),
    name: name || "Customer",
    status: "pending",
    method: "UPI",
    time: Date.now()
  });

  res.json({
    success: true,
    qrCodeData,
    proofLink
=======
// ── MongoDB Connection ─────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env — please set it and restart.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await seedDatabase(); // seed demo data if DB is empty
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
>>>>>>> Stashed changes
  });

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/family',    familyRoutes);

// ── Health check (confirm server is live) ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

<<<<<<< Updated upstream
// Scan QR
app.post('/api/scan-qr', async (req, res) => {
  const { qrData } = req.body;

  const txnId = qrData.replace("trustpay-verify:", "");

  const txn = await Payment.findOne({ id: txnId });

  if (!txn) {
    return res.json({ status: "unmatched" });
  }

  txn.status = "verified";
  await txn.save();

  res.json({ success: true, payment: txn });
});

/* ================== START SERVER ================== */

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
=======
// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TrustPay backend running → http://localhost:${PORT}`);
  console.log(`   API docs: GET /api/health | /api/payments | /api/analytics`);
  console.log(`   Family portal: http://localhost:5173/family`);
});
>>>>>>> Stashed changes
