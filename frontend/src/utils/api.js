const API_BASE = 'http://localhost:5000/api';

const post = (endpoint, body) =>
  fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

const get = (endpoint) =>
  fetch(`${API_BASE}${endpoint}`).then(r => r.json());

export const login           = (email, password)             => post('/login', { email, password });
export const signup          = (name, email, password, role) => post('/signup', { name, email, password, role });
export const fetchPayments   = ()                            => get('/payments');
export const matchPayment    = (amount, time)                => post('/match', { amount, time });
export const generateProof   = (amount, note, name)          => post('/generate-qr', { amount, txnId: note, name });
export const scanQR          = (qrData)                      => post('/scan-qr', { qrData });
export const checkScam       = (text)                        => post('/scam-check', { text });
export const fetchAnalytics  = ()                            => get('/analytics');

// ── Family Approval System ──────────────────────────────────────────────────
export const submitFamilyRequest = (amount, note, elderlyName) =>
  post('/family/request', { amount, note, elderlyName });

export const pollFamilyStatus = (requestId) =>
  get(`/family/status/${requestId}`);

export const fetchFamilyPending = () =>
  get('/family/pending');

export const familyApprove = () =>
  post('/family/approve', {});

export const familyReject = () =>
  post('/family/reject', {});
