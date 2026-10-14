const nodemailer = require('nodemailer');
const templates = require('./emailTemplates');

let transporter;
let missingConfigurationWarned = false;

function smtpConfigured() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM);
}

function provider() {
  const selected = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (selected) return selected;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (smtpConfigured()) return 'smtp';
  return '';
}

function configured() {
  const selected = provider();
  if (selected === 'resend') {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }
  if (selected === 'brevo') {
    return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
  }
  if (selected === 'smtp') {
    return smtpConfigured();
  }
  return false;
}

function configurationError() {
  if (!missingConfigurationWarned) {
    console.warn('⚠️ Email delivery is not configured on this server.');
    console.warn('   For local development: Set EMAIL_PROVIDER=smtp, EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM in .env');
    console.warn('   For Render deployments: Render Free Web Services block SMTP ports (25, 465, 587). Use an HTTP API provider:');
    console.warn('     - Resend: EMAIL_PROVIDER=resend, RESEND_API_KEY, EMAIL_FROM');
    console.warn('     - Brevo:  EMAIL_PROVIDER=brevo, BREVO_API_KEY, EMAIL_FROM');
    missingConfigurationWarned = true;
  }
  const error = new Error('Email service is not configured');
  error.code = 'EMAIL_NOT_CONFIGURED';
  return error;
}

function parseSender(fromStr) {
  const str = String(fromStr || '').trim();
  const match = str.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || 'GuardX', email: match[2].trim() };
  }
  return { name: 'GuardX', email: str };
}

function getTransporter() {
  if (provider() !== 'smtp' || !configured()) throw configurationError();
  if (!transporter) {
    const cleanPassword = String(process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');
    const port = Number(process.env.EMAIL_PORT) || 587;
    const isSecure = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: isSecure,
      auth: { user: process.env.EMAIL_USER, pass: cleanPassword },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

async function sendWithResend(to, template) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: template.subject, html: template.html, text: template.text }),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`Resend rejected the email request with status ${response.status}: ${errorBody}`);
    error.code = 'EMAIL_DELIVERY_FAILED';
    throw error;
  }
  return response.json();
}

async function sendWithBrevo(to, template) {
  const sender = parseSender(process.env.EMAIL_FROM);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`Brevo rejected the email request with status ${response.status}: ${errorBody}`);
    error.code = 'EMAIL_DELIVERY_FAILED';
    throw error;
  }
  return response.json();
}

async function sendTemplate(to, template) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Valid destination email address is required');
  }
  if (!configured()) throw configurationError();
  const selectedProvider = provider();
  if (selectedProvider === 'resend') return sendWithResend(to, template);
  if (selectedProvider === 'brevo') return sendWithBrevo(to, template);

  try {
    return await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    if (['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNREFUSED'].includes(err.code) || err.message?.includes('timeout')) {
      console.error(`⚠️ SMTP connection to ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT} timed out.`);
      console.error('💡 NOTE: Render Free Web Services block outbound traffic on SMTP ports 25, 465, and 587.');
      console.error('   To send emails on Render, use an HTTP-based provider:');
      console.error('   1. Resend: set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in Render environment.');
      console.error('   2. Brevo:  set EMAIL_PROVIDER=brevo, BREVO_API_KEY, and EMAIL_FROM in Render environment.');
    }
    throw err;
  }
}

function getStatus() {
  const p = provider();
  const isConfigured = configured();
  return {
    configured: isConfigured,
    provider: p || 'none',
    from: isConfigured ? process.env.EMAIL_FROM : null,
    host: p === 'smtp' ? process.env.EMAIL_HOST : null,
    port: p === 'smtp' ? (process.env.EMAIL_PORT || 587) : null,
    cloudNote: p === 'smtp' ? 'Render Free Tier blocks outbound SMTP ports 25, 465, and 587. For Render, use Resend or Brevo HTTP API.' : null,
  };
}

const sendUserWelcomeEmail = data => sendTemplate(data.email, templates.buildUserWelcomeEmail(data));
const sendMerchantWelcomeEmail = data => sendTemplate(data.email, templates.buildMerchantWelcomeEmail(data));
const sendGuardianWelcomeEmail = data => sendTemplate(data.email, templates.buildGuardianWelcomeEmail(data));
const sendGuardianInvitationEmail = data => sendTemplate(data.email, templates.buildGuardianInvitationEmail(data));
const sendGuardianAcceptedEmail = data => sendTemplate(data.email, templates.buildGuardianAcceptedEmail(data));
const sendGuardianRiskAlertEmail = data => sendTemplate(data.email, templates.buildGuardianRiskAlertEmail(data));
const sendGuardianRemovedEmail = data => sendTemplate(data.email, templates.buildGuardianRemovedEmail(data));
const sendLoginNotificationEmail = data => sendTemplate(data.email, templates.buildLoginNotificationEmail(data));

module.exports = {
  configured, provider, getStatus, getTransporter, sendTemplate,
  sendUserWelcomeEmail, sendMerchantWelcomeEmail, sendGuardianWelcomeEmail, sendGuardianInvitationEmail,
  sendGuardianAcceptedEmail, sendGuardianRiskAlertEmail, sendGuardianRemovedEmail, sendLoginNotificationEmail,
  sendWelcomeEmail: sendUserWelcomeEmail,
  sendGuardianAlertEmail: sendGuardianRiskAlertEmail,
};
