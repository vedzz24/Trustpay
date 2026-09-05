const router = require('express').Router();
const User = require('../models/User');
const RazorpayOrderOwner = require('../models/RazorpayOrderOwner');
const { getMerchantModels } = require('../utils/merchantDb');
const { recordSecurityEvent } = require('../utils/securityEvents');
const {
  amountToPaise, createTrustPayId, getPublicKeyId, getRazorpayClient, verifyCheckoutSignature,
} = require('../services/razorpay');

const merchantPattern = /^MER\d{3,}$/;
const recordEventSafely = (...args) => recordSecurityEvent(...args)
  .catch(error => console.error('Security event logging failed:', error.message));

router.post('/create-order', async (req, res) => {
  const merchantId = String(req.body.merchantId || '').trim().toUpperCase();
  const billRef = String(req.body.billRef || '').trim().slice(0, 100);
  if (!merchantPattern.test(merchantId)) return res.status(400).json({ success: false, message: 'Invalid TrustPay merchant.' });

  let amountPaise;
  try { amountPaise = amountToPaise(req.body.amount); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }

  let owner;
  let pending;
  try {
    const merchant = await User.findOne({ merchantId, role: 'merchant' }).select('merchantId businessName merchantName').lean();
    if (!merchant) return res.status(404).json({ success: false, message: 'Invalid TrustPay merchant.' });

    const trustpayTransactionId = createTrustPayId();
    const order = await getRazorpayClient().orders.create({ amount: amountPaise, currency: 'INR', receipt: trustpayTransactionId });
    const { Transaction } = getMerchantModels(merchant.merchantId);
    pending = await Transaction.create({
      txnId: trustpayTransactionId, merchantId: merchant.merchantId,
      amount: amountPaise / 100, currency: 'INR', billRef, note: billRef,
      razorpayOrderId: order.id, status: 'pending', gatewayStatus: 'created', method: 'Razorpay',
    });
    try {
      owner = await RazorpayOrderOwner.create({
        razorpayOrderId: order.id, merchantId: merchant.merchantId,
        trustpayTransactionId, amountPaise,
      });
    } catch (error) {
      await Transaction.deleteOne({ _id: pending._id, status: 'pending' });
      throw error;
    }
    await recordEventSafely(merchant.merchantId, {
      type: 'PAYMENT_ORDER_CREATED', severity: 'INFO', orderId: order.id,
      transactionId: trustpayTransactionId, message: 'Razorpay payment order created.', status: 'PENDING',
      metadata: { gatewayStatus: 'created', source: 'PUBLIC_PAYMENT_PAGE' },
    });
    return res.status(201).json({
      success: true, keyId: getPublicKeyId(), razorpayOrderId: order.id,
      amount: amountPaise, currency: 'INR', trustpayTransactionId,
      merchant: { merchantId: merchant.merchantId, businessName: merchant.businessName || merchant.merchantName },
    });
  } catch (error) {
    if (owner && !pending) await RazorpayOrderOwner.deleteOne({ _id: owner._id }).catch(() => {});
    const configured = error.code !== 'RAZORPAY_NOT_CONFIGURED';
    console.error('Razorpay order creation failed:', configured ? error.message : 'gateway credentials missing');
    return res.status(error.code === 'RAZORPAY_NOT_CONFIGURED' ? 503 : 500).json({
      success: false,
      message: error.code === 'RAZORPAY_NOT_CONFIGURED' ? error.message : 'Unable to create payment order.',
    });
  }
});

router.post('/verify', async (req, res) => {
  const orderId = String(req.body.razorpay_order_id || '').trim();
  const paymentId = String(req.body.razorpay_payment_id || '').trim();
  const signature = String(req.body.razorpay_signature || '').trim();
  if (!orderId || !paymentId || !signature) return res.status(400).json({ success: false, message: 'Incomplete Razorpay verification response.' });

  try {
    const owner = await RazorpayOrderOwner.findOne({ razorpayOrderId: orderId }).lean();
    if (!owner) return res.status(404).json({ success: false, message: 'Trusted payment order was not found.' });
    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      await recordEventSafely(owner.merchantId, {
        type: 'INVALID_PAYMENT_SIGNATURE', severity: 'CRITICAL', paymentId, orderId,
        transactionId: owner.trustpayTransactionId, message: 'Checkout payment signature was rejected.', status: 'REJECTED',
        metadata: { signatureValid: false, source: 'CHECKOUT_CALLBACK' },
      });
      return res.status(401).json({ success: false, status: 'failed', message: 'Payment signature verification failed.' });
    }

    const { Transaction } = getMerchantModels(owner.merchantId);
    const payment = await Transaction.findOne({ txnId: owner.trustpayTransactionId, razorpayOrderId: orderId });
    if (!payment) return res.status(404).json({ success: false, message: 'Merchant payment record was not found.' });
    if (payment.status !== 'verified') {
      payment.razorpayPaymentId = paymentId;
      payment.gatewayStatus = 'captured';
      payment.status = 'verified';
      payment.webhookSignatureValid = true;
      payment.verifiedAt = new Date();
      await payment.save();
      await recordEventSafely(owner.merchantId, {
        type: 'PAYMENT_VERIFIED', severity: 'INFO', paymentId, orderId,
        transactionId: payment.txnId, message: `₹${payment.amount} payment verified.`, status: 'VERIFIED',
        metadata: { signatureValid: true, gatewayStatus: 'captured', source: 'CHECKOUT_CALLBACK' },
      });
    } else if (payment.razorpayPaymentId && payment.razorpayPaymentId !== paymentId) {
      return res.status(409).json({ success: false, status: 'failed', message: 'Payment order was already verified with another payment.' });
    }
    return res.json({ success: true, status: 'verified', amount: payment.amount, currency: payment.currency,
      trustpayTransactionId: payment.txnId, merchantId: owner.merchantId, gateway: 'Razorpay' });
  } catch (error) {
    return res.status(error.code === 'RAZORPAY_NOT_CONFIGURED' ? 503 : 500).json({ success: false, status: 'failed', message: error.code === 'RAZORPAY_NOT_CONFIGURED' ? error.message : 'Payment verification failed.' });
  }
});

module.exports = router;
