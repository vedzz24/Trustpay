const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  amountToPaise, createTrustPayId, verifyCheckoutSignature, verifyWebhookSignature,
} = require('../services/razorpay');

test('Razorpay amount validation safely converts rupees to paise', () => {
  assert.equal(amountToPaise(100), 10000);
  assert.equal(amountToPaise('250.50'), 25050);
  for (const invalid of [0, -1, NaN, Infinity, 'abc', 1000001, 1.001]) {
    assert.throws(() => amountToPaise(invalid));
  }
});

test('TrustPay references are opaque and unique-shaped', () => {
  const first = createTrustPayId();
  const second = createTrustPayId();
  assert.match(first, /^TP-[A-F0-9]{8}$/);
  assert.notEqual(first, second);
});

test('checkout verification accepts only the HMAC for the trusted order/payment pair', () => {
  const previous = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = 'test_checkout_secret';
  try {
    const valid = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update('order_MER001|pay_001').digest('hex');
    assert.equal(verifyCheckoutSignature('order_MER001', 'pay_001', valid), true);
    assert.equal(verifyCheckoutSignature('order_MER002', 'pay_001', valid), false);
    assert.equal(verifyCheckoutSignature('order_MER001', 'pay_002', valid), false);
    assert.equal(verifyCheckoutSignature('order_MER001', 'pay_001', 'invalid'), false);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previous;
  }
});

test('webhook verification uses the untouched raw request bytes', () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  try {
    const raw = Buffer.from('{"event":"payment.captured","payload":{"amount":10000}}');
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
    assert.equal(verifyWebhookSignature(raw, signature), true);
    assert.equal(verifyWebhookSignature(Buffer.from(`${raw.toString()} `), signature), false);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});
