import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createNotificationsServer } from '../index.ts';
import { notificationStore } from '../models/notificationStore.ts';
import type { SessionVerifier } from '../middleware/authMiddleware.ts';
import type { BudgetLookup, RemoteBudgetRecord } from '../services/notificationService.ts';

const fakeVerify: SessionVerifier = async (header) => {
  if (header === 'Bearer token-ana') return { userId: 'user-ana' };
  if (header === 'Bearer token-beto') return { userId: 'user-beto' };
  return null;
};

const fakeBudgetsByToken: Record<string, RemoteBudgetRecord[]> = {
  'Bearer token-ana': [
    {
      id: 'budget-comida-oct',
      userId: 'user-ana',
      category: 'comida',
      limitAmount: 500,
      period: '2026-10',
    },
    {
      id: 'budget-transporte-monthly',
      userId: 'user-ana',
      category: 'transporte',
      limitAmount: 200,
      period: 'monthly',
    },
  ],
  'Bearer token-beto': [
    {
      id: 'budget-comida-beto',
      userId: 'user-beto',
      category: 'comida',
      limitAmount: 300,
      period: '2026-10',
    },
  ],
};

const fakeLookupBudgets: BudgetLookup = async (authHeader, category) => {
  const list = fakeBudgetsByToken[authHeader] ?? [];
  return list.filter((b) => b.category === category);
};

async function withServer(
  fn: (baseUrl: string) => Promise<void>,
  lookup: BudgetLookup = fakeLookupBudgets
): Promise<void> {
  const server = createNotificationsServer(fakeVerify, lookup);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function postTransactionEvent(
  baseUrl: string,
  token: string | null,
  body: unknown
): Promise<Response> {
  return fetch(`${baseUrl}/notifications/events/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('notifications-service — evaluación de transacciones y alertas de sobregasto', () => {
  beforeEach(() => notificationStore.clear());

  it('no genera alerta cuando el gasto acumulado está por debajo del 80% del presupuesto', async () => {
    await withServer(async (baseUrl) => {
      const res = await postTransactionEvent(baseUrl, 'token-ana', {
        transactionId: 'tx-1',
        amount: 250,
        category: 'Comida',
        date: '2026-10-12',
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        triggered: boolean;
        level: string | null;
        reason: string;
        notification: unknown;
        evaluation: { percentage: number; spentAmount: number; limitAmount: number };
      };
      assert.equal(body.triggered, false);
      assert.equal(body.level, null);
      assert.equal(body.reason, 'BELOW_THRESHOLD');
      assert.equal(body.notification, null);
      assert.equal(body.evaluation.percentage, 50);
      assert.equal(body.evaluation.spentAmount, 250);
      assert.equal(body.evaluation.limitAmount, 500);
    });
  });

  it('genera alerta "warning" al alcanzar el 80% y alerta "exceeded" al alcanzar o superar el 100%', async () => {
    await withServer(async (baseUrl) => {
      // 1ra transacción: 400 / 500 = 80% -> warning
      const warningRes = await postTransactionEvent(baseUrl, 'token-ana', {
        transaction: {
          id: 'tx-warn',
          amount: 400,
          category: 'comida',
          date: '2026-10-15',
        },
      });
      assert.equal(warningRes.status, 201);
      const warningBody = (await warningRes.json()) as {
        triggered: boolean;
        level: string;
        notification: { id: string; level: string; percentage: number; spentAmount: number };
      };
      assert.equal(warningBody.triggered, true);
      assert.equal(warningBody.level, 'warning');
      assert.equal(warningBody.notification.level, 'warning');
      assert.equal(warningBody.notification.percentage, 80);
      assert.equal(warningBody.notification.spentAmount, 400);

      // 2da transacción: +125 = 525 / 500 = 105% -> exceeded
      const exceededRes = await postTransactionEvent(baseUrl, 'token-ana', {
        transactionId: 'tx-exceed',
        amount: 125,
        category: 'comida',
        date: '2026-10-18',
      });
      assert.equal(exceededRes.status, 201);
      const exceededBody = (await exceededRes.json()) as {
        triggered: boolean;
        level: string;
        notification: { level: string; percentage: number; spentAmount: number };
      };
      assert.equal(exceededBody.triggered, true);
      assert.equal(exceededBody.level, 'exceeded');
      assert.equal(exceededBody.notification.percentage, 105);
      assert.equal(exceededBody.notification.spentAmount, 525);

      // Listado y filtrado por nivel y usuario
      const allRes = await fetch(`${baseUrl}/notifications`, {
        headers: { Authorization: 'Bearer token-ana' },
      });
      assert.equal(allRes.status, 200);
      const allList = (await allRes.json()) as { count: number; notifications: { level: string }[] };
      assert.equal(allList.count, 2);

      const exceededOnlyRes = await fetch(`${baseUrl}/notifications?level=exceeded`, {
        headers: { Authorization: 'Bearer token-ana' },
      });
      const exceededOnly = (await exceededOnlyRes.json()) as {
        count: number;
        notifications: { level: string }[];
      };
      assert.equal(exceededOnly.count, 1);
      assert.equal(exceededOnly.notifications[0].level, 'exceeded');

      // Aislamiento entre usuarios
      const betoRes = await fetch(`${baseUrl}/notifications`, {
        headers: { Authorization: 'Bearer token-beto' },
      });
      const betoList = (await betoRes.json()) as { count: number };
      assert.equal(betoList.count, 0);
    });
  });

  it('hace fallback a presupuesto "monthly" si no existe uno exacto YYYY-MM y omite categorías sin presupuesto', async () => {
    await withServer(async (baseUrl) => {
      const monthlyFallback = await postTransactionEvent(baseUrl, 'token-ana', {
        amount: 200,
        category: 'transporte',
        date: '2026-10-19',
      });
      assert.equal(monthlyFallback.status, 201);
      const fallbackBody = (await monthlyFallback.json()) as {
        triggered: boolean;
        level: string;
        evaluation: { period: string; percentage: number };
      };
      assert.equal(fallbackBody.triggered, true);
      assert.equal(fallbackBody.level, 'exceeded');
      assert.equal(fallbackBody.evaluation.period, 'monthly');
      assert.equal(fallbackBody.evaluation.percentage, 100);

      const noBudgetRes = await postTransactionEvent(baseUrl, 'token-ana', {
        amount: 999,
        category: 'videojuegos',
        date: '2026-10-19',
      });
      assert.equal(noBudgetRes.status, 200);
      const noBudgetBody = (await noBudgetRes.json()) as {
        triggered: boolean;
        reason: string;
        notification: null;
      };
      assert.equal(noBudgetBody.triggered, false);
      assert.equal(noBudgetBody.reason, 'NO_BUDGET_FOUND');
      assert.equal(noBudgetBody.notification, null);
    });
  });

  it('rechaza peticiones sin sesión válida y valida los campos de entrada', async () => {
    await withServer(async (baseUrl) => {
      assert.equal(
        (await postTransactionEvent(baseUrl, null, { amount: 100, category: 'comida', date: '2026-10-10' }))
          .status,
        401
      );
      assert.equal(
        (await postTransactionEvent(baseUrl, 'token-invalido', { amount: 100, category: 'comida', date: '2026-10-10' }))
          .status,
        401
      );
      assert.equal((await fetch(`${baseUrl}/notifications`)).status, 401);

      const invalidCases: [unknown, string][] = [
        [{ amount: -10, category: 'comida', date: '2026-10-10' }, 'INVALID_AMOUNT'],
        [{ amount: 100, category: '  ', date: '2026-10-10' }, 'INVALID_CATEGORY'],
        [{ amount: 100, category: 'comida', date: '2026-02-30' }, 'INVALID_DATE'],
        [{ amount: 100, category: 'comida', period: '2026-13' }, 'INVALID_PERIOD'],
        [{ amount: 100, category: 'comida' }, 'MISSING_DATE_OR_PERIOD'],
      ];

      for (const [payload, expectedCode] of invalidCases) {
        const res = await postTransactionEvent(baseUrl, 'token-ana', payload);
        assert.equal(res.status, 400);
        const errBody = (await res.json()) as { error: string };
        assert.equal(errBody.error, expectedCode);
      }

      const badFilterRes = await fetch(`${baseUrl}/notifications?level=critical`, {
        headers: { Authorization: 'Bearer token-ana' },
      });
      assert.equal(badFilterRes.status, 400);
      assert.equal(((await badFilterRes.json()) as { error: string }).error, 'INVALID_LEVEL');
    });
  });

  it('evita duplicar el gasto acumulado cuando se reenvía el mismo transactionId (idempotencia)', async () => {
    await withServer(async (baseUrl) => {
      const payload = {
        transactionId: 'tx-idem-1',
        amount: 300,
        category: 'comida',
        date: '2026-10-19',
      };

      const firstRes = await postTransactionEvent(baseUrl, 'token-ana', payload);
      assert.equal(firstRes.status, 200);
      const firstBody = (await firstRes.json()) as { evaluation: { spentAmount: number; percentage: number } };
      assert.equal(firstBody.evaluation.spentAmount, 300);
      assert.equal(firstBody.evaluation.percentage, 60);

      const duplicateRes = await postTransactionEvent(baseUrl, 'token-ana', payload);
      assert.equal(duplicateRes.status, 200);
      const duplicateBody = (await duplicateRes.json()) as {
        triggered: boolean;
        evaluation: { spentAmount: number; percentage: number };
      };
      assert.equal(duplicateBody.triggered, false);
      assert.equal(duplicateBody.evaluation.spentAmount, 300);
      assert.equal(duplicateBody.evaluation.percentage, 60);
    });
  });
});

