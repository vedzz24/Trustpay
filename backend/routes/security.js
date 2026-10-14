const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const RazorpayOrderOwner = require('../models/RazorpayOrderOwner');
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

function resolveExternalPaymentDetails(identifier, claimedAmount) {
  const str = String(identifier || '').trim();
  const amt = claimedAmount !== undefined && claimedAmount !== '' && !isNaN(Number(claimedAmount)) ? Number(claimedAmount) : null;

  // 1. UPI Deep Link format: upi://pay?pa=...&pn=...&am=...
  if (str.startsWith('upi://') || str.includes('pa=')) {
    try {
      const url = new URL(str.startsWith('upi://') ? str : `upi://pay?${str}`);
      const pa = url.searchParams.get('pa') || '';
      const pn = decodeURIComponent(url.searchParams.get('pn') || '');
      const am = url.searchParams.get('am') ? Number(url.searchParams.get('am')) : amt;
      const tr = url.searchParams.get('tr') || url.searchParams.get('tid') || str;
      return {
        paidTo: pn || (pa ? pa.split('@')[0] : 'UPI Beneficiary'),
        destination: pa || 'External UPI Network',
        amount: am,
        payer: 'Customer',
        referenceId: tr,
        status: 'Processed on External UPI',
        network: 'UPI / NPCI',
        belongsToThisMerchant: false,
      };
    } catch (_) {}
  }

  // 2. Standard UPI ID format: username@bank
  const upiMatch = str.match(/\b([a-zA-Z0-9.\-_]{2,40}@([a-zA-Z]{2,20}))\b/);
  if (upiMatch) {
    const vpa = upiMatch[1];
    const handle = upiMatch[2].toLowerCase();
    const handleBanks = {
      okhdfcbank: 'HDFC Bank (Google Pay)',
      okaxis: 'Axis Bank (Google Pay)',
      oksbi: 'State Bank of India (Google Pay)',
      okicici: 'ICICI Bank (Google Pay)',
      ybl: 'YES Bank (PhonePe)',
      ibl: 'ICICI Bank (PhonePe)',
      axl: 'Axis Bank (PhonePe)',
      paytm: 'Paytm Payments Bank',
      barodampay: 'Bank of Baroda',
      upi: 'BHIM / NPCI National UPI',
      kotak: 'Kotak Mahindra Bank',
      apl: 'Amazon Pay (Axis Bank)',
      waaxis: 'WhatsApp Pay (Axis)',
    };
    const bankName = handleBanks[handle] || `${handle.toUpperCase()} UPI PSP`;
    const username = vpa.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return {
      paidTo: username || 'External Payee',
      destination: `${vpa} (${bankName})`,
      amount: amt,
      payer: 'Customer',
      referenceId: str,
      status: 'External UPI Route',
      network: bankName,
      belongsToThisMerchant: false,
    };
  }

  // 3. 12-digit numeric UPI UTR (NPCI standard reference)
  if (/^\d{12}$/.test(str)) {
    return {
      paidTo: 'External Beneficiary Account',
      destination: 'NPCI National UPI Settlement Network',
      amount: amt,
      payer: 'Customer Account',
      referenceId: str,
      status: 'External UPI UTR Settlement',
      network: 'NPCI / UPI 2.0',
      belongsToThisMerchant: false,
    };
  }

  // 4. Razorpay external payment ID: pay_...
  if (/^pay_[A-Za-z0-9]{10,}$/i.test(str)) {
    return {
      paidTo: 'External Merchant Gateway',
      destination: 'Razorpay Payment Gateway (Third-Party Account)',
      amount: amt,
      payer: 'Customer',
      referenceId: str,
      status: 'Gateway Settlement (Non-TrustPay)',
      network: 'Razorpay Gateway',
      belongsToThisMerchant: false,
    };
  }

  // 5. Razorpay external order ID: order_...
  if (/^order_[A-Za-z0-9]{10,}$/i.test(str)) {
    return {
      paidTo: 'External Store Order',
      destination: 'External Merchant Order Management',
      amount: amt,
      payer: 'Customer',
      referenceId: str,
      status: 'External Order',
      network: 'Payment Gateway',
      belongsToThisMerchant: false,
    };
  }

  // 6. Bank IMPS/NEFT/RTGS/TRX transaction format
  if (/^(?:IMPS|NEFT|RTGS|TXN|TRX)[-_]?[A-Za-z0-9]{6,}$/i.test(str)) {
    return {
      paidTo: 'External Bank Account Beneficiary',
      destination: 'Interbank Electronic Fund Transfer (IMPS/NEFT)',
      amount: amt,
      payer: 'Bank Account Holder',
      referenceId: str,
      status: 'External Banking Channel',
      network: 'National Interbank Network',
      belongsToThisMerchant: false,
    };
  }

  // 7. If claimedAmount is provided with an alphanumeric transaction reference
  if (amt !== null && str.length >= 4) {
    return {
      paidTo: 'External Payee / Third-Party Recipient',
      destination: 'External Non-TrustPay Account',
      amount: amt,
      payer: 'Customer',
      referenceId: str,
      status: 'External Payment (Not Credited to Current Merchant)',
      network: 'External Payment Network',
      belongsToThisMerchant: false,
    };
  }

  return null;
}

router.post('/verify-transaction', requireMerchant, async (req, res) => {
  const identifier = String(req.body.identifier || '').trim();
  const claimedAmount = req.body.claimedAmount;
  if (!identifier) return res.status(400).json({ success: false, message: 'Transaction or payment ID is required' });
  try {
    const { Transaction, Payment } = getMerchantModels(req.user.merchantId);
    const filters = [{ txnId: identifier }, { razorpayPaymentId: identifier }];
    if (mongoose.isValidObjectId(identifier)) filters.push({ _id: identifier });
    let payment = await Transaction.findOne({ $or: filters });
    if (!payment) {
      payment = await Payment.findOne({ txnId: identifier });
    }

    if (payment) {
      if (claimedAmount !== undefined && claimedAmount !== '' && Number(claimedAmount) !== payment.amount) {
        await recordSecurityEvent(req.user.merchantId, {
          type: 'AMOUNT_MISMATCH', severity: 'HIGH', paymentId: String(payment._id), transactionId: payment.txnId,
          message: 'Claimed payment amount differs from the trusted record.', status: 'REJECTED',
          metadata: { claimedAmount: Number(claimedAmount), verifiedAmount: payment.amount, source: 'SECURITY_CENTER' },
        });
        return res.status(409).json({ success: false, result: 'AMOUNT_MISMATCH', claimedAmount: Number(claimedAmount), verifiedAmount: payment.amount });
      }
      return res.json({ success: true, result: payment.status === 'verified' ? 'VERIFIED' : 'NOT_VERIFIED', verification: serializeVerification(payment, req.user.merchantId) });
    }

    // ── Payment not found in current merchant ledger ─────────────────────────
    // Check if it belongs to another TrustPay merchant
    let otherMerchant = null;
    let otherTx = null;

    const orderOwner = await RazorpayOrderOwner.findOne({
      $or: [{ razorpayOrderId: identifier }, { razorpayPaymentId: identifier }]
    }).lean();

    if (orderOwner && orderOwner.merchantId !== req.user.merchantId) {
      otherMerchant = await User.findOne({ merchantId: orderOwner.merchantId, role: 'merchant' }).select('merchantId businessName merchantName upiId name').lean();
      if (otherMerchant) {
        try {
          const otherModels = getMerchantModels(otherMerchant.merchantId);
          otherTx = await otherModels.Transaction.findOne({ $or: filters }).lean() ||
                    await otherModels.Payment.findOne({ txnId: identifier }).lean();
        } catch (_) {}
      }
    }

    if (!otherMerchant) {
      const allOtherMerchants = await User.find({ role: 'merchant', merchantId: { $ne: req.user.merchantId } })
        .select('merchantId businessName merchantName upiId name')
        .lean();

      for (const m of allOtherMerchants) {
        try {
          const mModels = getMerchantModels(m.merchantId);
          const found = await mModels.Transaction.findOne({ $or: filters }).lean() ||
                        await mModels.Payment.findOne({ txnId: identifier }).lean();
          if (found) {
            otherMerchant = m;
            otherTx = found;
            break;
          }
        } catch (_) {}
      }
    }

    if (otherMerchant) {
      const recipientName = otherMerchant.businessName || otherMerchant.merchantName || otherMerchant.name || otherMerchant.merchantId;
      const amount = otherTx ? otherTx.amount : (claimedAmount ? Number(claimedAmount) : null);
      const payer = otherTx ? (otherTx.name || otherTx.customerName || 'Customer') : 'Customer';

      await recordSecurityEvent(req.user.merchantId, {
        type: 'EXTERNAL_MERCHANT_TRANSACTION',
        severity: 'WARNING',
        transactionId: identifier,
        message: `Transaction was paid to merchant "${recipientName}" (${otherMerchant.merchantId}), not your account.`,
        status: 'FLAGGED',
        metadata: { recipientMerchantId: otherMerchant.merchantId, source: 'SECURITY_CENTER' },
      });

      return res.json({
        success: true,
        result: 'EXTERNAL_MERCHANT_PAYMENT',
        belongsToThisMerchant: false,
        message: `⚠️ This payment was completed, but it was paid to "${recipientName}" (${otherMerchant.merchantId}), NOT to your merchant account (${req.user.merchantId}).`,
        externalDetails: {
          paidTo: recipientName,
          recipientMerchantId: otherMerchant.merchantId,
          destination: `TrustPay Merchant Account (${otherMerchant.merchantId})`,
          amount,
          payer,
          referenceId: identifier,
          status: otherTx ? (otherTx.status || 'verified') : 'Completed',
          network: 'TrustPay Multi-Tenant Network',
          belongsToThisMerchant: false,
        },
      });
    }

    // Check if it resolves to an external UPI / banking / gateway network
    const externalInfo = resolveExternalPaymentDetails(identifier, claimedAmount);
    if (externalInfo) {
      await recordSecurityEvent(req.user.merchantId, {
        type: 'EXTERNAL_PAYMENT_QUERIED',
        severity: 'INFO',
        transactionId: identifier,
        message: `Queried payment resolved on external network: ${externalInfo.destination} (Payee: ${externalInfo.paidTo}).`,
        status: 'EXTERNAL',
        metadata: { source: 'SECURITY_CENTER' },
      });

      return res.json({
        success: true,
        result: 'EXTERNAL_PAYMENT',
        belongsToThisMerchant: false,
        message: `Payment detected on external network (${externalInfo.destination}). It was routed to "${externalInfo.paidTo}" and did not credit your merchant account (${req.user.merchantId}).`,
        externalDetails: externalInfo,
      });
    }

    // Completely unknown identifier
    await recordSecurityEvent(req.user.merchantId, {
      type: 'PAYMENT_NOT_FOUND', severity: 'WARNING', transactionId: identifier,
      message: 'No trusted payment record found for this merchant or external network.', status: 'NOT_VERIFIED',
      metadata: { source: 'SECURITY_CENTER' },
    });
    return res.status(404).json({
      success: false,
      result: 'NOT_VERIFIED',
      message: 'No trusted payment record found for this merchant account or external network.',
      externalDetails: {
        paidTo: 'Not Found / Unregistered',
        destination: 'Not in TrustPay Ledger',
        amount: claimedAmount !== undefined && claimedAmount !== '' ? Number(claimedAmount) : null,
        referenceId: identifier,
        belongsToThisMerchant: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Transaction verification failed' });
  }
});

module.exports = router;
