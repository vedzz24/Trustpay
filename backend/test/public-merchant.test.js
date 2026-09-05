const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createPublicRouter } = require('../routes/public');

const merchants = {
  MER001: { merchantId: 'MER001', businessName: 'Merchant One', merchantName: 'One', upiId: 'mer001@trustpay' },
  MER002: { merchantId: 'MER002', businessName: 'Merchant Two', merchantName: 'Two', upiId: 'mer002@trustpay' },
};

function fakeUserModel() {
  return {
    findOne(filter) {
      const value = filter.role === 'merchant' ? merchants[filter.merchantId] || null : null;
      return {
        select() { return this; },
        lean() { return Promise.resolve(value); },
      };
    },
  };
}

test('public merchant endpoint resolves MER001/MER002 independently and rejects invalid merchant', async () => {
  const app = express();
  app.use('/api/public', createPublicRouter({ User: fakeUserModel() }));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/public/merchant`;
    const [one, two, invalid] = await Promise.all([
      fetch(`${base}/MER001`), fetch(`${base}/MER002`), fetch(`${base}/MER999`),
    ]);
    assert.equal(one.status, 200);
    assert.equal(two.status, 200);
    assert.equal(invalid.status, 404);
    const oneBody = await one.json();
    const twoBody = await two.json();
    assert.deepEqual(oneBody.merchant, merchants.MER001);
    assert.deepEqual(twoBody.merchant, merchants.MER002);
    assert.notEqual(oneBody.merchant.merchantId, twoBody.merchant.merchantId);
    assert.equal('email' in oneBody.merchant, false);
    assert.equal('passwordHash' in oneBody.merchant, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
