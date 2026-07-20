const mongoose = require('mongoose');
const Payment  = require('./models/Payment');
const crypto   = require('crypto');

function calculateTxnHash(txnId, amount, name, time) {
  const secret = process.env.TRUSTPAY_SECRET || 'trustpay_super_secure_key_987';
  return crypto.createHmac('sha256', secret)
               .update(`${txnId}|${amount}|${name}|${time}`)
               .digest('hex');
}

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
  
  const createDemoPayment = (txnId, amount, name, status, method, offsetMinutes) => {
    const time = now - offsetMinutes * 60000;
    const signature = calculateTxnHash(txnId, amount, name, time);
    const payload = Buffer.from(JSON.stringify({ txnId, amount, name, time })).toString('base64');
    const proofLink = `trustpay-verify:${payload}.${signature}`;
    return {
      txnId,
      amount,
      name,
      status,
      method,
      proofLink,
      hash: signature,
      time
    };
  };

  const demo = [
    createDemoPayment('DEMO_001', 500,   'Rahul Sharma',  'verified',   'UPI', 3),
    createDemoPayment('DEMO_002', 1200,  'Priya Patel',   'verified',   'UPI', 10),
    createDemoPayment('DEMO_003', 250,   'Arjun Reddy',   'pending',    'UPI', 18),
    createDemoPayment('DEMO_004', 3500,  'Meera Nair',    'verified',   'UPI', 25),
    createDemoPayment('DEMO_005', 800,   'Amit Kumar',    'suspicious', 'UPI', 40),
    createDemoPayment('DEMO_006', 150,   'Sneha Desai',   'pending',    'UPI', 55),
    createDemoPayment('DEMO_007', 4500,  'Vikram Singh',  'verified',   'UPI', 70),
    createDemoPayment('DEMO_008', 2100,  'Ananya Gupta',  'verified',   'UPI', 90),
    createDemoPayment('DEMO_009', 650,   'Ravi Verma',    'verified',   'UPI', 110),
    createDemoPayment('DEMO_010', 9800,  'Kavya Iyer',    'verified',   'UPI', 130),
  ];

  await Payment.insertMany(demo);
  console.log(`🌱 Seeded ${demo.length} demo payments with cryptographic signatures into MongoDB.`);
}

module.exports = seedDatabase;
