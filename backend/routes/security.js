const router = require('express').Router();
const mongoose = require('mongoose');
const { requireMerchant } = require('../utils/auth');
const { getMerchantModels } = require('../utils/merchantDb');
const { isMerchantStreamConnected } = require('../utils/sse');
const { recordSecurityEvent } = require('../utils/securityEvents');
const { isWebhookConfigured } = require('../services/razorpay');

const startOfToday = () => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
};

function serializeVerification(payment, merchantId) {
  if (!payment) return null;
  return {
    amount: payment.amount,
    trustpayTransactionId: payment.txnId,
    merchantId,
    razorpayOrderId: payment.razorpayOrderId || null,
    razorpayPaymentId: payment.razorpayPaymentId || null,
    gatewayStatus: payment.gatewayStatus || null,
    webhookSignature: payment.webhookSignatureValid === true ? 'VALID' : null,
    merchantMatch: 'VERIFIED',
    duplicateEvent: payment.duplicateEvent === true,
    trustpayStatus: payment.status,
    verifiedAt: payment.updatedAt || new Date(payment.time),
    paymentId: payment._id,
  };
}

router.get('/status', requireMerchant, async (req, res) => {
  try {
    const { SecurityEvent, Transaction, connection } = getMerchantModels(req.user.merchantId);
    const today = startOfToday();
    const [verifiedPaymentsToday, invalidSignatureAttempts, duplicateEventsBlocked, failedPayments] = await Promise.all([
      Transaction.countDocuments({ status: 'verified', updatedAt: { $gte: today } }),
      SecurityEvent.countDocuments({ type: 'INVALID_WEBHOOK_SIGNATURE', createdAt: { $gte: today } }),
      SecurityEvent.countDocuments({ type: 'DUPLICATE_WEBHOOK', createdAt: { $gte: today } }),
      SecurityEvent.countDocuments({ type: 'PAYMENT_FAILED', createdAt: { $gte: today } }),
    ]);
    return res.json({
      success: true,
      system: {
        webhookListener: isWebhookConfigured() ? 'ACTIVE' : 'OFFLINE',
        signatureVerification: 'ACTIVE',
        merchantIsolation: connection.name === `trustpay_${req.user.merchantId}` ? 'ACTIVE' : 'OFFLINE',
        paymentStream: isMerchantStreamConnected(req.user.merchantId) ? 'CONNECTED' : 'DISCONNECTED',
      },
      statistics: { verifiedPaymentsToday, invalidSignatureAttempts, duplicateEventsBlocked, failedPayments },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load security status' });
  }
});

router.get('/events', requireMerchant, async (req, res) => {
  try {
    const { SecurityEvent } = getMerchantModels(req.user.merchantId);
    const events = await SecurityEvent.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, events });
  } catch (error) {
    return res.status(500).json({ success: false, events: [], message: 'Failed to load security events' });
  }
});

router.get('/latest-verification', requireMerchant, async (req, res) => {
  try {
    const { Transaction } = getMerchantModels(req.user.merchantId);
    const payment = await Transaction.findOne({ status: 'verified' }).sort({ updatedAt: -1, time: -1 });
    return res.json({ success: true, verification: serializeVerification(payment, req.user.merchantId) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load latest verification' });
  }
});

router.post('/verify-transaction', requireMerchant, async (req, res) => {
  const identifier = String(req.body.identifier || '').trim();
  const claimedAmount = req.body.claimedAmount;
  if (!identifier) return res.status(400).json({ success: false, message: 'Transaction or payment ID is required' });
  try {
    const { Transaction } = getMerchantModels(req.user.merchantId);
    const filters = [{ txnId: identifier }, { razorpayPaymentId: identifier }];
    if (mongoose.isValidObjectId(identifier)) filters.push({ _id: identifier });
    const payment = await Transaction.findOne({ $or: filters });
    if (!payment) {
      await recordSecurityEvent(req.user.merchantId, {
        type: 'PAYMENT_NOT_FOUND', severity: 'WARNING', transactionId: identifier,
        message: 'No trusted payment record found for this merchant.', status: 'NOT_VERIFIED',
        metadata: { source: 'SECURITY_CENTER' },
      });
      return res.status(404).json({ success: false, result: 'NOT_VERIFIED', message: 'No trusted payment record found for this merchant.' });
    }
    if (claimedAmount !== undefined && Number(claimedAmount) !== payment.amount) {
      await recordSecurityEvent(req.user.merchantId, {
        type: 'AMOUNT_MISMATCH', severity: 'HIGH', paymentId: String(payment._id), transactionId: payment.txnId,
        message: 'Claimed payment amount differs from the trusted record.', status: 'REJECTED',
        metadata: { claimedAmount: Number(claimedAmount), verifiedAmount: payment.amount, source: 'SECURITY_CENTER' },
      });
      return res.status(409).json({ success: false, result: 'AMOUNT_MISMATCH', claimedAmount: Number(claimedAmount), verifiedAmount: payment.amount });
    }
    return res.json({ success: true, result: payment.status === 'verified' ? 'VERIFIED' : 'NOT_VERIFIED', verification: serializeVerification(payment, req.user.merchantId) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Transaction verification failed' });
  }
});

module.exports = router;
