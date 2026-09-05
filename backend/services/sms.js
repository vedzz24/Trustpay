const twilio = require('twilio');

let client;

function configured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

function getClient() {
  if (!configured()) {
    const error = new Error('SMS service is not configured');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }
  if (!client) client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

async function sendLoginOtp(phoneNumber, otp) {
  const message = await getClient().messages.create({
    to: phoneNumber,
    from: process.env.TWILIO_FROM_NUMBER,
    body: `Your TrustPay secure login code is ${otp}. It expires in 5 minutes. Never share this code.`,
  });
  return { messageId: message.sid };
}

module.exports = { configured, sendLoginOtp };
