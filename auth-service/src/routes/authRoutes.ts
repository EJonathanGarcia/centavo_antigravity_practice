import type { IncomingMessage, ServerResponse } from 'node:http';
import { authService, AuthError } from '../services/authService.ts';
import { requireAuthenticatedSession } from '../middleware/authMiddleware.ts';
import { userStore } from '../models/userStore.ts';
import { logger } from '../utils/logger.ts';

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
      if (raw.length > 1024 * 64) {
        reject(new AuthError('PAYLOAD_TOO_LARGE', 'El cuerpo de la petición excede el límite permitido.', 413));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {});
      } catch {
        reject(new AuthError('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.', 400));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload));
}

export async function handleAuthRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { status: 'ok', service: 'auth-service' });
      return;
    }

    if (req.method === 'POST' && path === '/auth/register') {
      const body = await readJsonBody(req);
      const result = await authService.register({
        email: typeof body.email === 'string' ? body.email : undefined,
        password: typeof body.password === 'string' ? body.password : undefined,
        name: typeof body.name === 'string' ? body.name : undefined,
      });
      sendJson(res, 201, result);
      return;
    }

    if (req.method === 'POST' && path === '/auth/login') {
      const body = await readJsonBody(req);
      const result = await authService.login({
        email: typeof body.email === 'string' ? body.email : undefined,
        password: typeof body.password === 'string' ? body.password : undefined,
      });
      sendJson(res, 200, result);
      return;
    }

    if ((req.method === 'GET' || req.method === 'POST') && path === '/auth/verify') {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const authHeader =
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
      const bodyToken = typeof body.token === 'string' ? body.token : undefined;

      const verification = authService.verifySession({
        authorizationHeader: authHeader,
        bodyToken,
      });

      if (!verification.valid) {
        sendJson(res, 401, {
          valid: false,
          reason: verification.reason ?? 'UNAUTHORIZED',
        });
        return;
      }

      sendJson(res, 200, {
        valid: true,
        user: verification.user,
        claims: verification.claims,
      });
      return;
    }

    if (req.method === 'GET' && path === '/auth/me') {
      const claims = requireAuthenticatedSession(req);
      const userRecord = userStore.findById(claims.sub);
      if (!userRecord) {
        throw new AuthError('USER_NOT_FOUND', 'Usuario no encontrado.', 404);
      }
      sendJson(res, 200, { user: userStore.toPublicUser(userRecord) });
      return;
    }

    if (req.method === 'POST' && path === '/auth/logout') {
      const body = await readJsonBody(req);
      const authHeader =
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
      const bodyToken = typeof body.token === 'string' ? body.token : undefined;

      const revoked = authService.logout({
        authorizationHeader: authHeader,
        bodyToken,
      });

      if (!revoked) {
        sendJson(res, 401, { revoked: false, error: 'INVALID_SESSION' });
        return;
      }

      sendJson(res, 200, { revoked: true });
      return;
    }

    sendJson(res, 404, { error: 'NOT_FOUND', message: 'Ruta no encontrada en auth-service.' });
  } catch (err) {
    if (err instanceof AuthError) {
      sendJson(res, err.statusCode, {
        error: err.code,
        message: err.message,
      });
      return;
    }

    logger.error('http.unhandled_error', {
      path,
      method: req.method,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });

    sendJson(res, 500, {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno en el servicio de autenticación.',
    });
  }
}
