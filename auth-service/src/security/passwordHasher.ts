import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

/**
 * Parámetros de hashing de contraseñas justificados en el Plan de Implementación:
 * - Algoritmo: scrypt (memory-hard KDF de node:crypto)
 * - Salt: 16 bytes (128 bits) aleatorios criptográficos por contraseña
 * - Costo: N=16384, r=8, p=1, keylen=64 bytes (512 bits)
 * - Verificación: comparación en tiempo constante con crypto.timingSafeEqual
 *
 * IMPORTANTE (AGENTS.md): Cualquier cambio a esta lógica requiere justificación
 * explícita en el plan antes de ejecutarse.
 */
const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const SCRYPT_PARAMS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = (await scryptAsync(
    plainPassword,
    salt,
    KEY_LENGTH,
    SCRYPT_PARAMS
  )) as Buffer;

  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, nStr, rStr, pStr, salt, hashHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);

  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !hashHex) {
    return false;
  }

  const expectedBuffer = Buffer.from(hashHex, 'hex');
  const derivedKey = (await scryptAsync(plainPassword, salt, expectedBuffer.length, {
    N,
    r,
    p,
  })) as Buffer;

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, expectedBuffer);
}
