const router  = require('express').Router();
const QRCode  = require('qrcode');
const crypto = require('crypto');
const { broadcastToMerchant } = require('../utils/sse');
const { requireMerchant } = require('../utils/auth');
const { getMerchantModels } = require('../utils/merchantDb');
const { recordSecurityEvent } = require('../utils/securityEvents');
const { analyzePaymentProof } = require('../utils/fraudProofAnalyzer');

const INDIAN_NAMES = [
  'Rahul Sharma', 'Priya Patel', 'Arjun Reddy', 'Meera Nair',
  'Amit Kumar',   'Sneha Desai', 'Vikram Singh', 'Ananya Gupta',
  'Ravi Verma',   'Kavya Iyer',  'Rohit Mishra', 'Divya Pillai',
];

// Helper to calculate cryptographic transaction hash for integrity verification
function calculateTxnHash(txnId, amount, name, time) {
  const secret = process.env.TRUSTPAY_SECRET || 'trustpay_super_secure_key_987';
  return crypto.createHmac('sha256', secret)
               .update(`${txnId}|${amount}|${name}|${time}`)
               .digest('hex');
}

// GET /api/payments — fetch all payments (newest first)
router.get('/', requireMerchant, async (req, res) => {
  try {
    const { Payment } = getMerchantModels(req.user.merchantId);
    const payments = await Payment.find().sort({ time: -1 }).limit(50);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// GET /api/merchant/transactions — fetch payments for logged-in merchant
router.get('/merchant/transactions', requireMerchant, async (req, res) => {
  try {
    const { Payment, connection } = getMerchantModels(req.user.merchantId);
    console.info(`Authenticated merchant: ${req.user.merchantId}`);
    console.info(`Selected database: ${connection.name}`);
    const payments = await Payment.find().sort({ time: -1 }).limit(50);
    console.info(`Transactions returned: ${payments.length}`);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch merchant transactions' });
  }
});

// POST /api/payments/generate-qr — User generates a payment proof
router.post('/generate-qr', requireMerchant, async (req, res) => {
  try {
    const { Payment } = getMerchantModels(req.user.merchantId);
    const { amount, txnId, name } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' });

    // Build a safe unique TXN ID
    const safeTxnId  = txnId
      ? `TRX_${txnId.replace(/\W+/g, '_').slice(0, 20)}_${Date.now()}`
      : `TRX${Date.now()}`;
    
    const hashTime = Date.now();
    const customerName = name || 'Customer';
    
    // Calculate SHA-256 HMAC integrity hash
    const signature = calculateTxnHash(safeTxnId, Number(amount), customerName, hashTime);

    // Pack transaction metadata into Base64 payload
    const payload = Buffer.from(JSON.stringify({
      txnId: safeTxnId,
      amount: Number(amount),
      name: customerName,
      time: hashTime
    })).toString('base64');

    // Token format is: trustpay-verify:<payload_base64>.<signature>
    const proofLink  = `trustpay-verify:${payload}.${signature}`;
    const qrCodeData = await QRCode.toDataURL(proofLink, { width: 256, margin: 2 });

    // Persist to MongoDB as 'pending'
    const payment = await Payment.create({
      txnId:     safeTxnId,
      amount:    Number(amount),
      name:      customerName,
      note:      txnId || '',
      status:    'pending',
      proofLink,
      hash:      signature,
      time:      hashTime,
    });

    broadcastToMerchant(req.user.merchantId, 'payment_created', payment);

    res.json({
      success: true,
      proofLink,
      qrCodeData,
      details: { amount: Number(amount), txnId: safeTxnId, time: hashTime, hash: signature }
    });
  } catch (err) {
    console.error('generate-qr error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR' });
  }
});

// POST /api/payments/scan-qr — Merchant scans customer QR
router.post('/scan-qr', requireMerchant, async (req, res) => {
  try {
    const { Payment } = getMerchantModels(req.user.merchantId);
    const { qrData } = req.body;
    if (!qrData || !qrData.startsWith('trustpay-verify:'))
      return res.json({ success: false, status: 'suspicious', message: 'Invalid TrustPay QR format' });

    const token = qrData.replace('trustpay-verify:', '').trim();
    const parts = token.split('.');
    
    if (parts.length !== 2) {
      return res.json({ success: false, status: 'suspicious', message: '⚠️ Tampered QR Code Structure (No signature detected).' });
    }

    const [payloadB64, signature] = parts;
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    } catch (e) {
      return res.json({ success: false, status: 'suspicious', message: '⚠️ Suspicious Activity: Failed to decode QR payload.' });
    }

    const { txnId, amount, name, time } = decoded;

    // 1. Recalculate signature to verify integrity (tamper-proofing)
    const calculatedSig = calculateTxnHash(txnId, amount, name, time);
    if (calculatedSig !== signature) {
      return res.json({
        success: false,
        status: 'suspicious',
        message: `🚨 SECURITY BREACH: The transaction data inside this QR code has been tampered with! Signature mismatch.`
      });
    }

    // 2. Fetch from Database to verify existence and check DB spoofing
    const payment = await Payment.findOne({ txnId });

    if (!payment) {
      await recordSecurityEvent(req.user.merchantId, {
        type: 'PAYMENT_NOT_FOUND', severity: 'WARNING', transactionId: txnId,
        message: 'Scanned transaction was not found in this merchant ledger.', status: 'NOT_VERIFIED',
        metadata: { source: 'QR_SCAN' },
      });
      return res.json({
        success: false,
        status: 'unmatched',
        message: '⚠️ WARNING: Transaction signature is valid, but it does not exist in this merchant ledger.'
      });
    }

    // 3. Double-check that QR values match stored database fields
    if (payment.amount !== Number(amount) || payment.name !== name) {
      await recordSecurityEvent(req.user.merchantId, {
        type: 'AMOUNT_MISMATCH', severity: 'HIGH', paymentId: String(payment._id), transactionId: txnId,
        message: 'Scanned payment values differ from the trusted transaction.', status: 'REJECTED',
        metadata: { claimedAmount: Number(amount), verifiedAmount: payment.amount, source: 'QR_SCAN' },
      });
      return res.json({
        success: false,
        status: 'suspicious',
        message: '🚨 CRITICAL ERROR: QR code payment parameters (amount/name) do not match database logs!'
      });
    }

    payment.status = 'verified';
    await payment.save();

    await recordSecurityEvent(req.user.merchantId, {
      type: 'PAYMENT_VERIFIED', severity: 'INFO', paymentId: String(payment._id), transactionId: payment.txnId,
      message: `₹${payment.amount} payment verified.`, status: 'VERIFIED',
      metadata: { signatureValid: true, merchantMatch: true, source: 'QR_SCAN' },
    });

    broadcastToMerchant(req.user.merchantId, 'payment_updated', payment);

    res.json({ success: true, status: 'verified', message: 'Payment verified! Cryptographic hash matches database.', payment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// POST /api/payments/match — Merchant manually verifies by amount+time
router.post('/match', requireMerchant, async (req, res) => {
  try {
    const { Payment } = getMerchantModels(req.user.merchantId);
    const { amount, time } = req.body;
    const timeMin = time - 60_000;
    const timeMax = time + 60_000;

    const matches = await Payment.find({
      amount: Number(amount),
      time:   { $gte: timeMin, $lte: timeMax },
    });

    if (matches.length === 0) {
      await recordSecurityEvent(req.user.merchantId, {
        type: 'PAYMENT_NOT_FOUND', severity: 'WARNING',
        message: 'No matching payment was found within the verification window.', status: 'NOT_VERIFIED',
        metadata: { claimedAmount: Number(amount), source: 'MANUAL_MATCH' },
      });
      return res.json({ status: 'unmatched', message: 'No matching payment found within 60 seconds' });
    }
    if (matches.length > 1)
      return res.json({ status: 'suspicious', message: 'Multiple similar payments detected — verify manually' });

    const txn = matches[0];
    if (txn.status === 'verified')
      return res.json({ status: 'info', message: 'Already verified' });

    txn.status = 'verified';
    await txn.save();

    await recordSecurityEvent(req.user.merchantId, {
      type: 'PAYMENT_VERIFIED', severity: 'INFO', paymentId: String(txn._id), transactionId: txn.txnId,
      message: `₹${txn.amount} payment verified.`, status: 'VERIFIED',
      metadata: { merchantMatch: true, source: 'MANUAL_MATCH' },
    });

    broadcastToMerchant(req.user.merchantId, 'payment_updated', txn);

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

// POST /api/payments/analyze-screenshot — OCR + trusted tenant verification
router.post('/analyze-screenshot', requireMerchant, async (req, res) => {
  try {
    const result = await analyzePaymentProof({ merchantId: req.user.merchantId, imageData: req.body.imageData });
    res.json(result);
  } catch (err) {
    console.error('Forensics check failed:', err);
    res.status(422).json({ success: false, result: 'UNREADABLE_PAYMENT_PROOF', message: 'TrustPay could not reliably read this image. Do not rely on the screenshot alone.' });
  }
});

// GET /api/payments/otp-alerts — fetch recent OTP threat logs
router.get('/otp-alerts', requireMerchant, async (req, res) => {
  try {
    const { FraudAlert } = getMerchantModels(req.user.merchantId);
    const alerts = await FraudAlert.find({ category: 'otp' }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch OTP alerts' });
  }
});

// POST /api/payments/log-otp-alert — log an OTP alert in MongoDB
router.post('/log-otp-alert', requireMerchant, async (req, res) => {
  try {
    const { FraudAlert } = getMerchantModels(req.user.merchantId);
    const { sender, message, riskLevel, detectedKeywords, actionTaken } = req.body;
    const alert = await FraudAlert.create({
      category: 'otp',
      metadata: { sender: sender || 'System Intercept' },
      message: message || '',
      riskLevel: riskLevel || 'low',
      detectedKeywords: detectedKeywords || [],
      actionTaken: actionTaken || 'Blocked',
    });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log OTP alert' });
  }
});

module.exports = router;
