async function seedDatabase() {
  // Merchant databases intentionally start empty. Demo payments in the central
  // database would violate tenant isolation and make new merchants see data.
  console.log('📦 Central database ready; merchant databases start empty.');
}

module.exports = seedDatabase;
