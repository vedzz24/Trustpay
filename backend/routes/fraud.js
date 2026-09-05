const router = require('express').Router();
const { requireMerchant } = require('../utils/auth');
const { getMerchantModels } = require('../utils/merchantDb');

router.get('/', requireMerchant, async (req, res) => {
  try {
    const { FraudAlert } = getMerchantModels(req.user.merchantId);
    const alerts = await FraudAlert.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, alerts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load fraud alerts' });
  }
});

module.exports = router;
