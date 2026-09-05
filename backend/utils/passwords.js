const crypto = require('crypto');

const ITERATIONS = 210000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 64, 'sha512').toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts[0] !== 'pbkdf2') return password === stored; // legacy compatibility only
  const modern = parts.length === 4;
  const iterations = modern ? Number(parts[1]) : 1000;
  const salt = modern ? parts[2] : parts[1];
  const expected = modern ? parts[3] : parts[2];
  if (!iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = { hashPassword, verifyPassword };
