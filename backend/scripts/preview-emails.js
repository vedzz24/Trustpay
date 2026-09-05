require('dotenv').config();
const fs = require('fs');
const path = require('path');
const templates = require('../services/emailTemplates');

if (process.env.NODE_ENV === 'production') throw new Error('Email previews are disabled in production');
const baseUrlArgument = process.argv.find(value => value.startsWith('--base-url='))?.slice('--base-url='.length);
if (!process.env.PUBLIC_APP_URL && baseUrlArgument) process.env.PUBLIC_APP_URL = baseUrlArgument;
if (!process.env.PUBLIC_APP_URL) throw new Error('Set PUBLIC_APP_URL or pass --base-url before generating email previews');

const previews = {
  'user-welcome': templates.buildUserWelcomeEmail({ name: 'Aarav Sharma', email: 'aarav@example.com' }),
  'merchant-welcome': templates.buildMerchantWelcomeEmail({ merchantName: 'Vedant', businessName: 'Vedant Electronics', merchantId: 'MER001', upiId: 'mer001@trustpay' }),
  'guardian-invitation': templates.buildGuardianInvitationEmail({ invitationUrl: `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}/guardian/accept/preview-token` }),
  'guardian-accepted-user': templates.buildGuardianAcceptedEmail({ userName: 'Aarav Sharma', guardianName: 'Rahul Sharma', guardianEmail: 'rahul@example.com', audience: 'user' }),
  'guardian-accepted-guardian': templates.buildGuardianAcceptedEmail({ userName: 'Aarav Sharma', guardianName: 'Rahul Sharma', guardianEmail: 'rahul@example.com', audience: 'guardian' }),
  'guardian-high-alert': templates.buildGuardianRiskAlertEmail({ riskLevel: 'HIGH', checkType: 'SCAM MESSAGE', reasons: ['Bank impersonation', 'Urgent payment request'] }),
  'guardian-critical-alert': templates.buildGuardianRiskAlertEmail({ riskLevel: 'CRITICAL', checkType: 'OTP SCAM CHECK', reasons: ['OTP sharing request'] }),
  'guardian-removed': templates.buildGuardianRemovedEmail(),
  'payment-verified-future': templates.buildPaymentVerifiedEmail({ amount: 500, transactionId: 'TP-PREVIEW' }),
};

const outputArgument = process.argv.find(value => value.startsWith('--output='))?.slice('--output='.length);
const outputDirectory = outputArgument ? path.resolve(outputArgument) : path.join(__dirname, '..', 'email-previews');
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [name, template] of Object.entries(previews)) {
  fs.writeFileSync(path.join(outputDirectory, `${name}.html`), template.html, 'utf8');
  fs.writeFileSync(path.join(outputDirectory, `${name}.txt`), `Subject: ${template.subject}\n\n${template.text}`, 'utf8');
}
console.info(`Generated ${Object.keys(previews).length} TrustPay email previews in ${outputDirectory}`);
