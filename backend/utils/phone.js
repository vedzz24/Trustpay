function normalizePhoneNumber(input) {
  const value = String(input || '').trim().replace(/[\s().-]/g, '');
  if (!value) throw new Error('Phone number is required');
  const normalized = value.startsWith('+')
    ? `+${value.slice(1).replace(/\D/g, '')}`
    : value.replace(/\D/g, '').length === 10
      ? `+91${value.replace(/\D/g, '')}`
      : `+${value.replace(/\D/g, '')}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error('Enter a valid phone number with country code');
  return normalized;
}

function maskPhoneNumber(phoneNumber) {
  return `${phoneNumber.slice(0, 3)}${'•'.repeat(Math.max(4, phoneNumber.length - 7))}${phoneNumber.slice(-4)}`;
}

module.exports = { normalizePhoneNumber, maskPhoneNumber };
