const crypto = require('crypto');
const mongoose = require('mongoose');
const webPush = require('web-push');
const GuardianLink = require('../models/GuardianLink');
const GuardianAlert = require('../models/GuardianAlert');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const { redactOtp } = require('../utils/safetyAnalysis');
const { sendGuardianRiskAlertEmail } = require('./email');
const { configured: smsConfigured, sendGuardianRiskAlertSms } = require('./sms');
const guardianRoutes = require('../routes/guardian');

async function createGuardianAlertForUser({ userId, checkType, alertType, riskLevel, reasons = [], summary, transactionId, qrInfo }, dependencies = {}) {
  const LinkModel = dependencies.GuardianLink || GuardianLink;
  const AlertModel = dependencies.GuardianAlert || GuardianAlert;
  const UserModel = dependencies.User || User;
  const emailAlert = dependencies.sendGuardianRiskAlertEmail || dependencies.sendGuardianAlertEmail || sendGuardianRiskAlertEmail;
  if (!['MEDIUM', 'HIGH', 'CRITICAL'].includes(riskLevel)) return null;
  let links;
  if (typeof LinkModel.find === 'function') {
    links = await LinkModel.find({ $or: [{ protectedUserId: userId, status: 'accepted' }, { userId, status: 'active' }] }).lean();
  } else {
    const legacy = await LinkModel.findOne({ userId, status: 'active' }).lean();
    links = legacy ? [legacy] : [];
  }
  if (!links.length) return null;
  const safeReasons = reasons.slice(0, 10).map(value => redactOtp(String(value)).slice(0, 160));
  const reason = redactOtp(String(summary || safeReasons[0] || `${riskLevel} GuardX safety check.`)).slice(0, 500);
  const alerts = await Promise.all(links.map(link => AlertModel.create({
    alertId: `GAL-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    protectedUserId: link.protectedUserId || link.userId,
    userId: link.protectedUserId || link.userId,
    guardianId: link.guardianId,
    alertType: alertType || checkType,
    checkType: alertType || checkType,
    riskLevel,
    reason,
    summary: reason,
    riskReasons: safeReasons,
    transactionId: transactionId ? String(transactionId).slice(0, 120) : undefined,
    qrInfo: qrInfo ? redactOtp(String(qrInfo)).slice(0, 300) : undefined,
  })));
  await Promise.allSettled(links.map(async link => {
    const guardian = await UserModel.findById(link.guardianId).select('email phoneNumber').lean();
    if (guardian?.email) await emailAlert({ email: guardian.email, riskLevel, checkType: alertType || checkType, reasons: safeReasons });
    if (['HIGH', 'CRITICAL'].includes(riskLevel) && smsConfigured() && guardian?.phoneNumber) {
      await sendGuardianRiskAlertSms({ phone: guardian.phoneNumber, riskLevel, checkType: alertType || checkType });
    }
    
    // Web push notifications
    try {
      const PushModel = dependencies.PushSubscription || PushSubscription;
      const validId = mongoose.isValidObjectId(link.guardianId);
      const subscriptions = validId ? await PushModel.find({ userId: link.guardianId }).lean() : [];
      
      if (subscriptions.length > 0) {
        if (!webPush.vapidKeysConfigured) {
          if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            webPush.setVapidDetails(
              'mailto:security@trustpay.example.com',
              process.env.VAPID_PUBLIC_KEY,
              process.env.VAPID_PRIVATE_KEY
            );
            webPush.vapidKeysConfigured = true;
          }
        }
        
        if (webPush.vapidKeysConfigured) {
          const payload = JSON.stringify({
            title: `GuardX Alert: ${riskLevel}`,
            body: `Suspicious activity detected: ${alertType || checkType}`,
            url: `/guardian/alerts?alert=${alerts[0].alertId || alerts[0].id}`
          });
          
          await Promise.allSettled(subscriptions.map(sub => 
            webPush.sendNotification(sub.subscription, payload).catch(async err => {
              if (err.statusCode === 404 || err.statusCode === 410) {
                // Subscription has expired or is no longer valid
                await PushModel.deleteOne({ _id: sub._id });
              }
            })
          ));
        }
      }
    } catch (pushErr) {
      console.error('Error sending push notification:', pushErr);
    }
  }));

  // Push SSE events
  if (guardianRoutes.sseConnections && guardianRoutes.publicAlert) {
    alerts.forEach((alert, index) => {
      const link = links[index];
      const res = guardianRoutes.sseConnections.get(String(link.guardianId));
      if (res) {
        res.write(`data: ${JSON.stringify(guardianRoutes.publicAlert(alert))}\n\n`);
      }
    });
  }

  return alerts.length === 1 ? alerts[0] : alerts;
}

module.exports = { createGuardianAlertForUser };
