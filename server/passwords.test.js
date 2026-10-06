const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('crypto');
const { hashPassword, isBcryptHash, verifyPassword } = require('./passwords');

test('crea hashes bcrypt y nunca conserva la contraseña en texto plano', async () => {
  const password = 'Prueba-Segura-2026';
  const hash = await hashPassword(password);
  assert.equal(isBcryptHash(hash), true);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('incorrecta', hash), false);
});

test('acepta temporalmente hashes SHA-256 heredados para migrarlos al iniciar sesión', async () => {
  const password = 'credencial-anterior';
  const legacyHash = createHash('sha256').update(password).digest('hex');
  assert.equal(await verifyPassword(password, legacyHash), true);
  assert.equal(await verifyPassword('incorrecta', legacyHash), false);
});
