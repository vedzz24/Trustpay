const Counter = require('../models/Counter');
const User = require('../models/User');

async function generateMerchantId() {
  // The atomic counter prevents concurrent signups from receiving the same ID.
  // The existence check also makes this safe when upgrading a database that
  // already contains sequential merchant IDs but no counter document.
  while (true) {
    const counter = await Counter.findByIdAndUpdate(
      'merchantId',
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const merchantId = `MER${String(counter.sequence).padStart(3, '0')}`;
    if (!(await User.exists({ merchantId }))) return merchantId;
  }
}

module.exports = { generateMerchantId };
