const crypto = require('crypto');
const GuardianLink = require('../models/GuardianLink');
const GuardianAlert = require('../models/GuardianAlert');
const User = require('../models/User');
const { redactOtp } = require('../utils/safetyAnalysis');
const { sendGuardianRiskAlertEmail } = require('./email');

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
  const reason = redactOtp(String(summary || safeReasons[0] || `${riskLevel} TrustPay safety check.`)).slice(0, 500);
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
    const guardian = await UserModel.findById(link.guardianId).select('email').lean();
    if (guardian?.email) await emailAlert({ email: guardian.email, riskLevel, checkType: alertType || checkType, reasons: safeReasons });
  }));
  return alerts.length === 1 ? alerts[0] : alerts;
}

module.exports = { createGuardianAlertForUser };
