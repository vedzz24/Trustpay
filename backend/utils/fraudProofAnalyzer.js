const crypto = require('crypto');
const { recognize } = require('tesseract.js');
const englishData = require('@tesseract.js-data/eng');
const { getMerchantModels } = require('./merchantDb');
const { recordSecurityEvent } = require('./securityEvents');

const RESULT_EVENT = {
  VERIFIED_PAYMENT: ['PAYMENT_PROOF_VERIFIED', 'INFO', 'VERIFIED'],
  INVALID_PAYMENT_PROOF: ['INVALID_PAYMENT_PROOF', 'WARNING', 'INVALID_INPUT'],
  PAYMENT_NOT_FOUND: ['PAYMENT_NOT_FOUND', 'WARNING', 'NOT_VERIFIED'],
  AMOUNT_MISMATCH: ['AMOUNT_MISMATCH', 'HIGH', 'REJECTED'],
  MERCHANT_MISMATCH: ['MERCHANT_MISMATCH', 'HIGH', 'REJECTED'],
  DUPLICATE_PROOF: ['DUPLICATE_PROOF', 'WARNING', 'DUPLICATE'],
  UNREADABLE_PAYMENT_PROOF: ['UNREADABLE_PAYMENT_PROOF', 'WARNING', 'NOT_VERIFIED'],
  PAYMENT_PENDING: ['PAYMENT_PENDING', 'WARNING', 'PENDING'],
  PAYMENT_FAILED: ['PAYMENT_FAILED', 'WARNING', 'FAILED'],
};

function decodeImage(imageData) {
  const match = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(imageData || '');
  if (!match) throw new Error('Unsupported or invalid image data');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('Image must be between 1 byte and 5 MB');
  return buffer;
}

async function extractTextFromImage(buffer) {
  const options = {
    langPath: englishData.langPath,
    gzip: englishData.gzip,
  };
  if (process.env.NODE_ENV === 'development') {
    options.logger = ({ status, progress }) => console.info(`OCR ${status}: ${Math.round((progress || 0) * 100)}%`);
  }
  const output = await recognize(buffer, 'eng', options);
  return { text: output.data.text || '', confidence: output.data.confidence || 0 };
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim();
  }
  return null;
}

function extractPaymentInformation(rawText) {
  const text = rawText.replace(/[|]/g, 'I').replace(/\s+/g, ' ').trim();
  const amountText = firstMatch(text, [/(?:₹|INR|Rs\.?)[\s:]*(\d[\d,]*(?:\.\d{1,2})?)/i, /(\d[\d,]*(?:\.\d{1,2})?)\s*(?:INR)/i]);
  const paymentId = firstMatch(text, [/\b(pay_[A-Za-z0-9]+)\b/i, /payment\s*id\s*[:#-]?\s*([A-Za-z0-9_-]{6,})/i]);
  const orderId = firstMatch(text, [/\b(order_[A-Za-z0-9]+)\b/i, /order\s*id\s*[:#-]?\s*([A-Za-z0-9_-]{6,})/i]);
  const transactionId = firstMatch(text, [/(?:transaction|txn)\s*(?:id|no)?\s*[:#-]?\s*([A-Za-z0-9_-]{6,})/i, /\b((?:TP|TRX)[-_]?[A-Za-z0-9_-]{4,})\b/i]);
  const utr = firstMatch(text, [/(?:UTR|UPI\s*ref(?:erence)?(?:\s*no)?)[\s:#-]*([A-Za-z0-9_-]{8,})/i]);
  const referenceId = firstMatch(text, [/(?:reference|ref)\s*(?:id|no)?\s*[:#-]?\s*([A-Za-z0-9_-]{6,})/i]);
  const merchantId = firstMatch(text, [/\b(MER\d{3,})\b/i]);
  const payee = firstMatch(text, [/(?:paid to|sent to|received by|payee)\s*[:#-]?\s*([A-Za-z][A-Za-z0-9 .&'-]{2,40})/i]);
  const paymentStatus = firstMatch(text, [/\b(payment successful|successful|success|completed|captured|failed|pending|paid)\b/i]);
  const paymentMethod = firstMatch(text, [/\b(UPI|credit card|debit card|net banking|wallet|IMPS|NEFT)\b/i]);
  const date = firstMatch(text, [/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/, /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i]);
  const time = firstMatch(text, [/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\b/i]);
  return {
    claimedAmount: amountText ? Number(amountText.replace(/,/g, '')) : null,
    transactionId, referenceId, utr, paymentId, orderId,
    merchantId: merchantId?.toUpperCase() || null,
    payee, paymentStatus: paymentStatus?.toUpperCase() || null,
    date, time, paymentMethod: paymentMethod?.toUpperCase() || null,
  };
}

function detectPaymentProof(text, extracted) {
  const lower = text.toLowerCase();
  const categories = {
    currency: /₹|\binr\b|\brs\.?\s*\d/i.test(text) && extracted.claimedAmount !== null,
    identifier: Boolean(extracted.paymentId || extracted.orderId || extracted.transactionId || extracted.utr || extracted.referenceId),
    status: /payment successful|\bpaid\b|\bcompleted\b|\bcaptured\b|\bfailed\b|\bpending\b/i.test(lower),
    party: /paid to|sent to|received by|payee|merchant/i.test(lower),
    method: Boolean(extracted.paymentMethod),
    temporal: Boolean(extracted.date || extracted.time),
  };
  const count = Object.values(categories).filter(Boolean).length;
  return {
    detected: count >= 3 && (
      (categories.identifier && (categories.currency || categories.status)) ||
      (categories.currency && categories.status && (categories.party || categories.method))
    ),
    categories,
    indicatorCount: count,
  };
}

function buildLookup(extracted) {
  const filters = [];
  if (extracted.paymentId) filters.push({ razorpayPaymentId: extracted.paymentId });
  if (extracted.orderId) filters.push({ razorpayOrderId: extracted.orderId });
  if (extracted.transactionId) filters.push({ txnId: extracted.transactionId });
  if (extracted.utr) filters.push({ utr: extracted.utr });
  if (extracted.referenceId) filters.push({ referenceId: extracted.referenceId }, { txnId: extracted.referenceId });
  return filters;
}

async function persistResult(merchantId, models, fingerprint, result, extracted, message, recordEvent = recordSecurityEvent) {
  const [eventType, severity, status] = RESULT_EVENT[result];
  await models.ProofAudit.updateOne(
    { fingerprint },
    { $setOnInsert: { fingerprint, result, transactionId: extracted.transactionId, paymentId: extracted.paymentId, orderId: extracted.orderId, referenceId: extracted.referenceId || extracted.utr } },
    { upsert: true }
  );
  await recordEvent(merchantId, {
    type: eventType, severity, status, message,
    paymentId: extracted.paymentId, orderId: extracted.orderId,
    transactionId: extracted.transactionId || extracted.referenceId || extracted.utr,
    metadata: { claimedAmount: extracted.claimedAmount, source: 'FRAUD_CENTER', paymentProofDetected: result !== 'INVALID_PAYMENT_PROOF', proofResult: result },
  });
}

async function analyzePaymentProof({ merchantId, imageData, ocr = extractTextFromImage, models: injectedModels, recordEvent = recordSecurityEvent, persist = true }) {
  const buffer = decodeImage(imageData);
  const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');
  const models = injectedModels || getMerchantModels(merchantId);
  const { text, confidence } = await ocr(buffer);
  const extracted = extractPaymentInformation(text);
  const detection = detectPaymentProof(text, extracted);
  const base = { success: true, paymentProofDetected: detection.detected, extracted, ocrConfidence: Math.round(confidence), fingerprint: undefined };
  const save = (...args) => persist ? persistResult(...args) : Promise.resolve();

  if (!detection.detected) {
    const result = 'INVALID_PAYMENT_PROOF';
    await save(merchantId, models, fingerprint, result, extracted, 'Uploaded image does not contain sufficient digital-payment evidence.', recordEvent);
    return { ...base, result, verification: { matchingTransaction: false, merchantMatch: null, amountMatch: null } };
  }
  if (persist && await models.ProofAudit.exists({ fingerprint })) {
    await recordEvent(merchantId, { type: 'DUPLICATE_PROOF', severity: 'WARNING', status: 'DUPLICATE', message: 'This payment proof has already been checked.', metadata: { source: 'FRAUD_CENTER', paymentProofDetected: true, proofResult: 'DUPLICATE_PROOF' } });
    return { ...base, result: 'DUPLICATE_PROOF', verification: { matchingTransaction: null, merchantMatch: null, amountMatch: null } };
  }
  if (extracted.merchantId && extracted.merchantId !== merchantId) {
    const result = 'MERCHANT_MISMATCH';
    await save(merchantId, models, fingerprint, result, extracted, 'Payment proof identifies a different merchant.', recordEvent);
    return { ...base, result, verification: { matchingTransaction: false, merchantMatch: false, amountMatch: null } };
  }
  const filters = buildLookup(extracted);
  if (!filters.length) {
    const result = 'UNREADABLE_PAYMENT_PROOF';
    await save(merchantId, models, fingerprint, result, extracted, 'Payment-related image lacks a reliable transaction identifier.', recordEvent);
    return { ...base, result, verification: { matchingTransaction: false, merchantMatch: null, amountMatch: null } };
  }
  const transaction = await models.Transaction.findOne({ $or: filters });
  if (!transaction) {
    const result = 'PAYMENT_NOT_FOUND';
    await save(merchantId, models, fingerprint, result, extracted, 'No matching trusted payment record was found for this merchant.', recordEvent);
    return { ...base, result, verification: { matchingTransaction: false, merchantMatch: null, amountMatch: null } };
  }
  if (extracted.claimedAmount !== null && extracted.claimedAmount !== transaction.amount) {
    const result = 'AMOUNT_MISMATCH';
    await save(merchantId, models, fingerprint, result, extracted, 'Screenshot amount does not match the trusted transaction.', recordEvent);
    return { ...base, result, verifiedAmount: transaction.amount, verification: { matchingTransaction: true, merchantMatch: true, amountMatch: false } };
  }
  const result = transaction.status === 'pending' ? 'PAYMENT_PENDING' : transaction.status === 'failed' ? 'PAYMENT_FAILED' : transaction.status === 'verified' ? 'VERIFIED_PAYMENT' : 'PAYMENT_NOT_FOUND';
  await save(merchantId, models, fingerprint, result, extracted, result === 'VERIFIED_PAYMENT' ? 'Payment proof matched a trusted merchant transaction.' : `Trusted transaction status is ${transaction.status}.`, recordEvent);
  return { ...base, result, verifiedAmount: transaction.amount, trustedTransaction: result === 'VERIFIED_PAYMENT' ? { transactionId: transaction.txnId, gatewayStatus: transaction.gatewayStatus || null, trustpayStatus: transaction.status } : undefined, verification: { matchingTransaction: true, merchantMatch: true, amountMatch: extracted.claimedAmount === null ? null : true } };
}

module.exports = { analyzePaymentProof, decodeImage, detectPaymentProof, extractPaymentInformation, buildLookup, extractTextFromImage };
