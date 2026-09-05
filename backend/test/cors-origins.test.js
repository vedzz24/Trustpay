const test = require('node:test');
const assert = require('node:assert/strict');
const { isDevelopmentOrigin } = require('../utils/corsOrigins');

test('accepts Vite localhost and private-LAN development origins', () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://10.2.3.4:5173', 'http://172.16.0.2:5173', 'http://172.31.255.2:5173', 'http://192.168.29.237:5173']) {
    assert.equal(isDevelopmentOrigin(origin), true, origin);
  }
});

test('rejects public IPs, unsafe schemes, other ports, and out-of-range 172 addresses', () => {
  for (const origin of ['http://8.8.8.8:5173', 'https://192.168.1.2:5173', 'http://192.168.1.2:3000', 'http://172.15.0.2:5173', 'http://172.32.0.2:5173']) {
    assert.equal(isDevelopmentOrigin(origin), false, origin);
  }
});
