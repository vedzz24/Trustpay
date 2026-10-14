const test = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../services/emailTemplates');

process.env.PUBLIC_APP_URL = 'https://trustpay.example';

const cases = [
  ['user', templates.buildUserWelcomeEmail({ name: 'Aarav Sharma', email: 'aarav@example.com' }), 'Welcome to GuardX — Your account is ready', '/user/dashboard'],
  ['merchant', templates.buildMerchantWelcomeEmail({ merchantName: 'Vedant', businessName: 'Vedant Electronics', merchantId: 'MER001', upiId: 'mer001@trustpay' }), 'Welcome to GuardX Merchant — Your merchant account is ready', '/'],
  ['guardian welcome', templates.buildGuardianWelcomeEmail({ name: 'Priya', email: 'priya@example.com' }), 'Welcome to GuardX Guardian Protection — Account Ready', '/guardian/dashboard'],
  ['login notification', templates.buildLoginNotificationEmail({ name: 'Aarav', email: 'aarav@example.com', role: 'user', ipAddress: '127.0.0.1' }), 'GuardX Security Alert — New sign-in to your User account', '/user/dashboard'],
  ['invitation', templates.buildGuardianInvitationEmail({ invitationUrl: 'https://trustpay.example/guardian/accept/safe-token' }), 'You’ve been invited to become a GuardX Guardian', '/guardian/accept/safe-token'],
  ['accepted', templates.buildGuardianAcceptedEmail({ userName: 'Aarav', guardianName: 'Rahul', guardianEmail: 'rahul@example.com', audience: 'user' }), 'Guardian Protection is now active', '/user/guardian'],
  ['high alert', templates.buildGuardianRiskAlertEmail({ riskLevel: 'HIGH', checkType: 'SCAM MESSAGE', reasons: ['Urgency'] }), 'GuardX Security Alert — High-risk activity detected', '/guardian/alerts'],
  ['critical alert', templates.buildGuardianRiskAlertEmail({ riskLevel: 'CRITICAL', checkType: 'OTP SCAM CHECK', reasons: ['OTP sharing request'] }), 'GuardX Security Alert — Critical-risk activity detected', '/guardian/alerts'],
  ['removed', templates.buildGuardianRemovedEmail(), 'GuardX Guardian Protection has been removed', null],
];

for (const [name, email, subject, path] of cases) {
  test(`${name} template has branded HTML, text fallback and expected subject`, () => {
    assert.equal(email.subject, subject);
    assert.match(email.html, /GUARDX/);
    assert.match(email.html, /Secure\. Verify\. Protect\./);
    assert.match(email.html, /width=device-width/);
    assert.match(email.html, /This is an automated account or security notification/);
    assert.match(email.text, /Digital Payment Safety & Verification/);
    assert.ok(email.html.length > 1000);
    assert.ok(email.text.length > 200);
    if (path) assert.ok(email.html.includes(`https://trustpay.example${path}`));
  });
}

test('merchant template contains public merchant identity but no internal database name', () => {
  const email = cases[1][1];
  assert.match(email.html, /Vedant Electronics/);
  assert.match(email.html, /MER001/);
  assert.match(email.html, /mer001@trustpay/);
  assert.doesNotMatch(email.html, /trustpay_MER001/);
});

test('templates never interpolate password, JWT or actual secret values', () => {
  for (const [, email] of cases) {
    const combined = `${email.html}\n${email.text}`;
    assert.doesNotMatch(combined, /super-secret-value|Bearer eyJ|passwordHash|mongodb:\/\//i);
  }
});
