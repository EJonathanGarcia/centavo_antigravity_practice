import type { IncomingMessage } from 'node:http';
import {
  extractAndValidateSession,
  type SessionClaims,
} from '../security/sessionValidator.ts';
import { AuthError } from '../services/authService.ts';

/**
 * Middleware de protección de rutas que delega el 100% de la validación
 * al módulo central `src/security/sessionValidator.ts` según exige AGENTS.md.
 */
export function requireAuthenticatedSession(req: IncomingMessage): SessionClaims {
  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : undefined;

  const result = extractAndValidateSession({ authorizationHeader: authHeader });

  if (!result.valid || !result.claims) {
    throw new AuthError(
      result.reason ?? 'UNAUTHORIZED',
      'Sesión inválida o expirada.',
      401
    );
  }

  return result.claims;
}
