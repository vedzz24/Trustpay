const FOOTER_TEXT = `GuardX
Digital Payment Safety & Verification

This is an automated account or security notification.

GuardX will never ask you to share your password, OTP, UPI PIN, card PIN, CVV, Razorpay secret key, webhook secret, or banking credentials by email.`;

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const appUrl = path => {
  const base = String(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  return base ? `${base}${path}` : null;
};

const paragraphs = items => items.map(item => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">${item}</p>`).join('');
const list = items => `<ul style="margin:8px 0 20px;padding-left:22px;color:#334155;font-size:15px;line-height:1.75;">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const sectionTitle = title => `<p style="margin:26px 0 10px;color:#0f172a;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(title)}</p>`;
const detail = (label, value) => value ? `<tr><td style="padding:8px 16px 8px 0;color:#64748b;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td></tr>` : '';
const detailsTable = rows => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 20px;">${rows.join('')}</table>`;

function buildGuardXEmailLayout({ title, preheader, contentHtml, cta }) {
  const button = cta?.url ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;"><tr><td style="border-radius:8px;background:#15bcdf;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 22px;color:#062b33;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;">${escapeHtml(cta.label)}</a></td></tr></table>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,'Helvetica Neue',sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || title)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border-collapse:separate;">
<tr><td style="padding:20px 24px;background:#0f172a;border-radius:12px 12px 0 0;border-top:4px solid #15bcdf;"><p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">GUARDX</p><p style="margin:6px 0 0;color:#67d9ef;font-size:13px;font-weight:600;">Secure. Verify. Protect.</p><p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">Digital Payment Safety &amp; Verification</p></td></tr>
<tr><td style="padding:30px 24px;background:#fff;"><h1 style="margin:0 0 22px;color:#0f172a;font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>${contentHtml}${button}</td></tr>
<tr><td style="padding:22px 24px;background:#e8f8fc;border-radius:0 0 12px 12px;border-top:1px solid #baeaf4;"><p style="margin:0 0 4px;color:#0f172a;font-size:13px;font-weight:700;">GuardX</p><p style="margin:0 0 14px;color:#475569;font-size:12px;">Digital Payment Safety &amp; Verification</p><p style="margin:0 0 10px;color:#64748b;font-size:11px;line-height:1.5;">This is an automated account or security notification.</p><p style="margin:0;color:#64748b;font-size:11px;line-height:1.55;">GuardX will never ask you to share your password, OTP, UPI PIN, card PIN, CVV, Razorpay secret key, webhook secret, or banking credentials by email.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function makeEmail({ subject, title, preheader, contentHtml, text, cta }) {
  return { subject, html: buildGuardXEmailLayout({ title, preheader, contentHtml, cta }), text: `${text.trim()}\n\n${FOOTER_TEXT}` };
}

function buildUserWelcomeEmail({ name, email }) {
  const firstName = escapeHtml(String(name || 'there').trim().split(/\s+/)[0]);
  const subject = 'Welcome to GuardX — Your account is ready';
  return makeEmail({ subject, title: 'Welcome to GuardX', preheader: 'Your GuardX user account is ready.',
    contentHtml: paragraphs([`Hi ${firstName},`, 'Your GuardX account has been created successfully.', 'You can now use GuardX to check suspicious digital-payment situations and save your safety history.'])
      + sectionTitle('Your safety tools include') + list(['QR Safety Check','Scam Message Check','OTP Scam Check','Payment Proof Verification','Shield Scan'])
      + sectionTitle('With your account, you can also') + list(['Save safety reports','Review previous checks','Link a trusted Guardian','Receive important account and security notifications'])
      + sectionTitle('Account details') + detailsTable([detail('Email', email), detail('Account Type', 'User')])
      + sectionTitle('Security reminder') + paragraphs(['GuardX will never ask you to share your password, OTP, UPI PIN, CVV, card PIN, or banking credentials.', 'If you did not create this account, secure your email account and contact GuardX support.', 'Welcome to GuardX. Secure. Verify. Protect.']),
    cta: { label: 'Open GuardX', url: appUrl('/user/dashboard') },
    text: `Welcome to GuardX

Hi ${name || 'there'},

Your GuardX account has been created successfully.

Your safety tools include:
- QR Safety Check
- Scam Message Check
- OTP Scam Check
- Payment Proof Verification
- Shield Scan

With your account, you can save reports, review previous checks, link a trusted Guardian and receive important security notifications.

ACCOUNT DETAILS
Email: ${email}
Account Type: User

SECURITY REMINDER
GuardX will never ask you to share your password, OTP, UPI PIN, CVV, card PIN, or banking credentials.

Open GuardX: ${appUrl('/user/dashboard') || 'Use your configured GuardX application URL.'}` });
}

function buildMerchantWelcomeEmail({ merchantName, businessName, merchantId, upiId }) {
  return makeEmail({ subject: 'Welcome to GuardX Merchant — Your merchant account is ready', title: 'Welcome to GuardX Merchant', preheader: 'Your GuardX merchant account is ready.',
    contentHtml: paragraphs([`Hi ${escapeHtml(merchantName)},`, 'Your GuardX merchant account has been created successfully.', 'Your business is now registered inside GuardX.'])
      + sectionTitle('Merchant identity') + detailsTable([detail('Business Name', businessName), detail('Merchant ID', merchantId), detail('UPI ID', upiId)])
      + sectionTitle('Your GuardX Merchant tools include') + list(['Permanent GuardX QR','Razorpay payment integration','Verified payment dashboard','Transaction history','Payment proof verification','Fraud Center','Security Center','Merchant analytics'])
      + paragraphs(['Your Merchant ID uniquely identifies your business within GuardX.'])
      + sectionTitle('Security notice') + paragraphs(['GuardX will never ask you to share your password, Razorpay Key Secret, webhook secret, OTP, UPI PIN, or banking credentials.', 'Keep all private API credentials secure.', 'You can now access your Merchant Dashboard and permanent GuardX QR.', 'Secure. Verify. Protect.']),
    cta: { label: 'Open Merchant Dashboard', url: appUrl('/') },
    text: `Welcome to GuardX Merchant

Hi ${merchantName},

Your GuardX merchant account has been created successfully.

MERCHANT IDENTITY
Business Name: ${businessName}
Merchant ID: ${merchantId}
${upiId ? `UPI ID: ${upiId}\n` : ''}
Your tools include a permanent GuardX QR, Razorpay integration, verified payment dashboard, transaction history, payment proof verification, Fraud Center, Security Center and merchant analytics.

SECURITY NOTICE
GuardX will never ask for your password, Razorpay Key Secret, webhook secret, OTP, UPI PIN or banking credentials.

Open Merchant Dashboard: ${appUrl('/') || 'Use your configured GuardX application URL.'}` });
}

function buildGuardianInvitationEmail({ invitationUrl }) {
  return makeEmail({ subject: 'You’ve been invited to become a GuardX Guardian', title: 'GuardX Guardian Invitation', preheader: 'A GuardX user invited you to become their Guardian.',
    contentHtml: paragraphs(['Hi,','A GuardX user has invited you to become their trusted Guardian.','Guardian Protection helps a trusted person review HIGH and CRITICAL safety alerts generated inside GuardX.'])
      + sectionTitle('What a Guardian can do') + list(['View high-risk GuardX safety alerts','Review suspicious QR, message and payment checks','Mark alerts as reviewed','Help the protected user independently verify suspicious situations'])
      + sectionTitle('What a Guardian cannot do') + list(["Access the user's bank account",'See passwords, OTPs or UPI PINs','Automatically block Google Pay, PhonePe or bank transactions'])
      + paragraphs(['The invitation expires in 48 hours.','If you were not expecting this invitation, you can safely ignore this email.']),
    cta: { label: 'Accept Guardian Invitation', url: invitationUrl },
    text: `GuardX Guardian Invitation

A GuardX user invited you to become their trusted Guardian. You may review HIGH and CRITICAL GuardX safety alerts, but cannot access bank accounts, credentials or block external payments.

The invitation expires in 48 hours.

Accept Guardian Invitation: ${invitationUrl}` });
}

function buildGuardianAcceptedEmail({ userName, guardianName, guardianEmail, audience = 'user' }) {
  const forUser = audience === 'user';
  return makeEmail({ subject: 'Guardian Protection is now active', title: 'Guardian Protection Activated', preheader: 'A GuardX Guardian link is now active.',
    contentHtml: paragraphs([`Hi ${escapeHtml(forUser ? userName : guardianName)},`, forUser ? 'Your Guardian invitation has been accepted successfully.' : `You are now the active Guardian for ${escapeHtml(userName)}.`])
      + (forUser ? detailsTable([detail('Guardian', guardianName), detail('Email', guardianEmail), detail('Protection', 'ACTIVE')]) : detailsTable([detail('Protected User', userName), detail('Protection', 'ACTIVE')]))
      + paragraphs(['When authenticated GuardX safety checks generate HIGH or CRITICAL risk alerts, the linked Guardian may receive a GuardX alert.','The Guardian does not receive passwords, OTPs, UPI PINs, banking credentials, or private merchant data.','The protected user can manage or remove Guardian Protection at any time.']),
    cta: { label: forUser ? 'View Guardian Protection' : 'Open Guardian Dashboard', url: appUrl(forUser ? '/user/guardian' : '/guardian/dashboard') },
    text: `Guardian Protection Activated

Hi ${forUser ? userName : guardianName},

Guardian Protection is now ACTIVE.
${forUser ? `Guardian: ${guardianName}\nEmail: ${guardianEmail}` : `Protected User: ${userName}`}

HIGH or CRITICAL authenticated GuardX safety checks may generate Guardian alerts. No passwords, OTPs, UPI PINs, banking credentials or private merchant data are shared.

Open GuardX: ${appUrl(forUser ? '/user/guardian' : '/guardian/dashboard') || 'Use your configured GuardX application URL.'}` });
}

function buildGuardianRiskAlertEmail({ riskLevel, checkType, reasons = [] }) {
  const critical = String(riskLevel).toUpperCase() === 'CRITICAL';
  const safeReasons = reasons.length ? reasons : ['GuardX classified the completed safety check as high risk.'];
  return makeEmail({ subject: `GuardX Security Alert — ${critical ? 'Critical' : 'High'}-risk activity detected`, title: 'GuardX Guardian Security Alert', preheader: `${riskLevel} GuardX safety alert.`,
    contentHtml: paragraphs(['A user protected by your Guardian account generated a high-risk GuardX safety alert.'])
      + sectionTitle('Alert summary') + detailsTable([detail('Risk Level', riskLevel), detail('Check Type', checkType)])
      + sectionTitle('Detected risk indicators') + list(safeReasons.map(escapeHtml))
      + sectionTitle('Recommended action') + paragraphs(['Contact the protected user through a trusted method and independently verify the situation before they proceed with any payment or credential-sharing request.'])
      + sectionTitle('Important') + paragraphs(['Do not ask the protected user to send you their OTP, UPI PIN, password, CVV, or banking credentials.']),
    cta: { label: 'Review Alert', url: appUrl('/guardian/alerts') },
    text: `GuardX Guardian Security Alert

Risk Level: ${riskLevel}
Check Type: ${checkType}

Detected Risk Indicators:
${safeReasons.map(reason => `- ${reason}`).join('\n')}

Recommended Action:
Contact the protected user through a trusted method and independently verify the situation.

Do not request their OTP, UPI PIN, password, CVV or banking credentials.

Review Alert: ${appUrl('/guardian/alerts') || 'Use your configured GuardX application URL.'}` });
}

function buildGuardianRemovedEmail() {
  return makeEmail({ subject: 'GuardX Guardian Protection has been removed', title: 'Guardian Protection Update', preheader: 'A GuardX Guardian link is no longer active.',
    contentHtml: paragraphs(['Your GuardX Guardian link is no longer active.','Future HIGH or CRITICAL GuardX safety checks from this user will no longer generate Guardian alerts for this account.','No banking credentials or private payment information have been changed.']),
    text: `Guardian Protection Update

Your GuardX Guardian link is no longer active.

Future HIGH or CRITICAL GuardX safety checks from this user will no longer generate Guardian alerts for this account.

No banking credentials or private payment information have been changed.` });
}

function buildPaymentVerifiedEmail({ amount, transactionId }) {
  return makeEmail({ subject: 'GuardX Payment Verified', title: 'Payment Verified', preheader: 'GuardX verified a Razorpay payment record.',
    contentHtml: detailsTable([detail('Amount', `₹${amount}`), detail('GuardX Transaction', transactionId), detail('Gateway', 'Razorpay'), detail('Status', 'VERIFIED')])
      + paragraphs(['This notification confirms GuardX verification status. It does not by itself confirm bank settlement.']),
    cta: { label: 'Open Merchant Dashboard', url: appUrl('/') },
    text: `Payment Verified

Amount: ₹${amount}
GuardX Transaction: ${transactionId}
Gateway: Razorpay
Status: VERIFIED

This does not by itself confirm bank settlement.` });
}

function buildGuardianWelcomeEmail({ name, email }) {
  const firstName = escapeHtml(String(name || 'there').trim().split(/\s+/)[0]);
  const subject = 'Welcome to GuardX Guardian Protection — Account Ready';
  return makeEmail({
    subject,
    title: 'Welcome to GuardX Guardian',
    preheader: 'Your GuardX Guardian account is ready.',
    contentHtml: paragraphs([
      `Hi ${firstName},`,
      'Your GuardX Guardian account has been created successfully.',
      'As a Guardian, you can protect loved ones and family members by monitoring HIGH and CRITICAL digital payment safety alerts.'
    ])
    + sectionTitle('What you can do as a Guardian')
    + list([
      'Send protection link requests to family members and friends',
      'Receive real-time security alerts when protected users encounter HIGH or CRITICAL risks',
      'Review suspicious QR codes, messages, and payment checks together',
      'Help protected users independently verify suspicious payment requests'
    ])
    + sectionTitle('Privacy & Boundaries')
    + list([
      'Guardians never see passwords, OTPs, or UPI PINs',
      'Guardians cannot access bank accounts or stop external bank transactions',
      'Protection is consent-based and users can remove links at any time'
    ])
    + sectionTitle('Account Details')
    + detailsTable([
      detail('Email', email),
      detail('Account Type', 'Guardian')
    ]),
    cta: {
      label: 'Open Guardian Dashboard',
      url: appUrl('/guardian/dashboard')
    },
    text: `Welcome to GuardX Guardian\n\nHi ${name || 'there'},\n\nYour GuardX Guardian account is now active.\nEmail: ${email}\n\nOpen Guardian Dashboard: ${appUrl('/guardian/dashboard') || 'Use your configured GuardX URL.'}`
  });
}

function buildLoginNotificationEmail({ name, email, role, loginTime, ipAddress, userAgent }) {
  const firstName = escapeHtml(String(name || 'there').trim().split(/\s+/)[0]);
  const roleTitle = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  const subject = `GuardX Security Alert — New sign-in to your ${roleTitle} account`;
  const timeStr = loginTime || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return makeEmail({
    subject,
    title: 'New Sign-in Detected',
    preheader: `New sign-in to your GuardX ${roleTitle} account.`,
    contentHtml: paragraphs([
      `Hi ${firstName},`,
      `We detected a new sign-in to your GuardX ${roleTitle} account on ${timeStr}.`
    ])
    + sectionTitle('Sign-in Details')
    + detailsTable([
      detail('Account Email', email),
      detail('Account Type', roleTitle),
      detail('Sign-in Time', timeStr),
      detail('IP Address', ipAddress || 'Unknown / Local'),
      detail('Device / Browser', userAgent ? userAgent.slice(0, 100) : 'Browser Session')
    ])
    + sectionTitle('Was this you?')
    + paragraphs([
      'If you just signed in, you can safely ignore this notification.',
      'If you did not sign in, your account may be compromised. Please change your password immediately and contact GuardX support.',
      'GuardX will never ask you to share your password, OTP, UPI PIN, or banking credentials by email.'
    ]),
    cta: {
      label: 'Open GuardX',
      url: appUrl(role === 'merchant' ? '/' : role === 'guardian' ? '/guardian/dashboard' : '/user/dashboard')
    },
    text: `New Sign-in Detected\n\nHi ${name || 'there'},\n\nA new sign-in to your GuardX ${roleTitle} account was detected on ${timeStr}.\n\nDETAILS:\nAccount Email: ${email}\nAccount Type: ${roleTitle}\nSign-in Time: ${timeStr}\nIP Address: ${ipAddress || 'Unknown'}\nDevice: ${userAgent || 'Unknown'}\n\nIf you did not sign in, please secure your account immediately.\n\nGuardX Security`
  });
}

module.exports = { buildGuardXEmailLayout, buildUserWelcomeEmail, buildMerchantWelcomeEmail, buildGuardianInvitationEmail,
  buildGuardianAcceptedEmail, buildGuardianRiskAlertEmail, buildGuardianRemovedEmail, buildPaymentVerifiedEmail,
  buildGuardianWelcomeEmail, buildLoginNotificationEmail, FOOTER_TEXT };
