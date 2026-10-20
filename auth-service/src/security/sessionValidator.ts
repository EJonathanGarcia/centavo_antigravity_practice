import crypto from 'node:crypto';
import { env } from '../config/env.ts';
import { logger } from '../utils/logger.ts';

/**
 * MÓDULO CENTRAL ÚNICO DE VALIDACIÓN DE SESIÓN
 * Regla de AGENTS.md:
 * "Toda validación de sesión debe pasar por un solo módulo central."
 * "Nunca logueas credenciales ni tokens en texto plano."
 */

export interface SessionClaims {
  sub: string;       // ID del usuario
  email: string;     // Correo del usuario
  name: string;      // Nombre del usuario
  iss: string;       // Emisor del token
  iat: number;       // Timestamp de emisión (segundos)
  exp: number;       // Timestamp de expiración (segundos)
  jti: string;       // Identificador único de sesión
}

export interface SessionValidationResult {
  valid: boolean;
  claims?: SessionClaims;
  reason?: 'MISSING_TOKEN' | 'MALFORMED_TOKEN' | 'INVALID_SIGNATURE' | 'TOKEN_EXPIRED' | 'INVALID_ISSUER' | 'SESSION_REVOKED';
}

// Registro en memoria de sesiones revocadas por su ID único (jti), nunca guardando el token en texto plano
const revokedSessionIds = new Set<string>();

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function base64UrlDecodeToString(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signSegment(signingInput: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
}

/**
 * Emite un token JWT firmado (HS256) para un usuario autenticado.
 */
export function issueSessionToken(user: { id: string; email: string; name: string }): {
  token: string;
  expiresAt: string;
  sessionId: string;
} {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + env.jwtExpiresInSeconds;
  const sessionId = crypto.randomUUID();

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: SessionClaims = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iss: env.jwtIssuer,
    iat: nowSeconds,
    exp: expSeconds,
    jti: sessionId,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signSegment(signingInput, env.jwtSecret);

  logger.info('session.issued', {
    userId: user.id,
    sessionId,
    expiresAt: new Date(expSeconds * 1000).toISOString(),
  });

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: new Date(expSeconds * 1000).toISOString(),
    sessionId,
  };
}

/**
 * Punto único y obligatorio para validar cualquier token de sesión en el servicio.
 */
export function validateSessionToken(rawToken?: string | null): SessionValidationResult {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
    return { valid: false, reason: 'MISSING_TOKEN' };
  }

  const normalizedToken = rawToken.startsWith('Bearer ')
    ? rawToken.slice('Bearer '.length).trim()
    : rawToken.trim();

  const segments = normalizedToken.split('.');
  if (segments.length !== 3) {
    logger.warn('session.validation_failed', { reason: 'MALFORMED_TOKEN' });
    return { valid: false, reason: 'MALFORMED_TOKEN' };
  }

  const [encodedHeader, encodedPayload, providedSignature] = segments;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signSegment(signingInput, env.jwtSecret);

  const providedBuf = Buffer.from(providedSignature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    logger.warn('session.validation_failed', { reason: 'INVALID_SIGNATURE' });
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  try {
    const header = JSON.parse(base64UrlDecodeToString(encodedHeader)) as { alg?: string; typ?: string };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      logger.warn('session.validation_failed', { reason: 'MALFORMED_TOKEN' });
      return { valid: false, reason: 'MALFORMED_TOKEN' };
    }

    const claims = JSON.parse(base64UrlDecodeToString(encodedPayload)) as SessionClaims;
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (claims.iss !== env.jwtIssuer) {
      logger.warn('session.validation_failed', { reason: 'INVALID_ISSUER', sessionId: claims.jti });
      return { valid: false, reason: 'INVALID_ISSUER' };
    }

    if (typeof claims.exp !== 'number' || nowSeconds >= claims.exp) {
      logger.warn('session.validation_failed', { reason: 'TOKEN_EXPIRED', sessionId: claims.jti });
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    if (revokedSessionIds.has(claims.jti)) {
      logger.warn('session.validation_failed', { reason: 'SESSION_REVOKED', sessionId: claims.jti });
      return { valid: false, reason: 'SESSION_REVOKED' };
    }

    return { valid: true, claims };
  } catch {
    logger.warn('session.validation_failed', { reason: 'MALFORMED_TOKEN' });
    return { valid: false, reason: 'MALFORMED_TOKEN' };
  }
}

/**
 * Extrae el token desde el encabezado Authorization o desde el cuerpo y lo valida
 * a través de la función central `validateSessionToken`.
 */
export function extractAndValidateSession(input: {
  authorizationHeader?: string;
  bodyToken?: string;
}): SessionValidationResult {
  const candidate = input.authorizationHeader ?? input.bodyToken;
  return validateSessionToken(candidate);
}

/**
 * Revoca una sesión activa validándola primero mediante el validador central.
 */
export function revokeSessionToken(rawToken?: string | null): boolean {
  const validation = validateSessionToken(rawToken);
  if (!validation.valid || !validation.claims) {
    return false;
  }

  revokedSessionIds.add(validation.claims.jti);
  logger.info('session.revoked', {
    userId: validation.claims.sub,
    sessionId: validation.claims.jti,
  });
  return true;
}

export function clearRevokedSessionsForTesting(): void {
  revokedSessionIds.clear();
}
