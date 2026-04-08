const mongoose = require('mongoose');
const Payment  = require('./models/Payment');

/**
 * Seeds the MongoDB database with demo payments so the dashboard
 * is never empty on first run.
 * Only runs if 0 payments exist in the DB.
 */
async function seedDatabase() {
  const count = await Payment.countDocuments();
  if (count > 0) {
    console.log(`📦 DB already has ${count} payments — skipping seed.`);
    return;
  }

  const now = Date.now();
  const demo = [
    { txnId: 'DEMO_001', amount: 500,   name: 'Rahul Sharma',  status: 'verified',   method: 'UPI',        proofLink: 'trustpay-verify:DEMO_001', time: now - 3 * 60000 },
    { txnId: 'DEMO_002', amount: 1200,  name: 'Priya Patel',   status: 'verified',   method: 'Card',       proofLink: 'trustpay-verify:DEMO_002', time: now - 10 * 60000 },
    { txnId: 'DEMO_003', amount: 250,   name: 'Arjun Reddy',   status: 'unmatched',  method: 'UPI',        proofLink: 'trustpay-verify:DEMO_003', time: now - 18 * 60000 },
    { txnId: 'DEMO_004', amount: 3500,  name: 'Meera Nair',    status: 'verified',   method: 'NetBanking', proofLink: 'trustpay-verify:DEMO_004', time: now - 25 * 60000 },
    { txnId: 'DEMO_005', amount: 800,   name: 'Amit Kumar',    status: 'suspicious', method: 'UPI',        proofLink: 'trustpay-verify:DEMO_005', time: now - 40 * 60000 },
    { txnId: 'DEMO_006', amount: 150,   name: 'Sneha Desai',   status: 'pending',    method: 'UPI',        proofLink: 'trustpay-verify:DEMO_006', time: now - 55 * 60000 },
    { txnId: 'DEMO_007', amount: 4500,  name: 'Vikram Singh',  status: 'verified',   method: 'Card',       proofLink: 'trustpay-verify:DEMO_007', time: now - 70 * 60000 },
    { txnId: 'DEMO_008', amount: 2100,  name: 'Ananya Gupta',  status: 'verified',   method: 'UPI',        proofLink: 'trustpay-verify:DEMO_008', time: now - 90 * 60000 },
    { txnId: 'DEMO_009', amount: 650,   name: 'Ravi Verma',    status: 'verified',   method: 'UPI',        proofLink: 'trustpay-verify:DEMO_009', time: now - 110 * 60000 },
    { txnId: 'DEMO_010', amount: 9800,  name: 'Kavya Iyer',    status: 'verified',   method: 'Card',       proofLink: 'trustpay-verify:DEMO_010', time: now - 130 * 60000 },
  ];

  await Payment.insertMany(demo);
  console.log(`🌱 Seeded ${demo.length} demo payments into MongoDB.`);
}

module.exports = seedDatabase;
