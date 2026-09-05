const test = require('node:test');
const assert = require('node:assert/strict');
const LoginOtp = require('../models/LoginOtp');
const { webhookLogSchema } = require('../models/merchantSchemas');

test('WebhookLog declares one canonical unique sparse eventId index', () => {
  const indexes = webhookLogSchema.indexes().filter(([keys]) => keys.eventId === 1);
  assert.equal(indexes.length, 1);
  assert.deepEqual(indexes[0], [
    { eventId: 1 },
    { name: 'eventId_unique_sparse', unique: true, sparse: true },
  ]);
});

test('LoginOtp declares expiresAt only once and preserves TTL retention', () => {
  const indexes = LoginOtp.schema.indexes().filter(([keys]) => keys.expiresAt === 1);
  assert.equal(indexes.length, 1);
  assert.equal(indexes[0][1].name, 'expiresAt_1');
  assert.equal(indexes[0][1].expireAfterSeconds, 86400);
});
