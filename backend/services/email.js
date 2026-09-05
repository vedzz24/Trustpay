const nodemailer = require('nodemailer');
const templates = require('./emailTemplates');

let transporter;

function configured() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM);
}

function getTransporter() {
  if (!configured()) throw new Error('Email service is not configured');
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return transporter;
}

async function sendTemplate(to, template) {
  return getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject: template.subject, html: template.html, text: template.text });
}

const sendUserWelcomeEmail = data => sendTemplate(data.email, templates.buildUserWelcomeEmail(data));
const sendMerchantWelcomeEmail = data => sendTemplate(data.email, templates.buildMerchantWelcomeEmail(data));
const sendGuardianInvitationEmail = data => sendTemplate(data.email, templates.buildGuardianInvitationEmail(data));
const sendGuardianAcceptedEmail = data => sendTemplate(data.email, templates.buildGuardianAcceptedEmail(data));
const sendGuardianRiskAlertEmail = data => sendTemplate(data.email, templates.buildGuardianRiskAlertEmail(data));
const sendGuardianRemovedEmail = data => sendTemplate(data.email, templates.buildGuardianRemovedEmail(data));

module.exports = {
  configured, getTransporter, sendTemplate,
  sendUserWelcomeEmail, sendMerchantWelcomeEmail, sendGuardianInvitationEmail,
  sendGuardianAcceptedEmail, sendGuardianRiskAlertEmail, sendGuardianRemovedEmail,
  // Backward-compatible alias while callers migrate.
  sendWelcomeEmail: sendUserWelcomeEmail,
  sendGuardianAlertEmail: sendGuardianRiskAlertEmail,
};
