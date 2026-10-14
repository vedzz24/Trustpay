require('dotenv').config();
const mongoose = require('mongoose');

async function cleanAndReset() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { dbName: 'trustpay' });
  console.log('Connected to central MongoDB.');

  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  
  // 1. Drop all merchant databases: trustpay_MER*
  for (const dbInfo of dbs.databases) {
    if (dbInfo.name.startsWith('trustpay_MER')) {
      console.log('Dropping merchant database:', dbInfo.name);
      const merchantDb = mongoose.connection.useDb(dbInfo.name);
      await merchantDb.dropDatabase();
      console.log('Successfully dropped:', dbInfo.name);
    }
  }

  // 2. Clear central collections for fresh start
  const collectionsToClear = [
    'users',
    'counters',
    'otpalerts',
    'payments',
    'transactions',
    'razorpayOrderOwners',
    'familyalerts',
    'guardianAlerts',
    'guardianLinks',
    'guardianInvitations',
    'userSafetyReports',
    'pushsubscriptions',
    'loginOtps'
  ];

  for (const colName of collectionsToClear) {
    try {
      const col = mongoose.connection.db.collection(colName);
      const deleted = await col.deleteMany({});
      console.log('Cleared collection', colName, ':', deleted.deletedCount, 'documents removed.');
    } catch (err) {
      console.log('Collection', colName, 'skip/error:', err.message);
    }
  }

  // 3. Reset Counter to sequence: 0 so next merchant is MER001
  const Counter = mongoose.connection.db.collection('counters');
  await Counter.updateOne(
    { _id: 'merchantId' },
    { $set: { sequence: 0 } },
    { upsert: true }
  );
  console.log('Counter for merchantId reset to sequence: 0 (next merchant will be MER001).');

  console.log('ALL DATABASES AND ACCOUNTS RESET TO FRESH STATE.');
  process.exit(0);
}

cleanAndReset().catch(e => {
  console.error('Reset error:', e);
  process.exit(1);
});
