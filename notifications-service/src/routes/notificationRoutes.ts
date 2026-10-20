import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  notificationService,
  NotificationError,
  fetchBudgetsFromBudgetsService,
  type BudgetLookup,
} from '../services/notificationService.ts';
import { requireAuthenticatedUser, type SessionVerifier } from '../middleware/authMiddleware.ts';
import { logger } from '../utils/logger.ts';

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
      if (raw.length > 1024 * 64) {
        reject(
          new NotificationError(
            'PAYLOAD_TOO_LARGE',
            'El cuerpo de la petición excede el límite permitido.',
            413
          )
        );
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
        reject(
          new NotificationError('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.', 400)
        );
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

export async function handleNotificationRequest(
  req: IncomingMessage,
  res: ServerResponse,
  verify: SessionVerifier,
  lookupBudgets: BudgetLookup = fetchBudgetsFromBudgetsService
): Promise<void> {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { status: 'ok', service: 'notifications-service' });
      return;
    }

    if (req.method === 'POST' && path === '/notifications/events/transaction') {
      const { userId, authorizationHeader } = await requireAuthenticatedUser(req, verify);
      const body = await readJsonBody(req);
      const result = await notificationService.evaluateTransaction(
        userId,
        authorizationHeader,
        body,
        lookupBudgets
      );
      sendJson(res, result.triggered ? 201 : 200, result);
      return;
    }

    if (req.method === 'GET' && path === '/notifications') {
      const { userId } = await requireAuthenticatedUser(req, verify);
      const notifications = notificationService.list(userId, {
        category: url.searchParams.get('category') ?? undefined,
        period: url.searchParams.get('period') ?? undefined,
        level: url.searchParams.get('level') ?? undefined,
      });
      sendJson(res, 200, { notifications, count: notifications.length });
      return;
    }

    sendJson(res, 404, {
      error: 'NOT_FOUND',
      message: 'Ruta no encontrada en notifications-service.',
    });
  } catch (err) {
    if (err instanceof NotificationError) {
      sendJson(res, err.statusCode, { error: err.code, message: err.message });
      return;
    }

    logger.error('http.unhandled_error', {
      path,
      method: req.method,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });

    sendJson(res, 500, {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno en el servicio de notificaciones.',
    });
  }
}
