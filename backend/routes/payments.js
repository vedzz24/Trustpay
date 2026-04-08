const router  = require('express').Router();
const QRCode  = require('qrcode');
const Payment = require('../models/Payment');

const INDIAN_NAMES = [
  'Rahul Sharma', 'Priya Patel', 'Arjun Reddy', 'Meera Nair',
  'Amit Kumar',   'Sneha Desai', 'Vikram Singh', 'Ananya Gupta',
  'Ravi Verma',   'Kavya Iyer',  'Rohit Mishra', 'Divya Pillai',
];

// GET /api/payments — fetch all payments (newest first)
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ time: -1 }).limit(50);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// POST /api/payments/generate-qr — User generates a payment proof
router.post('/generate-qr', async (req, res) => {
  try {
    const { amount, txnId, name } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' });

    // Build a safe unique TXN ID
    const safeTxnId  = txnId
      ? `TRX_${txnId.replace(/\W+/g, '_').slice(0, 20)}_${Date.now()}`
      : `TRX${Date.now()}`;
    const proofLink  = `trustpay-verify:${safeTxnId}`;
    const qrCodeData = await QRCode.toDataURL(proofLink, { width: 256, margin: 2 });

    // Persist to MongoDB as 'pending'
    const payment = await Payment.create({
      txnId:     safeTxnId,
      amount:    Number(amount),
      name:      name || 'Customer',
      note:      txnId || '',
      status:    'pending',
      proofLink,
      time:      Date.now(),
    });

    res.json({ success: true, proofLink, qrCodeData, details: { amount: Number(amount), txnId: safeTxnId } });
  } catch (err) {
    console.error('generate-qr error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR' });
  }
});

// POST /api/payments/scan-qr — Merchant scans customer QR
router.post('/scan-qr', async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData || !qrData.startsWith('trustpay-verify:'))
      return res.json({ success: false, status: 'suspicious', message: 'Invalid TrustPay QR format' });

    const txnId  = qrData.replace('trustpay-verify:', '').trim();
    const payment = await Payment.findOne({ txnId });

    if (!payment)
      return res.json({ success: false, status: 'unmatched', message: 'Transaction not found in TrustPay network' });

    payment.status = 'verified';
    await payment.save();

    res.json({ success: true, status: 'verified', message: 'Payment proof validated!', payment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// POST /api/payments/match — Merchant manually verifies by amount+time
router.post('/match', async (req, res) => {
  try {
    const { amount, time } = req.body;
    const timeMin = time - 60_000;
    const timeMax = time + 60_000;

    const matches = await Payment.find({
      amount: Number(amount),
      time:   { $gte: timeMin, $lte: timeMax },
    });

    if (matches.length === 0)
      return res.json({ status: 'unmatched', message: 'No matching payment found within 60 seconds' });
    if (matches.length > 1)
      return res.json({ status: 'suspicious', message: 'Multiple similar payments detected — verify manually' });

    const txn = matches[0];
    if (txn.status === 'verified')
      return res.json({ status: 'info', message: 'Already verified' });

    txn.status = 'verified';
    await txn.save();
    res.json({ status: 'verified', message: 'Payment matched and verified!', payment: txn });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error during matching' });
  }
});

// POST /api/payments/scam-check — Check message for scam keywords
const SCAM_KEYWORDS = [
  'urgent', 'otp', 'send now', 'prize', 'lottery', 'winner',
  'bank verify', 'kyc update', 'account blocked', 'click here', 'claim now',
  'free gift', 'verify now', 'limited time',
];
router.post('/scam-check', (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ result: 'Safe', message: 'No text provided.' });

  const lower = text.toLowerCase();
  const found = SCAM_KEYWORDS.filter(kw => lower.includes(kw));
  if (found.length > 0) {
    res.json({ result: 'Suspicious', message: `Potential scam detected! Keywords found: ${found.join(', ')}. Do not share any personal information.` });
  } else {
    res.json({ result: 'Safe', message: 'No common scam keywords found. The message appears safe.' });
  }
});

module.exports = router;
