const RazorpayOrderOwner = require('../models/RazorpayOrderOwner');
const { getMerchantModels } = require('../utils/merchantDb');
const { recordSecurityEvent } = require('../utils/securityEvents');
const { verifyWebhookSignature } = require('../services/razorpay');
const recordEventSafely = (...args) => recordSecurityEvent(...args)
  .catch(error => console.error('Security event logging failed:', error.message));

function gatewayEntities(payload = {}) {
  const payment = payload.payload?.payment?.entity || null;
  const order = payload.payload?.order?.entity || null;
  return { payment, order, orderId: payment?.order_id || order?.id || null };
}

async function ownerFromPayload(payload) {
  const { orderId } = gatewayEntities(payload);
  return orderId ? RazorpayOrderOwner.findOne({ razorpayOrderId: orderId }).lean() : null;
}

async function logInvalidSignature(rawBody) {
  try {
    const payload = JSON.parse(rawBody.toString('utf8'));
    const owner = await ownerFromPayload(payload);
    if (owner) await recordEventSafely(owner.merchantId, {
      type: 'INVALID_WEBHOOK_SIGNATURE', severity: 'CRITICAL', orderId: owner.razorpayOrderId,
      transactionId: owner.trustpayTransactionId, message: 'Webhook request signature was rejected.', status: 'REJECTED',
      metadata: { signatureValid: false, source: 'RAZORPAY_WEBHOOK' },
    });
  } catch (_) { /* An untrusted/unparseable body cannot be assigned to a merchant. */ }
}

async function razorpayWebhook(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const signature = req.get('x-razorpay-signature');
  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      await logInvalidSignature(rawBody);
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }
  } catch (error) {
    return res.status(error.code === 'RAZORPAY_NOT_CONFIGURED' ? 503 : 401).json({ success: false, message: error.code === 'RAZORPAY_NOT_CONFIGURED' ? error.message : 'Invalid webhook signature.' });
  }

  let payload;
  try { payload = JSON.parse(rawBody.toString('utf8')); }
  catch (_) { return res.status(400).json({ success: false, message: 'Invalid webhook JSON.' }); }

  const eventType = payload.event;
  const { payment: gatewayPayment, order: gatewayOrder, orderId } = gatewayEntities(payload);
  const owner = orderId ? await RazorpayOrderOwner.findOne({ razorpayOrderId: orderId }).lean() : null;
  if (!owner) return res.status(404).json({ success: false, message: 'Trusted Razorpay order owner was not found.' });

  const { Transaction, WebhookLog } = getMerchantModels(owner.merchantId);
  const eventId = String(req.get('x-razorpay-event-id') || payload.id || `${eventType}:${gatewayPayment?.id || orderId}`);
  try {
    await WebhookLog.create({ provider: 'razorpay', eventId, eventType, payload: {
      orderId, paymentId: gatewayPayment?.id || null, gatewayStatus: gatewayPayment?.status || gatewayOrder?.status || null,
    } });
  } catch (error) {
    if (error?.code !== 11000) return res.status(500).json({ success: false, message: 'Webhook audit could not be created.' });
    await recordEventSafely(owner.merchantId, {
      type: 'DUPLICATE_WEBHOOK', severity: 'WARNING', paymentId: gatewayPayment?.id,
      orderId, transactionId: owner.trustpayTransactionId, message: 'Duplicate Razorpay event ignored.', status: 'BLOCKED',
      metadata: { duplicateEvent: true, eventType, source: 'RAZORPAY_WEBHOOK' },
    });
    return res.json({ success: true, duplicate: true });
  }

  const transaction = await Transaction.findOne({ txnId: owner.trustpayTransactionId, razorpayOrderId: orderId });
  if (!transaction) {
    await WebhookLog.updateOne({ eventId }, { processed: false, error: 'Merchant transaction not found' });
    return res.status(404).json({ success: false, message: 'Merchant payment record was not found.' });
  }

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const wasVerified = transaction.status === 'verified';
      transaction.status = 'verified';
      transaction.gatewayStatus = gatewayPayment?.status || (gatewayOrder?.status === 'paid' ? 'captured' : gatewayOrder?.status) || 'captured';
      if (gatewayPayment?.id) transaction.razorpayPaymentId = gatewayPayment.id;
      if (gatewayPayment?.method) transaction.method = gatewayPayment.method;
      const acquirerRef = gatewayPayment?.acquirer_data?.rrn || gatewayPayment?.acquirer_data?.upi_transaction_id;
      if (acquirerRef) transaction.utr = String(acquirerRef);
      transaction.webhookSignatureValid = true;
      transaction.verifiedAt ||= new Date();
      await transaction.save();
      if (!wasVerified) await recordEventSafely(owner.merchantId, {
        type: 'PAYMENT_VERIFIED', severity: 'INFO', paymentId: transaction.razorpayPaymentId,
        orderId, transactionId: transaction.txnId, message: `₹${transaction.amount} payment verified.`, status: 'VERIFIED',
        metadata: { signatureValid: true, gatewayStatus: transaction.gatewayStatus, paymentMethod: transaction.method, source: 'RAZORPAY_WEBHOOK' },
      });
    } else if (eventType === 'payment.failed') {
      transaction.status = 'failed';
      transaction.gatewayStatus = 'failed';
      if (gatewayPayment?.id) transaction.razorpayPaymentId = gatewayPayment.id;
      if (gatewayPayment?.method) transaction.method = gatewayPayment.method;
      transaction.webhookSignatureValid = true;
      await transaction.save();
      await recordEventSafely(owner.merchantId, {
        type: 'PAYMENT_FAILED', severity: 'WARNING', paymentId: transaction.razorpayPaymentId,
        orderId, transactionId: transaction.txnId, message: 'Razorpay payment failed.', status: 'FAILED',
        metadata: { gatewayStatus: 'failed', reason: gatewayPayment?.error_description, source: 'RAZORPAY_WEBHOOK' },
      });
    }
    await WebhookLog.updateOne({ eventId }, { processed: true });
    return res.json({ success: true });
  } catch (error) {
    await WebhookLog.updateOne({ eventId }, { processed: false, error: 'Processing failed' });
    console.error('Razorpay webhook processing failed:', error.message);
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
}

module.exports = razorpayWebhook;
