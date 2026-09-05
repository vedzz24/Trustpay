const mongoose = require('mongoose');
const {
  paymentSchema,
  billSchema,
  fraudAlertSchema,
  webhookLogSchema,
  securityEventSchema,
  proofAuditSchema,
} = require('../models/merchantSchemas');
const { migrateWebhookEventIdIndex } = require('./indexMigrations');

const MERCHANT_ID_PATTERN = /^MER\d{3,}$/;

function getMerchantDatabaseName(merchantId) {
  if (!MERCHANT_ID_PATTERN.test(merchantId || '')) {
    throw new Error('Invalid authenticated merchant ID');
  }
  return `trustpay_${merchantId}`;
}

function getMerchantConnection(merchantId, baseConnection = mongoose.connection) {
  if (baseConnection.readyState !== 1) throw new Error('Central MongoDB connection is not ready');
  return baseConnection.useDb(getMerchantDatabaseName(merchantId), { useCache: true });
}

function getMerchantModels(merchantId, baseConnection = mongoose.connection) {
  const connection = getMerchantConnection(merchantId, baseConnection);
  const Transaction = connection.models.Transaction || connection.model('Transaction', paymentSchema, 'transactions');
  return {
    connection,
    // Payment workflows and the dashboard use one canonical tenant ledger.
    // The physical collection is `transactions`; central collections are never queried.
    Payment: Transaction,
    Transaction,
    Bill: connection.models.Bill || connection.model('Bill', billSchema, 'bills'),
    FraudAlert: connection.models.FraudAlert || connection.model('FraudAlert', fraudAlertSchema, 'fraudAlerts'),
    WebhookLog: connection.models.WebhookLog || connection.model('WebhookLog', webhookLogSchema, 'webhookLogs'),
    SecurityEvent: connection.models.SecurityEvent || connection.model('SecurityEvent', securityEventSchema, 'securityevents'),
    ProofAudit: connection.models.ProofAudit || connection.model('ProofAudit', proofAuditSchema, 'proofaudits'),
  };
}

async function initializeMerchantDatabase(merchantId, baseConnection = mongoose.connection) {
  const models = getMerchantModels(merchantId, baseConnection);
  const requiredCollections = ['payments', 'transactions', 'bills', 'fraudAlerts', 'webhookLogs', 'securityevents', 'proofaudits'];
  const existing = new Set((await models.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  await Promise.all(requiredCollections.filter(name => !existing.has(name)).map(name => models.connection.createCollection(name)));
  await migrateWebhookEventIdIndex(models.connection);
  await Promise.all([
    models.Transaction.init(), models.Bill.init(),
    models.FraudAlert.init(), models.WebhookLog.init(), models.SecurityEvent.init(), models.ProofAudit.init(),
  ]);
  return models.connection;
}

module.exports = {
  getMerchantDatabaseName,
  getMerchantConnection,
  getMerchantModels,
  initializeMerchantDatabase,
};
