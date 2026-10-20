import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createTransactionsServer } from '../index.ts';
import { transactionStore } from '../models/transactionStore.ts';
import type { SessionVerifier } from '../middleware/authMiddleware.ts';

const fakeVerify: SessionVerifier = async (header) => {
  if (header === 'Bearer token-ana') return { userId: 'user-ana' };
  if (header === 'Bearer token-beto') return { userId: 'user-beto' };
  return null;
};

async function withServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createTransactionsServer(fakeVerify);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function post(baseUrl: string, token: string | null, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('transactions-service — crear y listar transacciones', () => {
  beforeEach(() => transactionStore.clear());

  it('crea una transacción y la lista, aislada por usuario', async () => {
    await withServer(async (baseUrl) => {
      const created = await post(baseUrl, 'token-ana', { amount: 120.5, category: 'Comida', date: '2026-10-15' });
      assert.equal(created.status, 201);
      const { transaction } = (await created.json()) as { transaction: { id: string; category: string; amount: number } };
      assert.ok(transaction.id);
      assert.equal(transaction.category, 'comida');
      assert.equal(transaction.amount, 120.5);

      await post(baseUrl, 'token-beto', { amount: 10, category: 'transporte', date: '2026-10-14' });

      const listRes = await fetch(`${baseUrl}/transactions`, { headers: { Authorization: 'Bearer token-ana' } });
      assert.equal(listRes.status, 200);
      const list = (await listRes.json()) as { count: number; transactions: { userId: string }[] };
      assert.equal(list.count, 1);
      assert.equal(list.transactions[0].userId, 'user-ana');
    });
  });

  it('filtra por categoría y rango de fechas', async () => {
    await withServer(async (baseUrl) => {
      await post(baseUrl, 'token-ana', { amount: 1, category: 'comida', date: '2026-10-01' });
      await post(baseUrl, 'token-ana', { amount: 2, category: 'comida', date: '2026-10-20' });
      await post(baseUrl, 'token-ana', { amount: 3, category: 'ocio', date: '2026-10-20' });

      const res = await fetch(`${baseUrl}/transactions?category=comida&from=2026-10-10`, {
        headers: { Authorization: 'Bearer token-ana' },
      });
      const body = (await res.json()) as { count: number };
      assert.equal(body.count, 1);
    });
  });

  it('rechaza peticiones sin sesión válida', async () => {
    await withServer(async (baseUrl) => {
      assert.equal((await post(baseUrl, null, { amount: 1, category: 'x', date: '2026-10-01' })).status, 401);
      assert.equal((await post(baseUrl, 'bad', { amount: 1, category: 'x', date: '2026-10-01' })).status, 401);
      assert.equal((await fetch(`${baseUrl}/transactions`)).status, 401);
    });
  });

  it('valida monto, categoría y fecha', async () => {
    await withServer(async (baseUrl) => {
      const cases: [unknown, string][] = [
        [{ amount: -5, category: 'a', date: '2026-10-01' }, 'INVALID_AMOUNT'],
        [{ amount: '5', category: 'a', date: '2026-10-01' }, 'INVALID_AMOUNT'],
        [{ amount: 5, category: ' ', date: '2026-10-01' }, 'INVALID_CATEGORY'],
        [{ amount: 5, category: 'a', date: '2026-02-31' }, 'INVALID_DATE'],
        [{ amount: 5, category: 'a' }, 'INVALID_DATE'],
      ];
      for (const [body, code] of cases) {
        const res = await post(baseUrl, 'token-ana', body);
        assert.equal(res.status, 400);
        assert.equal(((await res.json()) as { error: string }).error, code);
      }
    });
  });
});
