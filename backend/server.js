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
const GuardianAlert = require('./models/GuardianAlert');
const { migrateLoginOtpExpiresAtIndex, migrateGuardianLinks } = require('./utils/indexMigrations');
const { isDevelopmentOrigin } = require('./utils/corsOrigins');
const { getStatus: getEmailStatus } = require('./services/email');

const app = express();
const PORT = process.env.PORT || 5000;
const LISTEN_HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV === 'production') {
  const missingSecrets = ['JWT_SECRET', 'TRUSTPAY_SECRET'].filter(name => !process.env[name]);
  if (missingSecrets.length) {
    console.error(`❌ Missing required production environment variables: ${missingSecrets.join(', ')}`);
    process.exit(1);
  }
}

const configuredCorsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',').map(origin => origin.trim()).filter(Boolean);
const capacitorOrigins = new Set(['capacitor://localhost', 'http://localhost', 'https://localhost']);
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredCorsOrigins.includes(origin) || capacitorOrigins.has(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && isDevelopmentOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by TrustPay CORS configuration'));
  },
  credentials: false,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
// Razorpay signs the exact bytes sent. This route must run before express.json().
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);
app.use(express.json({ limit: '10mb' }));

// ── MongoDB Connection ─────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI is not configured. Set it before starting TrustPay.');
  process.exit(1);
}

if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  console.warn('⚠️ MONGO_URI is deprecated; rename it to MONGODB_URI.');
}

mongoose.connect(MONGO_URI, { dbName: 'trustpay' })
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await migrateLoginOtpExpiresAtIndex(mongoose.connection);
    await migrateGuardianLinks(mongoose.connection);
    await LoginOtp.createIndexes();
    await seedDatabase(); // seed demo data if DB is empty
  })
  .catch(() => {
    console.error('❌ MongoDB connection failed. Check Atlas access and MONGODB_URI configuration.');
    process.exit(1);
  });

mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected; Mongoose will keep retrying.'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB connection restored.'));
mongoose.connection.on('error', () => console.error('❌ MongoDB connection error.'));

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
  res.json({
    status: 'ok',
    service: 'TrustPay API',
    email: getEmailStatus()
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use((error, req, res, next) => {
  if (error?.message === 'Origin is not allowed by TrustPay CORS configuration') {
    return res.status(403).json({ success: false, message: 'This application origin is not allowed.' });
  }
  console.error('Unhandled request error:', error?.message || 'Unknown error');
  return res.status(500).json({ success: false, message: 'TrustPay encountered a server error.' });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, LISTEN_HOST, () => {
  console.log(`🚀 GuardX backend running on ${LISTEN_HOST}:${PORT}`);
  console.log(`   API docs: GET /api/health | /api/payments | /api/analytics`);
});


// ── Alert Escalation Cron ──────────────────────────────────────────────────────
setInterval(async () => {
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const unresolvedAlerts = await GuardianAlert.find({
      riskLevel: 'CRITICAL',
      status: 'active',
      escalated: false,
      createdAt: { $lte: tenMinsAgo }
    });

    for (const alert of unresolvedAlerts) {
      alert.escalated = true;
      await alert.save();
      console.log('ESCALATING UNRESOLVED CRITICAL ALERT:', alert._id);
    }
  } catch (err) {
    console.error('Error during alert escalation cron:', err.message);
  }
}, 5 * 60 * 1000);
