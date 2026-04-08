const router      = require('express').Router();
const FamilyAlert = require('../models/FamilyAlert');

// POST /api/family/request — elderly user submits a payment needing approval
router.post('/request', async (req, res) => {
  try {
    const { amount, note, elderlyName } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

    // Cancel any existing pending alert before creating a new one
    await FamilyAlert.updateMany({ status: 'pending' }, { status: 'rejected' });

    const alert = await FamilyAlert.create({
      elderlyName: elderlyName || 'Family Member',
      amount:      Number(amount),
      note:        note || '',
      status:      'pending',
      time:        Date.now(),
    });

    console.log(`📩 Family approval needed: ₹${amount} by ${elderlyName}`);
    res.json({ success: true, requestId: alert._id.toString() });
  } catch (err) {
    console.error('family request error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/family/status/:id — elderly user polls for family's response
router.get('/status/:id', async (req, res) => {
  try {
    const alert = await FamilyAlert.findById(req.params.id);
    if (!alert) return res.json({ status: 'not_found' });
    res.json({ status: alert.status });
  } catch (err) {
    res.json({ status: 'not_found' });
  }
});

// GET /api/family/pending — family member's portal fetches latest pending alert
router.get('/pending', async (req, res) => {
  try {
    const alert = await FamilyAlert.findOne({ status: 'pending' }).sort({ createdAt: -1 });
    if (!alert) return res.json({ pending: false });
    res.json({ pending: true, request: alert });
  } catch (err) {
    res.status(500).json({ pending: false });
  }
});

// POST /api/family/approve
router.post('/approve', async (req, res) => {
  try {
    const alert = await FamilyAlert.findOne({ status: 'pending' }).sort({ createdAt: -1 });
    if (!alert) return res.status(404).json({ success: false });
    alert.status = 'approved';
    await alert.save();
    console.log(`✅ Family approved ₹${alert.amount}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// POST /api/family/reject
router.post('/reject', async (req, res) => {
  try {
    const alert = await FamilyAlert.findOne({ status: 'pending' }).sort({ createdAt: -1 });
    if (!alert) return res.status(404).json({ success: false });
    alert.status = 'rejected';
    await alert.save();
    console.log(`❌ Family rejected ₹${alert.amount}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
