const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeMessage, analyzeQrPayload, redactOtp } = require('../utils/safetyAnalysis');
const { hashPassword, verifyPassword } = require('../utils/passwords');

test('KYC urgency and payment language produces explainable HIGH risk', () => {
  const result = analyzeMessage('Your KYC expires today, pay immediately');
  assert.equal(result.riskLevel, 'HIGH');
  assert.ok(result.indicators.includes('KYC threat'));
  assert.ok(result.indicators.includes('Urgency'));
  assert.ok(result.indicators.includes('Payment request'));
});

test('bank blocking and ₹25,000 demand produces HIGH risk with high-value reason', () => {
  const result = analyzeMessage('Your bank account will be blocked. Pay ₹25,000 now.');
  assert.equal(result.riskLevel, 'HIGH');
  assert.ok(result.indicators.includes('Bank impersonation'));
  assert.ok(result.indicators.includes('High-value payment request'));
});

test('OTP sharing request is CRITICAL and numeric codes are redacted', () => {
  const result = analyzeMessage('Share your OTP 482019 with customer support for refund', true);
  assert.equal(result.riskLevel, 'CRITICAL');
  assert.equal(result.resultCode, 'OTP_SHARING_REQUEST');
  assert.equal(result.redactedText.includes('482019'), false);
  assert.match(redactOtp('code 123456'), /REDACTED CODE/);
});

test('ordinary message remains LOW without invented scam indicators', () => {
  const result = analyzeMessage('Meet me at college at 4');
  assert.equal(result.riskLevel, 'LOW');
  assert.deepEqual(result.indicators, []);
});

test('QR parser classifies UPI and suspicious URL structures cautiously', () => {
  const upi = analyzeQrPayload('upi://pay?pa=merchant@upi&pn=Vedant%20Electronics&am=100&cu=INR');
  assert.equal(upi.type, 'UPI PAYMENT');
  assert.equal(upi.result, 'UNKNOWN');
  assert.equal(upi.payee, 'merchant@upi');
  const ip = analyzeQrPayload('http://192.0.2.1/pay');
  assert.equal(ip.result, 'SUSPICIOUS');
});

test('new account password hashes are salted and verifiable', () => {
  const stored = hashPassword('correct horse battery staple');
  assert.notEqual(stored, 'correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', stored), true);
  assert.equal(verifyPassword('wrong password', stored), false);
});
