const crypto = require('crypto');
const Razorpay = require('razorpay');

const MAX_AMOUNT_RUPEES = 1000000;
let client;

function configurationError(message) {
  const error = new Error(message);
  error.code = 'RAZORPAY_NOT_CONFIGURED';
  return error;
}

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw configurationError('Razorpay Test Mode is not configured on the backend.');
  }
  if (!client) client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  return client;
}

function getPublicKeyId() {
  if (!process.env.RAZORPAY_KEY_ID) throw configurationError('Razorpay Key ID is not configured on the backend.');
  return process.env.RAZORPAY_KEY_ID;
}

function amountToPaise(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT_RUPEES) {
    const error = new Error(`Amount must be greater than ₹0 and no more than ₹${MAX_AMOUNT_RUPEES}.`);
    error.code = 'INVALID_AMOUNT';
    throw error;
  }
  const paise = Math.round(amount * 100);
  if (Math.abs(amount * 100 - paise) > 1e-7) {
    const error = new Error('Amount cannot have more than two decimal places.');
    error.code = 'INVALID_AMOUNT';
    throw error;
  }
  return paise;
}

function safeEqual(expected, supplied) {
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(String(supplied || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyCheckoutSignature(orderId, paymentId, signature) {
  if (!process.env.RAZORPAY_KEY_SECRET) throw configurationError('Razorpay Key Secret is not configured on the backend.');
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw configurationError('Razorpay Webhook Secret is not configured on the backend.');
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

function createTrustPayId() {
  return `TP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function isWebhookConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

module.exports = {
  MAX_AMOUNT_RUPEES, amountToPaise, createTrustPayId, getPublicKeyId,
  getRazorpayClient, verifyCheckoutSignature, verifyWebhookSignature, isWebhookConfigured,
};
