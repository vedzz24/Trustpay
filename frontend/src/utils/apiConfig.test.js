import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLoginResponse, resolveApiBaseUrl } from './apiConfig.js';

test('uses localhost when the frontend is opened through localhost', () => {
  assert.equal(resolveApiBaseUrl({ protocol: 'http:', hostname: 'localhost' }), 'http://localhost:5000/api');
});

test('uses the current private-LAN host without pinning an address', () => {
  assert.equal(resolveApiBaseUrl({ protocol: 'http:', hostname: '192.168.29.237' }), 'http://192.168.29.237:5000/api');
});

test('VITE_API_URL-style configuration overrides automatic detection', () => {
  assert.equal(resolveApiBaseUrl({ apiUrl: 'https://api.example.com/' }), 'https://api.example.com/api');
});

test('login errors distinguish network, credentials, role, and server failures', () => {
  assert.equal(normalizeLoginResponse({ networkError: true, message: 'Cannot connect to TrustPay server.' }).message, 'Cannot connect to TrustPay server.');
  assert.equal(normalizeLoginResponse({ httpStatus: 401 }).message, 'Invalid email or password.');
  assert.equal(normalizeLoginResponse({ httpStatus: 403 }).message, 'This account belongs to a different TrustPay account type.');
  assert.equal(normalizeLoginResponse({ httpStatus: 500 }).message, 'TrustPay encountered a server error.');
});
