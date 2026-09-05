// Compatibility export for older imports. Merchant routes must obtain this
// schema through getMerchantModels() so it is bound to the correct database.
const { paymentSchema } = require('./merchantSchemas');

module.exports = { paymentSchema };
