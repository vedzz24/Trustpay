const express = require('express');
const User = require('../models/User');

const MERCHANT_ID_PATTERN = /^MER\d{3,}$/;

function createPublicRouter(dependencies = {}) {
  const router = express.Router();
  const UserModel = dependencies.User || User;

  router.get('/merchant/:merchantId', async (req, res) => {
    const merchantId = String(req.params.merchantId || '').toUpperCase();
    if (!MERCHANT_ID_PATTERN.test(merchantId)) {
      return res.status(404).json({ success: false, message: 'Invalid TrustPay merchant' });
    }
    try {
      const merchant = await UserModel.findOne({ merchantId, role: 'merchant' })
        .select('merchantId businessName merchantName upiId -_id')
        .lean();
      if (!merchant) return res.status(404).json({ success: false, message: 'Invalid TrustPay merchant' });
      return res.json({ success: true, merchant });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Unable to verify merchant' });
    }
  });

  return router;
}

module.exports = createPublicRouter();
module.exports.createPublicRouter = createPublicRouter;
