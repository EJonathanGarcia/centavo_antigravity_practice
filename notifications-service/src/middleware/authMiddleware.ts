import type { IncomingMessage } from 'node:http';
import { env } from '../config/env.ts';
import { NotificationError } from '../services/notificationService.ts';
import { logger } from '../utils/logger.ts';

/**
 * Verifica una sesión. Debe devolver el identificador del usuario (`sub`) o null.
 */
export type SessionVerifier = (authorizationHeader: string) => Promise<{ userId: string } | null>;

/**
 * Verificador por defecto: delega TODA la validación de tokens a auth-service
 * (`GET /auth/verify`), que es el único módulo autorizado para validar sesiones.
 * Este servicio no conoce el secreto JWT ni valida firmas por sí mismo.
 */
export const verifySessionWithAuthService: SessionVerifier = async (authorizationHeader) => {
  try {
    const res = await fetch(`${env.authServiceUrl}/auth/verify`, {
      method: 'GET',
      headers: { Authorization: authorizationHeader },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { valid?: boolean; claims?: { sub?: string } };
    return body.valid && body.claims?.sub ? { userId: body.claims.sub } : null;
  } catch (err) {
    logger.error('auth.verify_unreachable', {
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
    throw new NotificationError('AUTH_SERVICE_UNAVAILABLE', 'No se pudo verificar la sesión.', 503);
  }
};

export async function requireAuthenticatedUser(
  req: IncomingMessage,
  verify: SessionVerifier
): Promise<{ userId: string; authorizationHeader: string }> {
  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  if (!header) {
    throw new NotificationError('UNAUTHORIZED', 'Sesión inválida o expirada.', 401);
  }
  const result = await verify(header);
  if (!result) {
    throw new NotificationError('UNAUTHORIZED', 'Sesión inválida o expirada.', 401);
  }
  return { userId: result.userId, authorizationHeader: header };
}
