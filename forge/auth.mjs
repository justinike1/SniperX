import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const HASH_PREFIX = 'scrypt:v1';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  PARTICIPANT: 'PARTICIPANT',
});

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  return null;
}

export function validateRole(value) {
  return value === ROLES.ADMIN || value === ROLES.CUSTOMER || value === ROLES.PARTICIPANT;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `${HASH_PREFIX}$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

