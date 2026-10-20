import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createBudgetsServer } from '../index.ts';
import { budgetStore } from '../models/budgetStore.ts';
import type { SessionVerifier } from '../middleware/authMiddleware.ts';

const fakeVerify: SessionVerifier = async (header) => {
  if (header === 'Bearer token-ana') return { userId: 'user-ana' };
  if (header === 'Bearer token-beto') return { userId: 'user-beto' };
  return null;
};

async function withServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createBudgetsServer(fakeVerify);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function post(baseUrl: string, token: string | null, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/budgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('budgets-service — crear y consultar presupuestos', () => {
  beforeEach(() => budgetStore.clear());

  it('crea un presupuesto por categoría y lo lista aislado por usuario', async () => {
    await withServer(async (baseUrl) => {
      const created = await post(baseUrl, 'token-ana', {
        category: 'Comida',
        limitAmount: 450.75,
        period: '2026-10',
      });
      assert.equal(created.status, 201);
      const { budget } = (await created.json()) as {
        budget: { id: string; category: string; limitAmount: number; period: string };
      };
      assert.ok(budget.id);
      assert.equal(budget.category, 'comida');
      assert.equal(budget.limitAmount, 450.75);
      assert.equal(budget.period, '2026-10');

      await post(baseUrl, 'token-beto', {
        category: 'transporte',
        limitAmount: 150,
        period: '2026-10',
      });

      const listRes = await fetch(`${baseUrl}/budgets`, {
        headers: { Authorization: 'Bearer token-ana' },
      });
      assert.equal(listRes.status, 200);
      const list = (await listRes.json()) as { count: number; budgets: { userId: string }[] };
      assert.equal(list.count, 1);
      assert.equal(list.budgets[0].userId, 'user-ana');
    });
  });

  it('actualiza el límite si se vuelve a definir la misma categoría y periodo, y filtra por categoría/periodo', async () => {
    await withServer(async (baseUrl) => {
      await post(baseUrl, 'token-ana', { category: 'comida', limitAmount: 300, period: '2026-10' });
      await post(baseUrl, 'token-ana', { category: 'comida', limitAmount: 500, period: '2026-10' });
      await post(baseUrl, 'token-ana', { category: 'ocio', limitAmount: 200, period: '2026-10' });
      await post(baseUrl, 'token-ana', { category: 'comida', limitAmount: 350, period: '2026-11' });

      const res = await fetch(`${baseUrl}/budgets?category=comida&period=2026-10`, {
        headers: { Authorization: 'Bearer token-ana' },
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { count: number; budgets: { limitAmount: number }[] };
      assert.equal(body.count, 1);
      assert.equal(body.budgets[0].limitAmount, 500);
    });
  });

  it('rechaza peticiones sin sesión válida', async () => {
    await withServer(async (baseUrl) => {
      assert.equal(
        (await post(baseUrl, null, { category: 'comida', limitAmount: 100, period: '2026-10' })).status,
        401
      );
      assert.equal(
        (await post(baseUrl, 'bad', { category: 'comida', limitAmount: 100, period: '2026-10' })).status,
        401
      );
      assert.equal((await fetch(`${baseUrl}/budgets`)).status, 401);
    });
  });

  it('valida categoría, monto límite y periodo', async () => {
    await withServer(async (baseUrl) => {
      const cases: [unknown, string][] = [
        [{ category: ' ', limitAmount: 100, period: '2026-10' }, 'INVALID_CATEGORY'],
        [{ category: 'comida', limitAmount: -10, period: '2026-10' }, 'INVALID_LIMIT_AMOUNT'],
        [{ category: 'comida', limitAmount: '100', period: '2026-10' }, 'INVALID_LIMIT_AMOUNT'],
        [{ category: 'comida', limitAmount: 100, period: '2026-13' }, 'INVALID_PERIOD'],
        [{ category: 'comida', limitAmount: 100 }, 'INVALID_PERIOD'],
      ];
      for (const [body, code] of cases) {
        const res = await post(baseUrl, 'token-ana', body);
        assert.equal(res.status, 400);
        assert.equal(((await res.json()) as { error: string }).error, code);
      }
    });
  });
});
