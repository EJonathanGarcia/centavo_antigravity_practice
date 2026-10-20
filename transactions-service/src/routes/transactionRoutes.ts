import type { IncomingMessage, ServerResponse } from 'node:http';
import { transactionService, TransactionError } from '../services/transactionService.ts';
import { requireAuthenticatedUser, type SessionVerifier } from '../middleware/authMiddleware.ts';
import { logger } from '../utils/logger.ts';

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
      if (raw.length > 1024 * 64) {
        reject(new TransactionError('PAYLOAD_TOO_LARGE', 'El cuerpo de la petición excede el límite permitido.', 413));
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
        reject(new TransactionError('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.', 400));
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

export async function handleTransactionRequest(
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
      sendJson(res, 200, { status: 'ok', service: 'transactions-service' });
      return;
    }

    if (req.method === 'POST' && path === '/transactions') {
      const userId = await requireAuthenticatedUser(req, verify);
      const body = await readJsonBody(req);
      const transaction = transactionService.create(userId, {
        amount: body.amount,
        category: body.category,
        date: body.date,
        description: body.description,
      });
      sendJson(res, 201, { transaction });
      return;
    }

    if (req.method === 'GET' && path === '/transactions') {
      const userId = await requireAuthenticatedUser(req, verify);
      const transactions = transactionService.list(userId, {
        category: url.searchParams.get('category') ?? undefined,
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
      });
      sendJson(res, 200, { transactions, count: transactions.length });
      return;
    }

    sendJson(res, 404, { error: 'NOT_FOUND', message: 'Ruta no encontrada en transactions-service.' });
  } catch (err) {
    if (err instanceof TransactionError) {
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
      message: 'Error interno en el servicio de transacciones.',
    });
  }
}
