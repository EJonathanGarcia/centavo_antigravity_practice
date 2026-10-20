import type { IncomingMessage, ServerResponse } from 'node:http';
import { budgetService, BudgetError } from '../services/budgetService.ts';
import { requireAuthenticatedUser, type SessionVerifier } from '../middleware/authMiddleware.ts';
import { logger } from '../utils/logger.ts';

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
      if (raw.length > 1024 * 64) {
        reject(new BudgetError('PAYLOAD_TOO_LARGE', 'El cuerpo de la petición excede el límite permitido.', 413));
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
        reject(new BudgetError('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.', 400));
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

export async function handleBudgetRequest(
  req: IncomingMessage,
  res: ServerResponse,
  verify: SessionVerifier
): Promise<void> {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { status: 'ok', service: 'budgets-service' });
      return;
    }

    if (req.method === 'POST' && path === '/budgets') {
      const userId = await requireAuthenticatedUser(req, verify);
      const body = await readJsonBody(req);
      const budget = budgetService.create(userId, {
        category: body.category,
        limitAmount: body.limitAmount,
        amount: body.amount,
        period: body.period,
      });
      sendJson(res, 201, { budget });
      return;
    }

    if (req.method === 'GET' && path === '/budgets') {
      const userId = await requireAuthenticatedUser(req, verify);
      const budgets = budgetService.list(userId, {
        category: url.searchParams.get('category') ?? undefined,
        period: url.searchParams.get('period') ?? undefined,
      });
      sendJson(res, 200, { budgets, count: budgets.length });
      return;
    }

    sendJson(res, 404, { error: 'NOT_FOUND', message: 'Ruta no encontrada en budgets-service.' });
  } catch (err) {
    if (err instanceof BudgetError) {
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
      message: 'Error interno en el servicio de presupuestos.',
    });
  }
}
