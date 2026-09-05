const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePaymentProof, detectPaymentProof, extractPaymentInformation } = require('../utils/fraudProofAnalyzer');

const imageData = value => `data:image/png;base64,${Buffer.from(value).toString('base64')}`;

function dependencies({ text, transaction = null, duplicate = false }) {
  const events = [];
  const audits = [];
  return {
    events,
    audits,
    ocr: async () => ({ text, confidence: 90 }),
    recordEvent: async (merchantId, event) => events.push({ merchantId, ...event }),
    models: {
      ProofAudit: {
        exists: async () => duplicate,
        updateOne: async (...args) => audits.push(args),
      },
      Transaction: { findOne: async () => transaction },
    },
  };
}

async function analyze(options) {
  const deps = dependencies(options);
  const result = await analyzePaymentProof({ merchantId: 'MER001', imageData: imageData(options.image || options.text), ...deps });
  return { result, ...deps };
}

test('Stage 1 rejects a normal selfie instead of returning safe', async () => {
  const { result } = await analyze({ text: 'Alice smiling outdoors portrait camera' });
  assert.equal(result.result, 'INVALID_PAYMENT_PROOF');
  assert.equal(result.paymentProofDetected, false);
});

test('Stage 1 rejects landscape/object/wallpaper text', async () => {
  const { result } = await analyze({ text: 'Mountain sunset wallpaper 2026' });
  assert.equal(result.result, 'INVALID_PAYMENT_PROOF');
});

test('payment-like proof with unknown transaction returns PAYMENT_NOT_FOUND', async () => {
  const { result } = await analyze({ text: 'UPI Payment Successful INR 500 Transaction ID TRX_UNKNOWN_123 Paid to Shop' });
  assert.equal(result.result, 'PAYMENT_NOT_FOUND');
});

test('matching ID with different amount returns AMOUNT_MISMATCH', async () => {
  const { result } = await analyze({ text: 'UPI Payment Successful INR 5,000 Transaction ID TRX_MATCH_123 Paid to Shop', transaction: { txnId: 'TRX_MATCH_123', amount: 50, status: 'verified' } });
  assert.equal(result.result, 'AMOUNT_MISMATCH');
  assert.equal(result.verifiedAmount, 50);
});

test('matching trusted merchant transaction returns VERIFIED_PAYMENT', async () => {
  const { result } = await analyze({ text: 'UPI Payment Successful INR 500 Transaction ID TRX_MATCH_500 Paid to Shop', transaction: { txnId: 'TRX_MATCH_500', amount: 500, status: 'verified' } });
  assert.equal(result.result, 'VERIFIED_PAYMENT');
  assert.equal(result.trustedTransaction.transactionId, 'TRX_MATCH_500');
});

test('proof identifying another merchant returns MERCHANT_MISMATCH without lookup leakage', async () => {
  const deps = dependencies({ text: 'UPI Payment Successful INR 500 Transaction ID TRX_OTHER_500 Merchant MER002' });
  let searched = false;
  deps.models.Transaction.findOne = async () => { searched = true; return null; };
  const result = await analyzePaymentProof({ merchantId: 'MER001', imageData: imageData('merchant mismatch'), ...deps });
  assert.equal(result.result, 'MERCHANT_MISMATCH');
  assert.equal(searched, false);
  assert.equal('otherMerchant' in result, false);
});

test('payment-like but identifier-free proof returns UNREADABLE_PAYMENT_PROOF', async () => {
  const { result } = await analyze({ text: 'UPI Payment Successful INR 500 Paid to Shop 24/08/2026' });
  assert.equal(result.result, 'UNREADABLE_PAYMENT_PROOF');
});

test('repeated payment proof returns DUPLICATE_PROOF', async () => {
  const { result } = await analyze({ text: 'UPI Payment Successful INR 500 Transaction ID TRX_DUP_500 Paid to Shop', duplicate: true });
  assert.equal(result.result, 'DUPLICATE_PROOF');
});

test('one generic payment word is insufficient for payment-proof detection', () => {
  const extracted = extractPaymentInformation('success 500');
  assert.equal(detectPaymentProof('success 500', extracted).detected, false);
});
