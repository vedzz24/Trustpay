const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneNumber, maskPhoneNumber } = require('../utils/phone');

test('Indian phone numbers normalize to a single E.164 identity', () => {
  assert.equal(normalizePhoneNumber('98765 43210'), '+919876543210');
  assert.equal(normalizePhoneNumber('+91 98765-43210'), '+919876543210');
});

test('invalid phone numbers are rejected and display values are masked', () => {
  assert.throws(() => normalizePhoneNumber('123'));
  const masked = maskPhoneNumber('+919876543210');
  assert.equal(masked.endsWith('3210'), true);
  assert.equal(masked.includes('87654'), false);
});
