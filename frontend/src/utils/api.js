const API_BASE = 'http://localhost:5000/api';

const post = (endpoint, body) =>
  fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }).then(r => r.json());

const get = (endpoint) =>
  fetch(`${API_BASE}${endpoint}`).then(r => r.json());

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login  = (email, password)             => post('/auth/login',  { email, password });
export const signup = (name, email, password, role) => post('/auth/signup', { name, email, password, role });

// ── Payments ──────────────────────────────────────────────────────────────────
export const fetchPayments  = ()                 => get('/payments');
export const generateProof  = (amount, note, name) => post('/payments/generate-qr', { amount, txnId: note, name });
export const scanQR         = (qrData)           => post('/payments/scan-qr',   { qrData });
export const matchPayment   = (amount, time)     => post('/payments/match',      { amount, time });
export const checkScam      = (text)             => post('/payments/scam-check', { text });

// ── Analytics ─────────────────────────────────────────────────────────────────
export const fetchAnalytics = () => get('/analytics');

// ── Family Approval ───────────────────────────────────────────────────────────
export const submitFamilyRequest = (amount, note, elderlyName) =>
  post('/family/request', { amount, note, elderlyName });

export const pollFamilyStatus = (requestId) =>
  get(`/family/status/${requestId}`);

export const fetchFamilyPending = () =>
  get('/family/pending');

export const familyApprove = () =>
  post('/family/approve', {});

export const familyReject  = () =>
  post('/family/reject', {});
