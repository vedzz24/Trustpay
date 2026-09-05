const crypto = require('crypto');
const { getMerchantModels } = require('./merchantDb');

const ALLOWED_METADATA_KEYS = new Set([
  'claimedAmount', 'verifiedAmount', 'gatewayStatus', 'signatureValid',
  'merchantMatch', 'duplicateEvent', 'source', 'reason',
  'paymentProofDetected', 'proofResult',
  'eventType', 'paymentMethod',
]);

function sanitizeMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => ALLOWED_METADATA_KEYS.has(key)));
}

async function recordSecurityEvent(merchantId, event) {
  const { SecurityEvent } = getMerchantModels(merchantId);
  return SecurityEvent.create({
    eventId: event.eventId || `SEC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    merchantId,
    type: event.type,
    severity: event.severity,
    paymentId: event.paymentId,
    orderId: event.orderId,
    transactionId: event.transactionId,
    message: event.message,
    status: event.status,
    metadata: sanitizeMetadata(event.metadata),
  });
}

module.exports = { recordSecurityEvent, sanitizeMetadata };
