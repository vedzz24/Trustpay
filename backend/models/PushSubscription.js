const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscription: {
    type: Object,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // auto cleanup old subscriptions, optional but good practice
  }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
