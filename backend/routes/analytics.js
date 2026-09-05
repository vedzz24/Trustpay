const router  = require('express').Router();
const { requireMerchant } = require('../utils/auth');
const { getMerchantModels } = require('../utils/merchantDb');

// GET /api/analytics — rich metrics for the merchant dashboard
router.get('/', requireMerchant, async (req, res) => {
  try {
    const { Payment, connection } = getMerchantModels(req.user.merchantId);
    console.info(`Authenticated merchant: ${req.user.merchantId}`);
    console.info(`Selected database: ${connection.name}`);
    const all        = await Payment.find();
    console.info(`Transactions returned: ${all.length}`);
    const verified   = all.filter(p => p.status === 'verified');
    const suspicious = all.filter(p => p.status === 'suspicious');
    const pending    = all.filter(p => ['pending', 'unmatched'].includes(p.status));

    // Highest and lowest payments
    const sorted        = [...all].sort((a, b) => b.amount - a.amount);
    const highestPayment = sorted[0]              || null;
    const lowestPayment  = sorted[sorted.length - 1] || null;

    const hourlyData = Array.from({ length: 14 }, (_, index) => {
      const hour = index + 8;
      return {
        hour: new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric' }),
        volume: all.filter(payment => new Date(payment.time).getHours() === hour).length,
      };
    });

    res.json({
      success: true,
      metrics: {
        revenue: verified.reduce((sum, payment) => sum + payment.amount, 0),
        total: all.length,
        totalTransactions: all.length,
        verified: verified.length,
        pending: pending.length,
        failed: suspicious.length,
        blockedThreats: suspicious.length,
      },
      hourlyData,
      highestPayment,
      lowestPayment,
      transactions: all,
    });
  } catch (err) {
    console.error('analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

module.exports = router;
