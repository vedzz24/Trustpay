const net = require('net');

const RULES = [
  ['Bank impersonation', /\b(bank|rbi|credit card department)\b/i, 2],
  ['Government or police impersonation', /\b(police|customs|income tax|government officer|cbi)\b/i, 3],
  ['Urgency', /\b(urgent|immediately|today|within \d+ (?:minutes?|hours?)|act now)\b/i, 2],
  ['Threat or account closure', /\b(blocked|suspend(?:ed)?|close(?:d|ure)?|arrest|legal action|penalty)\b/i, 3],
  ['KYC threat', /\bkyc\b/i, 2],
  ['Prize or lottery claim', /\b(lottery|winner|won|prize|reward)\b/i, 3],
  ['Refund or reversal claim', /\b(refund|reversal|chargeback)\b/i, 2],
  ['Investment promise', /\b(guaranteed returns?|double your money|investment opportunity)\b/i, 3],
  ['Payment request', /\b(pay|payment|transfer|send money|upi|scan (?:this )?qr)\b/i, 2],
  ['High-value payment request', /(?:₹|INR|Rs\.?)\s*(?:\d{2,3},\d{3}|\d{5,})/i, 3],
  ['Credential request', /\b(password|pin|cvv|banking credentials?|login details?)\b/i, 4],
  ['OTP request', /\b(share|send|forward|tell|read|provide)\b.{0,30}\b(otp|one[ -]?time password|verification code|authentication code)\b|\b(otp|one[ -]?time password|verification code|authentication code)\b.{0,30}\b(share|send|forward|tell|read|provide)\b/i, 5],
  ['Suspicious link', /https?:\/\/[^\s]+|\b(?:bit\.ly|tinyurl\.com|t\.me)\//i, 2],
];

function redactOtp(text) {
  return String(text || '').replace(/\b\d{4,8}\b/g, '[REDACTED CODE]');
}

function analyzeMessage(input, otpMode = false) {
  const text = otpMode ? redactOtp(input) : String(input || '');
  const indicators = RULES.filter(([, pattern]) => pattern.test(text)).map(([label, , weight]) => ({ label, weight }));
  const score = indicators.reduce((sum, item) => sum + item.weight, 0);
  const otpRequest = indicators.some(item => item.label === 'OTP request');
  const riskLevel = otpRequest ? 'CRITICAL' : score >= 11 ? 'CRITICAL' : score >= 5 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW';
  return {
    riskLevel,
    resultCode: otpRequest ? 'OTP_SHARING_REQUEST' : `${riskLevel}_RISK`,
    indicators: indicators.map(item => item.label),
    recommendation: otpRequest
      ? 'Never share OTPs with callers, support agents, merchants or strangers.'
      : riskLevel === 'LOW' ? 'No meaningful scam indicators were detected. Continue to verify unexpected requests independently.'
        : 'Do not make payment or share credentials until the request is independently verified.',
    redactedText: otpMode ? text : undefined,
  };
}

function parseUpi(uri) {
  const url = new URL(uri);
  const params = url.searchParams;
  return { type: 'UPI PAYMENT', payee: params.get('pa'), merchantName: params.get('pn'), amount: params.get('am'), currency: params.get('cu') || 'INR', reference: params.get('tr') || params.get('tn') };
}

function analyzeQrPayload(raw) {
  const value = String(raw || '').trim();
  if (!value) return { result: 'INVALID_QR', type: 'UNKNOWN', reasons: ['No decodable QR content was supplied.'] };
  if (/^upi:\/\/pay\?/i.test(value)) {
    try { return { result: 'UNKNOWN', risk: 'UNKNOWN', reasons: ['TrustPay could not independently establish whether this recipient is trustworthy.'], ...parseUpi(value) }; }
    catch (_) { return { result: 'INVALID_QR', type: 'UPI PAYMENT', reasons: ['The UPI payment URI is malformed.'] }; }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url;
    try { url = new URL(value); } catch (_) { return { result: 'INVALID_QR', type: 'WEB URL', reasons: ['The destination URL is malformed.'] }; }
    const reasons = [];
    if (!['http:', 'https:'].includes(url.protocol)) reasons.push('The link uses a potentially dangerous or unsupported scheme.');
    if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) reasons.push('The destination domain is invalid or incomplete.');
    if (net.isIP(url.hostname)) reasons.push('The link points directly to an IP address.');
    if (url.username || url.password || /@/.test(url.host)) reasons.push('The link contains deceptive user-information syntax.');
    return { type: 'WEB URL', domain: url.hostname || null, result: reasons.length ? 'SUSPICIOUS' : 'NORMAL', risk: reasons.length ? 'SUSPICIOUS' : 'NORMAL', reasons };
  }
  return { type: 'TEXT', result: 'UNKNOWN', risk: 'UNKNOWN', reasons: ['The QR contains text that TrustPay cannot independently verify.'] };
}

module.exports = { analyzeMessage, analyzeQrPayload, redactOtp };
