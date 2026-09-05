require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const seedDatabase = require('./seed');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const paymentRoutes  = require('./routes/payments');
const razorpayPaymentRoutes = require('./routes/razorpayPayments');
const razorpayWebhook = require('./routes/razorpayWebhook');
const analyticsRoutes= require('./routes/analytics');
const transactionRoutes = require('./routes/transactions');
const fraudRoutes = require('./routes/fraud');
const securityRoutes = require('./routes/security');
const publicRoutes = require('./routes/public');
const userSafetyRoutes = require('./routes/userSafety');
const userAuthRoutes = require('./routes/userAuth');
const guardianRoutes = require('./routes/guardian');
const userGuardianRoutes = require('./routes/userGuardian');
const { sseHandler } = require('./utils/sse');
const { requireMerchant } = require('./utils/auth');
const LoginOtp = require('./models/LoginOtp');
const { migrateLoginOtpExpiresAtIndex, migrateGuardianLinks } = require('./utils/indexMigrations');
const { isDevelopmentOrigin } = require('./utils/corsOrigins');

const app = express();
const PORT = process.env.PORT || 5000;
const LISTEN_HOST = process.env.HOST || '0.0.0.0';

const configuredCorsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredCorsOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && isDevelopmentOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by TrustPay CORS configuration'));
  },
}));
// Razorpay signs the exact bytes sent. This route must run before express.json().
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);
app.use(express.json({ limit: '10mb' }));

// ── MongoDB Connection ─────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env — please set it and restart.');
  process.exit(1);
}

mongoose.connect(MONGO_URI, { dbName: 'trustpay' })
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await migrateLoginOtpExpiresAtIndex(mongoose.connection);
    await migrateGuardianLinks(mongoose.connection);
    await LoginOtp.createIndexes();
    await seedDatabase(); // seed demo data if DB is empty
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/payments', razorpayPaymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/fraud-alerts', fraudRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user-safety', userSafetyRoutes);
app.use('/api/user-auth', userAuthRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/user', userGuardianRoutes);
app.get('/api/stream', requireMerchant, sseHandler);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Welcome to the TrustPay Backend API! Access /api/health to check server status.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, LISTEN_HOST, () => {
  console.log(`🚀 TrustPay backend running on ${LISTEN_HOST}:${PORT}`);
  console.log(`   API docs: GET /api/health | /api/payments | /api/analytics`);
});
