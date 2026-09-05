const test = require('node:test');
const assert = require('node:assert/strict');
const { createGuardianAlertForUser } = require('../services/guardianAlerts');

function fakeDependencies(active = true) {
  const created = [];
  return {
    created,
    deps: {
      GuardianLink: { findOne: query => ({ lean: async () => active && query.userId === 'USER_A' ? { userId: 'USER_A', guardianId: 'GUARDIAN_A', status: 'active' } : null }) },
      GuardianAlert: { create: async value => { created.push(value); return value; } },
      User: { findById: () => ({ select: () => ({ lean: async () => null }) }) },
      sendGuardianAlertEmail: async () => {},
    },
  };
}

test('LOW safety check does not create an urgent Guardian alert', async () => {
  const fake = fakeDependencies();
  const alert = await createGuardianAlertForUser({ userId: 'USER_A', checkType: 'SCAM MESSAGE', riskLevel: 'LOW', reasons: [] }, fake.deps);
  assert.equal(alert, null);
  assert.equal(fake.created.length, 0);
});

test('HIGH safety check creates an alert only for the active linked guardian', async () => {
  const fake = fakeDependencies();
  const alert = await createGuardianAlertForUser({
    userId: 'USER_A', checkType: 'SCAM MESSAGE', riskLevel: 'HIGH',
    reasons: ['Bank impersonation', 'Urgency', 'High-value payment request'],
    summary: 'HIGH message safety check.',
  }, fake.deps);
  assert.equal(alert.guardianId, 'GUARDIAN_A');
  assert.equal(alert.userId, 'USER_A');
  assert.deepEqual(alert.riskReasons, ['Bank impersonation', 'Urgency', 'High-value payment request']);
  assert.equal(fake.created.length, 1);
});

test('removed or missing Guardian link prevents future HIGH alerts', async () => {
  const fake = fakeDependencies(false);
  const alert = await createGuardianAlertForUser({ userId: 'USER_A', checkType: 'OTP SCAM CHECK', riskLevel: 'CRITICAL', reasons: ['OTP request'] }, fake.deps);
  assert.equal(alert, null);
  assert.equal(fake.created.length, 0);
});

test('Guardian alert sanitization redacts OTP-like numeric values', async () => {
  const fake = fakeDependencies();
  const alert = await createGuardianAlertForUser({ userId: 'USER_A', checkType: 'OTP SCAM CHECK', riskLevel: 'CRITICAL', reasons: ['Share OTP 482019'], summary: 'OTP 482019 requested' }, fake.deps);
  assert.equal(alert.riskReasons[0].includes('482019'), false);
  assert.equal(alert.summary.includes('482019'), false);
});
