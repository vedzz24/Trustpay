const { requireMerchant } = require('../utils/auth');
const { getMerchantModels } = require('../utils/merchantDb');

function createTransactionsRouter(dependencies = {}) {
  const router = require('express').Router();
  const merchantAuth = dependencies.requireMerchant || requireMerchant;
  const merchantModels = dependencies.getMerchantModels || getMerchantModels;

router.get('/', merchantAuth, async (req, res) => {
  try {
    const { Transaction, connection } = merchantModels(req.user.merchantId);
    console.info(`Authenticated merchant: ${req.user.merchantId}`);
    console.info(`Selected database: ${connection.name}`);
    const transactions = await Transaction.find().sort({ time: -1 }).limit(100);
    const verified = transactions.filter(item => item.status === 'verified');
    const pending = transactions.filter(item => ['pending', 'unmatched'].includes(item.status));
    console.info(`Transactions returned: ${transactions.length}`);
    return res.json({
      success: true,
      revenue: verified.reduce((sum, item) => sum + item.amount, 0),
      total: transactions.length,
      totalTransactions: transactions.length,
      verified: verified.length,
      pending: pending.length,
      blockedThreats: transactions.filter(item => item.status === 'suspicious').length,
      transactions,
    });
  } catch (error) {
    console.error('tenant transactions error:', error.message);
    return res.status(500).json({ success: false, transactions: [], total: 0, message: 'Failed to load transactions' });
  }
});

  return router;
}

module.exports = createTransactionsRouter();
module.exports.createTransactionsRouter = createTransactionsRouter;
