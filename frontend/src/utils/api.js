import { normalizeLoginResponse, resolveApiBaseUrl } from './apiConfig';

export function resolveApiBase() {
  return resolveApiBaseUrl({
    apiUrl: import.meta.env.VITE_API_URL,
    legacyApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
  });
}

export const API_BASE = resolveApiBase();
export const getApiUrl = endpoint => `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

const getAuthHeader = () => {
  const token = localStorage.getItem('trustpay_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const persistAuth = async (request) => {
  const response = await request;
  if (response.success && response.token) {
    localStorage.setItem('trustpay_token', response.token);
  }
  return response;
};

const parseResponse = async response => {
  const data = await response.json().catch(() => ({ success: false, message: 'Invalid server response' }));
  return { ...data, httpStatus: response.status };
};

const request = async (endpoint, options = {}) => {
  try {
    return await fetch(getApiUrl(endpoint), options).then(parseResponse);
  } catch {
    return {
      success: false,
      httpStatus: 0,
      networkError: true,
      message: 'Cannot connect to TrustPay server.',
    };
  }
};

const post = (endpoint, body) =>
  request(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body:    JSON.stringify(body),
  });

const get = (endpoint) =>
  request(endpoint, {
    headers: { ...getAuthHeader() }
  });
const patch = (endpoint, body = {}) => request(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(body) });
const del = endpoint => request(endpoint, { method: 'DELETE', headers: { ...getAuthHeader() } });

const normalizeLoginRequest = async requestPromise => normalizeLoginResponse(await requestPromise);

export const checkApiHealth = () => get('/health');

if (import.meta.env.DEV) {
  checkApiHealth().then(response => {
    if (response.success || response.status === 'ok') {
      console.info('TrustPay API: connected');
      console.info(`API base: ${API_BASE.replace(/\/api$/, '')}`);
    }
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login  = (email, password, role)                     => persistAuth(normalizeLoginRequest(post('/auth/login',  { email, password, role })));
export const signup = (name, email, password, role, phoneNumber, businessName, upiId) => persistAuth(post('/auth/signup', { name, email, password, role, phoneNumber, businessName, upiId }));
export const sendOtp = (phoneNumber, role)                        => post('/auth/send-otp', { phoneNumber, role });
export const verifyOtp = (phoneNumber, otp, role, name)            => persistAuth(post('/auth/verify-otp', { phoneNumber, otp, role, name }));
export const googleLogin = (credential, role, invitationToken)   => persistAuth(post('/auth/google', { credential, role, invitationToken }));
export const completeAuthOnboarding = payload                    => persistAuth(post('/auth/complete-onboarding', payload));
export const fetchMerchantProfile = async () => get('/auth/me');
export const fetchPublicMerchant = async merchantId => {
  try {
    return await get(`/public/merchant/${encodeURIComponent(merchantId)}`);
  } catch {
    return {
      success: false,
      httpStatus: 0,
      networkError: true,
      message: 'Connection error. TrustPay could not reach the payment service.',
    };
  }
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const fetchPayments  = ()                 => get('/payments');
export const createRazorpayOrder = (merchantId, amount, billRef) =>
  post('/payments/create-order', { merchantId, amount, billRef });
export const verifyRazorpayPayment = gatewayResponse =>
  post('/payments/verify', {
    razorpay_payment_id: gatewayResponse.razorpay_payment_id,
    razorpay_order_id: gatewayResponse.razorpay_order_id,
    razorpay_signature: gatewayResponse.razorpay_signature,
  });
export const fetchTransactions = ()              => get('/transactions');
export const generateProof  = (amount, note, name) => post('/payments/generate-qr', { amount, txnId: note, name });
export const scanQR         = (qrData)           => post('/payments/scan-qr',   { qrData });
export const matchPayment   = (amount, time)     => post('/payments/match',      { amount, time });
export const checkScam      = (text)             => post('/payments/scam-check', { text });
export const fetchOtpAlerts = ()                 => get('/payments/otp-alerts');
export const logOtpAlert    = (sender, message, riskLevel, detectedKeywords, actionTaken) =>
  post('/payments/log-otp-alert', { sender, message, riskLevel, detectedKeywords, actionTaken });
export const analyzeScreenshot = (imageData) =>
  post('/payments/analyze-screenshot', { imageData });

// ── Public User Safety Hub ──────────────────────────────────────────────────
export const checkQrSafety = payload => post('/user-safety/qr-check', { payload });
export const checkMessageSafety = message => post('/user-safety/message-check', { message });
export const checkOtpSafety = message => post('/user-safety/otp-check', { message });
export const checkPublicPaymentProof = imageData => post('/user-safety/payment-proof', { imageData });
export const runShieldSafetyScan = (message, qrPayload, imageData) => post('/user-safety/shield-scan', { message, qrPayload, imageData });
export const saveSafetyReport = report => post('/user-safety/reports', report);
export const registerSafetyUser = (name, email, password) => persistAuth(post('/user-auth/register', { name, email, password }));
export const loginSafetyUser = (email, password) => persistAuth(normalizeLoginRequest(post('/user-auth/login', { email, password })));
export const fetchSafetyDashboard = () => get('/user-auth/me');

// ── Guardian Protection ─────────────────────────────────────────────────────
export const registerGuardian = (name, email, password, confirmPassword) => persistAuth(post('/guardian/register', { name, email, password, confirmPassword }));
export const loginGuardian = (email, password) => persistAuth(normalizeLoginRequest(post('/guardian/login', { email, password })));
export const fetchGuardianDashboard = () => get('/guardian/dashboard');
export const sendGuardianLinkRequest = protectedUserEmail => post('/guardian/link-request', { protectedUserEmail });
export const fetchProtectedUsers = () => get('/guardian/protected-users');
export const fetchGuardianLinkRequests = () => get('/guardian/link-requests');
export const removeProtectedUser = id => del(`/guardian/protected-users/${encodeURIComponent(id)}`);
export const fetchGuardianAlerts = () => get('/guardian/alerts');
export const fetchGuardianAlert = id => get(`/guardian/alerts/${encodeURIComponent(id)}`);
export const resolveGuardianAlert = id => patch(`/guardian/alerts/${encodeURIComponent(id)}/resolve`);
export const fetchUserGuardianRequests = () => get('/user/guardian-requests');
export const acceptUserGuardianRequest = id => patch(`/user/guardian-requests/${encodeURIComponent(id)}/accept`);
export const rejectUserGuardianRequest = id => patch(`/user/guardian-requests/${encodeURIComponent(id)}/reject`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const fetchAnalytics = () => get('/analytics');
export const fetchFraudAlerts = () => get('/fraud-alerts');

// ── Security Center ──────────────────────────────────────────────────────────
export const fetchSecurityStatus = () => get('/security/status');
export const fetchSecurityEvents = () => get('/security/events');
export const fetchLatestVerification = () => get('/security/latest-verification');
export const verifySecurityTransaction = (identifier, claimedAmount) =>
  post('/security/verify-transaction', {
    identifier,
    ...(claimedAmount !== '' && claimedAmount !== undefined ? { claimedAmount: Number(claimedAmount) } : {}),
  });
