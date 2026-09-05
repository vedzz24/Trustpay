const WEBHOOK_EVENT_INDEX = 'eventId_unique_sparse';

function isCanonicalWebhookIndex(index) {
  return index?.name === WEBHOOK_EVENT_INDEX
    && index?.key?.eventId === 1
    && index?.unique === true
    && index?.sparse === true;
}

async function migrateWebhookEventIdIndex(connection) {
  const collection = connection.collection('webhookLogs');
  const indexes = await collection.indexes();
  const legacy = indexes.find(index => index.name === 'eventId_1');
  const canonical = indexes.find(index => index.name === WEBHOOK_EVENT_INDEX);

  if (canonical && !isCanonicalWebhookIndex(canonical)) {
    throw new Error(`Unexpected ${WEBHOOK_EVENT_INDEX} definition in ${connection.name}.webhookLogs`);
  }

  if (legacy) {
    const duplicate = await collection.aggregate([
      { $match: { eventId: { $exists: true, $ne: null } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ]).next();
    if (duplicate) {
      throw new Error(`Cannot migrate ${connection.name}.webhookLogs.eventId_1: duplicate eventId values exist`);
    }

    // This removes only index metadata. It never deletes the collection or data.
    await collection.dropIndex('eventId_1');
  }

  if (!canonical) {
    await collection.createIndex(
      { eventId: 1 },
      { name: WEBHOOK_EVENT_INDEX, unique: true, sparse: true },
    );
  }
}

async function migrateLoginOtpExpiresAtIndex(connection) {
  const collections = await connection.db.listCollections({ name: 'loginOtps' }, { nameOnly: true }).toArray();
  if (collections.length === 0) await connection.createCollection('loginOtps');
  const collection = connection.collection('loginOtps');
  const indexes = await collection.indexes();
  const expiresAt = indexes.find(index => index.name === 'expiresAt_1');

  if (!expiresAt) {
    await collection.createIndex({ expiresAt: 1 }, { name: 'expiresAt_1', expireAfterSeconds: 86400 });
  } else if (expiresAt.key?.expiresAt !== 1 || expiresAt.expireAfterSeconds !== 86400) {
    if (expiresAt.key?.expiresAt !== 1) throw new Error('Unexpected trustpay.loginOtps.expiresAt_1 key definition');
    // Convert/update the existing index in place; no documents are removed.
    await connection.db.command({
      collMod: 'loginOtps',
      index: { name: 'expiresAt_1', expireAfterSeconds: 86400 },
    });
  }
}

async function migrateGuardianLinks(connection) {
  const existing = await connection.db.listCollections({ name: 'guardianLinks' }, { nameOnly: true }).toArray();
  if (!existing.length) return;
  const collection = connection.collection('guardianLinks');
  const legacyLinks = await collection.find({ protectedUserId: { $exists: false }, userId: { $exists: true } }).toArray();
  for (const link of legacyLinks) {
    const [guardian, protectedUser] = await Promise.all([
      connection.collection('users').findOne({ _id: link.guardianId }, { projection: { name: 1, email: 1 } }),
      connection.collection('users').findOne({ _id: link.userId }, { projection: { name: 1, email: 1 } }),
    ]);
    if (guardian && protectedUser) {
      const migrated = {
      protectedUserId: link.userId, guardianName: guardian.name, guardianEmail: guardian.email,
      protectedUserName: protectedUser.name, protectedUserEmail: protectedUser.email,
      status: link.status === 'active' ? 'accepted' : 'removed',
      };
      if (link.status === 'active') migrated.acceptedAt = link.updatedAt || link.createdAt || new Date();
      await collection.updateOne({ _id: link._id }, { $set: migrated, $unset: { userId: 1 } });
    }
  }
  const indexes = await collection.indexes();
  if (indexes.some(index => index.name === 'userId_1')) await collection.dropIndex('userId_1');
}

module.exports = { WEBHOOK_EVENT_INDEX, isCanonicalWebhookIndex, migrateWebhookEventIdIndex, migrateLoginOtpExpiresAtIndex, migrateGuardianLinks };
