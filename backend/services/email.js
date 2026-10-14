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
  if (smtpConfigured()) return 'smtp';
  return '';
}

function configured() {
  const selected = provider();
  return selected === 'resend'
    ? Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
    : selected === 'smtp' && smtpConfigured();
}

function configurationError() {
  if (!missingConfigurationWarned) {
    console.warn('⚠️ Email delivery is not configured. Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM.');
    missingConfigurationWarned = true;
  }
  const error = new Error('Email service is not configured');
  error.code = 'EMAIL_NOT_CONFIGURED';
  return error;
}

function getTransporter() {
  if (provider() !== 'smtp' || !configured()) throw configurationError();
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  return transporter;
}

async function sendWithResend(to, template) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: template.subject, html: template.html, text: template.text }),
  });
  if (!response.ok) {
    const error = new Error(`Resend rejected the email request with status ${response.status}`);
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
  if (provider() === 'resend') return sendWithResend(to, template);
  return getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject: template.subject, html: template.html, text: template.text });
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
  configured, getTransporter, sendTemplate,
  sendUserWelcomeEmail, sendMerchantWelcomeEmail, sendGuardianWelcomeEmail, sendGuardianInvitationEmail,
  sendGuardianAcceptedEmail, sendGuardianRiskAlertEmail, sendGuardianRemovedEmail, sendLoginNotificationEmail,
  sendWelcomeEmail: sendUserWelcomeEmail,
  sendGuardianAlertEmail: sendGuardianRiskAlertEmail,
};
