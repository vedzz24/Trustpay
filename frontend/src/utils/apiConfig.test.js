import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLoginResponse, resolveApiBaseUrl } from './apiConfig.js';

test('uses localhost when no API base URL is configured', () => {
  assert.equal(resolveApiBaseUrl({ fallbackUrl: 'http://localhost:5000' }), 'http://localhost:5000/api');
});

test('configured production origin receives the API prefix', () => {
  assert.equal(resolveApiBaseUrl({ apiBaseUrl: 'https://trustpay-api.onrender.com' }), 'https://trustpay-api.onrender.com/api');
});

test('configured API URL is not given a duplicate API prefix', () => {
  assert.equal(resolveApiBaseUrl({ apiBaseUrl: 'https://api.example.com/api/' }), 'https://api.example.com/api');
});

test('login errors distinguish network, credentials, role, and server failures', () => {
  assert.equal(normalizeLoginResponse({ networkError: true, message: 'Cannot connect to TrustPay server.' }).message, 'Cannot connect to TrustPay server.');
  assert.equal(normalizeLoginResponse({ httpStatus: 401 }).message, 'Invalid email or password.');
  assert.equal(normalizeLoginResponse({ httpStatus: 403 }).message, 'This account belongs to a different TrustPay account type.');
  assert.equal(normalizeLoginResponse({ httpStatus: 500 }).message, 'TrustPay encountered a server error.');
});
