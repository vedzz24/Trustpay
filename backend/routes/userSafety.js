const router = require('express').Router();
const User = require('../models/User');
const RazorpayOrderOwner = require('../models/RazorpayOrderOwner');
const UserSafetyReport = require('../models/UserSafetyReport');
const { requireUser, optionalUser } = require('../utils/auth');
const { createGuardianAlertForUser } = require('../services/guardianAlerts');
const { analyzeMessage, analyzeQrPayload, redactOtp } = require('../utils/safetyAnalysis');
const { analyzePaymentProof, decodeImage, extractTextFromImage, extractPaymentInformation, detectPaymentProof } = require('../utils/fraudProofAnalyzer');
const { getMerchantModels } = require('../utils/merchantDb');

const safeMerchant = merchant => merchant ? { merchantId: merchant.merchantId, businessName: merchant.businessName, merchantName: merchant.merchantName } : null;
const alertIfNeeded = (req, details) => req.user?.role === 'user'
  ? createGuardianAlertForUser({ userId: req.user.id, ...details }).catch(error => console.error('Guardian alert creation failed:', error.message))
  : Promise.resolve();

async function analyzePublicProof(imageData) {
  const buffer = decodeImage(imageData);
  const ocr = await extractTextFromImage(buffer);
  const extracted = extractPaymentInformation(ocr.text);
  const detection = detectPaymentProof(ocr.text, extracted);
  if (!detection.detected) return { success: true, result: 'INVALID_PAYMENT_PROOF', paymentProofDetected: false };
  const owner = extracted.orderId ? await RazorpayOrderOwner.findOne({ razorpayOrderId: extracted.orderId }).lean() : null;
  let merchantId = owner?.merchantId;
  if (!merchantId && extracted.merchantId) {
    const merchant = await User.findOne({ merchantId: extracted.merchantId, role: 'merchant' }).select('merchantId').lean();
    merchantId = merchant?.merchantId;
  }
  if (!merchantId) return { success: true, result: extracted.orderId || extracted.transactionId || extracted.paymentId ? 'PAYMENT_NOT_FOUND' : 'UNREADABLE_PAYMENT_PROOF', paymentProofDetected: true };
  const full = await analyzePaymentProof({ merchantId, imageData, models: getMerchantModels(merchantId), ocr: async () => ocr, persist: false });
  return { success: true, result: full.result, paymentProofDetected: full.paymentProofDetected,
    verification: full.verification, registeredMerchantId: merchantId,
    ...(full.result === 'VERIFIED_PAYMENT' ? { trustedTransaction: full.trustedTransaction } : {}),
    ...(full.result === 'AMOUNT_MISMATCH' ? { claimedAmount: full.extracted.claimedAmount, verifiedAmount: full.verifiedAmount } : {}),
  };
}

router.post('/qr-check', optionalUser, async (req, res) => {
  const payload = String(req.body.payload || '').trim().slice(0, 4000);
  const result = analyzeQrPayload(payload);
  try {
    let merchant;
    const pathMerchant = payload.match(/\/pay\/(MER\d{3,})(?:[/?#]|$)/i)?.[1]?.toUpperCase();
    if (pathMerchant) merchant = await User.findOne({ merchantId: pathMerchant, role: 'merchant' }).select('merchantId businessName merchantName -_id').lean();
    if (!merchant && result.payee) merchant = await User.findOne({ upiId: result.payee, role: 'merchant' }).select('merchantId businessName merchantName -_id').lean();
    if (merchant) {
      result.registeredMerchant = safeMerchant(merchant);
      result.result = 'NORMAL'; result.risk = 'NORMAL';
      result.reasons = ['The payment identity matches a registered TrustPay merchant.'];
    }
    await alertIfNeeded(req, { checkType: 'QR CHECK', riskLevel: result.result === 'SUSPICIOUS' ? 'HIGH' : result.result,
      reasons: result.reasons, summary: `${result.type} QR safety check returned ${result.result}.` });
    return res.json({ success: true, result });
  } catch (_) { return res.status(500).json({ success: false, message: 'QR safety check failed.' }); }
});

router.post('/message-check', optionalUser, async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message || message.length > 10000) return res.status(400).json({ success: false, message: 'Enter a message up to 10,000 characters.' });
  const result = analyzeMessage(message);
  await alertIfNeeded(req, { checkType: 'SCAM MESSAGE', riskLevel: result.riskLevel, reasons: result.indicators,
    summary: `${result.riskLevel} message safety check: ${result.indicators.slice(0, 4).join(', ') || 'no meaningful indicators'}.` });
  return res.json({ success: true, result });
});

router.post('/otp-check', optionalUser, async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message || message.length > 10000) return res.status(400).json({ success: false, message: 'Paste the message around the OTP, without sharing the actual OTP.' });
  const result = analyzeMessage(message, true);
  await alertIfNeeded(req, { checkType: 'OTP SCAM CHECK', riskLevel: result.riskLevel, reasons: result.indicators,
    summary: `${result.riskLevel} OTP safety check: ${result.indicators.slice(0, 4).join(', ') || 'no meaningful indicators'}.` });
  return res.json({ success: true, result });
});

router.post('/payment-proof', optionalUser, async (req, res) => {
  try {
    const result = await analyzePublicProof(req.body.imageData);
    const riskLevel = ['AMOUNT_MISMATCH', 'MERCHANT_MISMATCH', 'PAYMENT_FAILED'].includes(result.result) ? 'HIGH' : 'UNKNOWN';
    await alertIfNeeded(req, { checkType: 'PAYMENT PROOF CHECK', riskLevel, reasons: [result.result.replaceAll('_', ' ')], summary: `Payment proof check returned ${result.result}.` });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message === 'Unsupported or invalid image data' ? error.message : 'Payment screenshot could not be analysed.' });
  }
});

router.post('/shield-scan', optionalUser, async (req, res) => {
  try {
    const signals = [];
    const message = String(req.body.message || '').trim().slice(0, 10000);
    const qrPayload = String(req.body.qrPayload || '').trim().slice(0, 4000);
    if (message) {
      const result = analyzeMessage(message);
      signals.push({ source: 'Message', riskLevel: result.riskLevel, reasons: result.indicators });
    }
    if (qrPayload) {
      const result = analyzeQrPayload(qrPayload);
      signals.push({ source: 'QR', riskLevel: result.result === 'SUSPICIOUS' ? 'HIGH' : result.result === 'NORMAL' ? 'LOW' : 'MEDIUM', reasons: result.reasons });
    }
    if (req.body.imageData) {
      const result = await analyzePublicProof(req.body.imageData);
      signals.push({ source: 'Payment evidence', riskLevel: ['AMOUNT_MISMATCH', 'MERCHANT_MISMATCH', 'PAYMENT_FAILED'].includes(result.result) ? 'HIGH' : result.result === 'VERIFIED_PAYMENT' ? 'LOW' : 'MEDIUM', reasons: [result.result.replaceAll('_', ' ')] });
    }
    if (!signals.length) return res.status(400).json({ success: false, message: 'Provide at least one Shield Scan signal.' });
    const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const riskLevel = signals.reduce((current, signal) => rank[signal.riskLevel] > rank[current] ? signal.riskLevel : current, 'LOW');
    const reasons = signals.flatMap(signal => signal.reasons.map(reason => `${signal.source}: ${reason}`));
    await alertIfNeeded(req, { checkType: 'SHIELD SCAN', riskLevel, reasons, summary: `${riskLevel} combined TrustPay Shield Scan.` });
    return res.json({ success: true, result: { riskLevel, resultCode: 'SHIELD_REPORT', reasons, signals } });
  } catch (_) { return res.status(400).json({ success: false, message: 'Shield Scan could not be completed.' }); }
});

router.post('/reports', requireUser, async (req, res) => {
  const { checkType, riskLevel, resultCode } = req.body;
  const summary = redactOtp(String(req.body.summary || '').trim()).slice(0, 500);
  if (!summary) return res.status(400).json({ success: false, message: 'A safe report summary is required.' });
  try {
    const report = await UserSafetyReport.create({ userId: req.user.id, checkType, riskLevel, resultCode, summary });
    return res.status(201).json({ success: true, report });
  } catch (_) { return res.status(400).json({ success: false, message: 'Report could not be saved.' }); }
});

module.exports = router;
