const bcrypt = require('bcryptjs');
const { createHash, timingSafeEqual } = require('crypto');

const BCRYPT_COST = 12;

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
}

function legacySha256(password) {
  return createHash('sha256').update(String(password)).digest('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), BCRYPT_COST);
}

async function verifyPassword(password, storedHash) {
  const hash = String(storedHash || '').trim();
  if (!hash) return false;
  if (isBcryptHash(hash)) return bcrypt.compare(String(password), hash);

  const candidate = Buffer.from(legacySha256(password));
  const stored = Buffer.from(hash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

module.exports = { BCRYPT_COST, hashPassword, isBcryptHash, verifyPassword };
