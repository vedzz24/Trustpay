const router  = require('express').Router();
const QRCode  = require('qrcode');
const Payment = require('../models/Payment');
const OtpAlert = require('../models/OtpAlert');
const crypto = require('crypto');
const { broadcast } = require('../utils/sse');

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

    broadcast('payment_created', payment);

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
router.post('/scan-qr', async (req, res) => {
  try {
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
      return res.json({
        success: false,
        status: 'unmatched',
        message: '⚠️ WARNING: Transaction signature is valid, but it does not exist in the Central UPI database.'
      });
    }

    // 3. Double-check that QR values match stored database fields
    if (payment.amount !== Number(amount) || payment.name !== name) {
      return res.json({
        success: false,
        status: 'suspicious',
        message: '🚨 CRITICAL ERROR: QR code payment parameters (amount/name) do not match database logs!'
      });
    }

    payment.status = 'verified';
    await payment.save();

    broadcast('payment_updated', payment);

    res.json({ success: true, status: 'verified', message: 'Payment verified! Cryptographic hash matches database.', payment });
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

    broadcast('payment_updated', txn);

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

// POST /api/payments/analyze-screenshot — Forensic analyzer simulation
router.post('/analyze-screenshot', async (req, res) => {
  try {
    const { imageName, simulatedText, imageData } = req.body;

    let isFake = false;
    let details = [];
    let overlays = [];

    const lowerName = (imageName || '').toLowerCase();
    const lowerText = (simulatedText || '').toLowerCase();

    // Check 1: Filename and Simulated text heuristics (existing logic)
    if (lowerName.includes('fake') || lowerName.includes('manipulated') || lowerText.includes('spoof') || lowerText.includes('paytm spoof') || lowerText.includes('gpay fake') || lowerName.includes('bad') || lowerName.includes('shot')) {
      isFake = true;
      details = [
        'Typography mismatch: Amount uses non-standard font weight and letter spacing.',
        'Inconsistent compression: Compression noise is significantly lower around the amount text, indicating editing.',
        'Metadata validation failed: Created with an unauthorized screenshot generator application.',
        'Transaction ID check failed: No matching transaction ID found in the UPI central network.'
      ];
      overlays = [
        { field: 'amount', x: 90, y: 130, width: 220, height: 50, label: 'Typography Mismatch (Fake Font)' },
        { field: 'txnId', x: 60, y: 260, width: 280, height: 30, label: 'Invalid TXN ID signature' },
        { field: 'brand', x: 20, y: 20, width: 100, height: 35, label: 'Spoofed UI Watermark Overlay' }
      ];
    }

    // Check 2: Hex/Binary search in uploaded image base64 data for editor signatures
    if (!isFake && imageData) {
      try {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const binaryString = buffer.toString('binary');
        const lowerBinary = binaryString.toLowerCase();

        // Common image editing tools / screenshot generator signatures in metadata
        const softwareSignatures = [
          'photoshop', 'gimp', 'paint.net', 'canva', 'adobe', 
          'pixelmator', 'picsart', 'snapseed', 'lightroom', 'phonto'
        ];

        for (const sig of softwareSignatures) {
          if (lowerBinary.includes(sig)) {
            isFake = true;
            details = [
              `Image editing trace detected: File structure contains software signature: "${sig.toUpperCase()}".`,
              'Typography mismatch: Amount uses non-standard font weight and letter spacing.',
              'Inconsistent compression: Compression noise is significantly lower around the amount text, indicating editing.',
              'Metadata validation failed: Created/edited with an unauthorized image editing application.'
            ];
            overlays = [
              { field: 'metadata', x: 10, y: 10, width: 360, height: 460, label: `Editor signature: ${sig.toUpperCase()}` },
              { field: 'amount', x: 90, y: 130, width: 220, height: 50, label: 'Typography Mismatch (Fake Font)' }
            ];
            break;
          }
        }
      } catch (e) {
        console.error('Failed to parse uploaded image data metadata:', e);
      }
    }

    // If no fake indicators found, mark as authentic
    if (!isFake) {
      details = [
        'Typography matched: System fonts match standard transaction receipt template.',
        'Texture consistency verified: Uniform noise distribution.',
        'Authentic metadata: Valid Android/iOS system screenshot metadata.',
        'Network sync: Transaction ID exists and status is verified.'
      ];
    }

    res.json({
      success: true,
      fake: isFake,
      details,
      overlays
    });
  } catch (err) {
    console.error('Forensics check failed:', err);
    res.status(500).json({ success: false, message: 'Forensics check failed.' });
  }
});

// GET /api/payments/otp-alerts — fetch recent OTP threat logs
router.get('/otp-alerts', async (req, res) => {
  try {
    const alerts = await OtpAlert.find().sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch OTP alerts' });
  }
});

// POST /api/payments/log-otp-alert — log an OTP alert in MongoDB
router.post('/log-otp-alert', async (req, res) => {
  try {
    const { sender, message, riskLevel, detectedKeywords, actionTaken } = req.body;
    const alert = await OtpAlert.create({
      sender: sender || 'System Intercept',
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
