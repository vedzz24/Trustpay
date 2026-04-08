const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

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
  });
});

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