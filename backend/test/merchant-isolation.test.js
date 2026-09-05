const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/User');
const { createTransactionsRouter } = require('../routes/transactions');
const securityRoutes = require('../routes/security');
const { generateToken } = require('../utils/auth');
const {
  getMerchantDatabaseName,
  getMerchantConnection,
  getMerchantModels,
  initializeMerchantDatabase,
} = require('../utils/merchantDb');

test('merchant database names are derived and validated server-side', () => {
  assert.equal(getMerchantDatabaseName('MER001'), 'trustpay_MER001');
  assert.equal(getMerchantDatabaseName('MER003'), 'trustpay_MER003');
  assert.throws(() => getMerchantDatabaseName('../admin'));
  assert.throws(() => getMerchantDatabaseName('MER001_other'));
});

test('transactions HTTP route returns ₹100/₹250/empty and ignores requested merchantId', async () => {
  const ledgers = {
    MER001: [{ _id: '1', txnId: 'M1-100', amount: 100, status: 'verified', time: 1 }],
    MER002: [{ _id: '2', txnId: 'M2-250', amount: 250, status: 'verified', time: 2 }],
    MER003: [],
  };
  const selected = [];
  const fakeModels = merchantId => {
    selected.push(merchantId);
    return {
      connection: { name: `trustpay_${merchantId}` },
      Transaction: {
        find: () => ({
          sort() { return this; },
          limit() { return Promise.resolve(ledgers[merchantId]); },
        }),
      },
    };
  };
  const fakeAuth = (req, res, next) => {
    const merchantId = req.headers.authorization?.replace('Bearer ', '');
    if (!ledgers[merchantId]) return res.status(403).json({ success: false });
    req.user = { role: 'merchant', merchantId };
    next();
  };
  const app = express();
  app.use('/api/transactions', createTransactionsRouter({ requireMerchant: fakeAuth, getMerchantModels: fakeModels }));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/transactions`;
    const request = token => fetch(`${url}?merchantId=MER999`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    const [mer1, mer2, mer3] = await Promise.all([request('MER001'), request('MER002'), request('MER003')]);
    assert.equal(mer1.revenue, 100);
    assert.deepEqual(mer1.transactions.map(item => item.amount), [100]);
    assert.equal(mer2.revenue, 250);
    assert.deepEqual(mer2.transactions.map(item => item.amount), [250]);
    assert.equal(mer3.revenue, 0);
    assert.equal(mer3.total, 0);
    assert.deepEqual(mer3.transactions, []);
    assert.deepEqual(selected.sort(), ['MER001', 'MER002', 'MER003']);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('authenticated API isolates ₹100/₹250/empty merchants and ignores manipulated parameters', {
  skip: !process.env.TEST_MONGO_URI || process.env.ALLOW_DB_DROP_TESTS !== 'true'
    ? 'Set TEST_MONGO_URI to a disposable MongoDB server and ALLOW_DB_DROP_TESTS=true'
    : false,
}, async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: 'trustpay_test_central' });
  const central = mongoose.connection;
  const merchantIds = ['MER001', 'MER002', 'MER003'];
  let server;
  try {
    await Promise.all(merchantIds.map(id => initializeMerchantDatabase(id, central)));
    const mer1 = getMerchantModels('MER001', central);
    const mer2 = getMerchantModels('MER002', central);
    const mer3 = getMerchantModels('MER003', central);

    await mer1.Transaction.create({ txnId: 'M1-100', amount: 100, status: 'verified' });
    await mer2.Transaction.create({ txnId: 'M2-250', amount: 250, status: 'verified' });
    await mer1.SecurityEvent.insertMany([
      { eventId: 'SEC-M1-VERIFIED', merchantId: 'MER001', type: 'PAYMENT_VERIFIED', severity: 'INFO', message: '₹100 payment verified.', status: 'VERIFIED' },
      { eventId: 'SEC-M1-DUPLICATE', merchantId: 'MER001', type: 'DUPLICATE_WEBHOOK', severity: 'WARNING', message: 'Duplicate event ignored.', status: 'BLOCKED' },
    ]);
    await mer2.SecurityEvent.create({ eventId: 'SEC-M2-FAILED', merchantId: 'MER002', type: 'PAYMENT_FAILED', severity: 'WARNING', message: 'Payment failed.', status: 'FAILED' });

    const users = await User.create(merchantIds.map((merchantId, index) => ({
      name: `Test Merchant ${index + 1}`,
      merchantName: `Test Merchant ${index + 1}`,
      businessName: `Test Business ${index + 1}`,
      email: `isolation-${merchantId.toLowerCase()}@example.test`,
      passwordHash: 'test-only-hash',
      role: 'merchant',
      merchantId,
      upiId: `isolation-${merchantId.toLowerCase()}@test`,
    })));
    const tokens = users.map(generateToken);
    const app = express();
    app.use(express.json());
    app.use('/api/transactions', createTransactionsRouter());
    app.use('/api/security', securityRoutes);
    server = await new Promise(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/transactions`;
    const request = async (token, suffix = '') => {
      const response = await fetch(`${baseUrl}${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      return response.json();
    };

    const response1 = await request(tokens[0], '?merchantId=MER002');
    const response2 = await request(tokens[1], '?merchantId=MER001');
    const response3 = await request(tokens[2]);
    assert.equal(response1.revenue, 100);
    assert.equal(response1.total, 1);
    assert.deepEqual(response1.transactions.map(item => item.amount), [100]);
    assert.equal(response2.revenue, 250);
    assert.equal(response2.total, 1);
    assert.deepEqual(response2.transactions.map(item => item.amount), [250]);
    assert.equal(response3.revenue, 0);
    assert.equal(response3.total, 0);
    assert.deepEqual(response3.transactions, []);

    const securityRequest = async (token, path) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/security/${path}?merchantId=MER999`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      return response.json();
    };
    const [events1, events2, events3, status3] = await Promise.all([
      securityRequest(tokens[0], 'events'), securityRequest(tokens[1], 'events'),
      securityRequest(tokens[2], 'events'), securityRequest(tokens[2], 'status'),
    ]);
    assert.deepEqual(events1.events.map(item => item.type).sort(), ['DUPLICATE_WEBHOOK', 'PAYMENT_VERIFIED']);
    assert.deepEqual(events2.events.map(item => item.type), ['PAYMENT_FAILED']);
    assert.deepEqual(events3.events, []);
    assert.deepEqual(status3.statistics, { verifiedPaymentsToday: 0, invalidSignatureAttempts: 0, duplicateEventsBlocked: 0, failedPayments: 0 });

    assert.equal(await mer1.Transaction.countDocuments(), 1);
    assert.equal(await mer2.Payment.countDocuments(), 1);
    assert.equal(await mer3.Payment.countDocuments(), 0);
    assert.equal(await mer2.Payment.countDocuments({ txnId: 'M1-100' }), 0);
    assert.notEqual(getMerchantConnection('MER001', central).name, getMerchantConnection('MER002', central).name);
    assert.strictEqual(getMerchantConnection('MER001', central), getMerchantConnection('MER001', central));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await User.deleteMany({ email: /^isolation-mer\d+@example\.test$/ });
    await Promise.all(merchantIds.map(id => getMerchantConnection(id, central).dropDatabase()));
    await mongoose.disconnect();
  }
});
