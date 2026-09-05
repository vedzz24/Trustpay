const router = require('express').Router();
const GuardianLink = require('../models/GuardianLink');
const { requireUser } = require('../utils/auth');

router.get('/guardian-requests', requireUser, async (req, res) => {
  const guardianRequests = await GuardianLink.find({ protectedUserId: req.user.id, status: 'pending' }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, guardianRequests });
});

async function decide(req, res, status) {
  const update = status === 'accepted' ? { status, acceptedAt: new Date(), $unset: { rejectedAt: 1, removedAt: 1 } } : { status, rejectedAt: new Date(), $unset: { acceptedAt: 1 } };
  const request = await GuardianLink.findOneAndUpdate({ _id: req.params.id, protectedUserId: req.user.id, status: 'pending' }, update, { new: true });
  if (!request) return res.status(404).json({ success: false, message: 'Pending Guardian request not found.' });
  return res.json({ success: true, message: status === 'accepted' ? 'Guardian protection request accepted.' : 'Guardian protection request rejected.', request });
}

router.patch('/guardian-requests/:id/accept', requireUser, (req, res) => decide(req, res, 'accepted'));
router.patch('/guardian-requests/:id/reject', requireUser, (req, res) => decide(req, res, 'rejected'));

module.exports = router;
