import { env } from '../config/env.ts';
import {
  notificationStore,
  type AlertLevel,
  type NotificationFilter,
  type NotificationRecord,
} from '../models/notificationStore.ts';
import { logger } from '../utils/logger.ts';

export class NotificationError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface RemoteBudgetRecord {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  period: string;
}

/**
 * Proveedor de presupuestos: consulta los presupuestos del usuario en `budgets-service`.
 */
export type BudgetLookup = (
  authorizationHeader: string,
  category: string
) => Promise<RemoteBudgetRecord[]>;

export const fetchBudgetsFromBudgetsService: BudgetLookup = async (
  authorizationHeader,
  category
) => {
  try {
    const url = new URL('/budgets', env.budgetsServiceUrl);
    url.searchParams.set('category', category);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: authorizationHeader },
    });

    if (res.status === 401) {
      throw new NotificationError('UNAUTHORIZED', 'Sesión inválida o expirada.', 401);
    }

    if (!res.ok) {
      throw new NotificationError(
        'BUDGETS_SERVICE_ERROR',
        'No se pudieron obtener los presupuestos del usuario.',
        502
      );
    }

    const body = (await res.json()) as { budgets?: RemoteBudgetRecord[] };
    return Array.isArray(body.budgets) ? body.budgets : [];
  } catch (err) {
    if (err instanceof NotificationError) {
      throw err;
    }
    logger.error('budgets.lookup_unreachable', {
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
    throw new NotificationError(
      'BUDGETS_SERVICE_UNAVAILABLE',
      'No se pudo conectar con budgets-service.',
      503
    );
  }
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const NAMED_PERIODS = new Set(['monthly', 'weekly', 'yearly', 'mensual', 'semanal', 'anual']);
const VALID_LEVELS = new Set<AlertLevel>(['warning', 'exceeded']);

export const WARNING_THRESHOLD_PERCENT = 80;
export const EXCEEDED_THRESHOLD_PERCENT = 100;

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidPeriod(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return MONTH_PERIOD_REGEX.test(normalized) || NAMED_PERIODS.has(normalized);
}

export interface TransactionEventPayload {
  id?: unknown;
  transactionId?: unknown;
  amount?: unknown;
  category?: unknown;
  date?: unknown;
  period?: unknown;
  description?: unknown;
  transaction?: Record<string, unknown>;
}

export interface EvaluationSummary {
  budgetId: string;
  category: string;
  period: string;
  limitAmount: number;
  transactionAmount: number;
  spentAmount: number;
  percentage: number;
}

export interface TransactionEvaluationResult {
  triggered: boolean;
  level: AlertLevel | null;
  reason?: 'NO_BUDGET_FOUND' | 'BELOW_THRESHOLD';
  notification: NotificationRecord | null;
  evaluation: EvaluationSummary | null;
}

function extractEventFields(input: TransactionEventPayload): {
  transactionId?: string;
  amount: number;
  category: string;
  targetPeriod: string;
} {
  const source =
    typeof input.transaction === 'object' && input.transaction !== null
      ? { ...input, ...input.transaction }
      : input;

  if (typeof source.amount !== 'number' || !Number.isFinite(source.amount) || source.amount <= 0) {
    throw new NotificationError('INVALID_AMOUNT', 'El monto de la transacción debe ser un número mayor a 0.');
  }

  if (typeof source.category !== 'string' || source.category.trim() === '') {
    throw new NotificationError('INVALID_CATEGORY', 'La categoría de la transacción es obligatoria.');
  }

  const rawPeriod = source.period ?? input.period;
  const rawDate = source.date;

  let targetPeriod: string;
  if (rawPeriod !== undefined) {
    if (typeof rawPeriod !== 'string' || !isValidPeriod(rawPeriod)) {
      throw new NotificationError(
        'INVALID_PERIOD',
        'El periodo debe tener formato YYYY-MM (ej. 2026-10) o ser un periodo válido (monthly, weekly, yearly).'
      );
    }
    targetPeriod = rawPeriod.trim().toLowerCase();
  } else if (rawDate !== undefined) {
    if (typeof rawDate !== 'string' || !isValidDate(rawDate)) {
      throw new NotificationError(
        'INVALID_DATE',
        'La fecha de la transacción debe tener formato YYYY-MM-DD y ser válida.'
      );
    }
    targetPeriod = rawDate.slice(0, 7);
  } else {
    throw new NotificationError(
      'MISSING_DATE_OR_PERIOD',
      'Se requiere "date" (YYYY-MM-DD) o "period" (YYYY-MM / monthly) para evaluar el presupuesto.'
    );
  }

  const rawTxId = source.transactionId ?? source.id;
  const transactionId =
    typeof rawTxId === 'string' && rawTxId.trim() !== '' ? rawTxId.trim() : undefined;

  return {
    transactionId,
    amount: Math.round(source.amount * 100) / 100,
    category: source.category.trim().toLowerCase(),
    targetPeriod,
  };
}

function selectMatchingBudget(
  budgets: RemoteBudgetRecord[],
  category: string,
  targetPeriod: string
): RemoteBudgetRecord | undefined {
  const categoryBudgets = budgets.filter((b) => b.category.toLowerCase() === category);
  const exactMatch = categoryBudgets.find((b) => b.period.toLowerCase() === targetPeriod);
  if (exactMatch) return exactMatch;

  // Si la transacción trae una fecha YYYY-MM, permitir fallback a un presupuesto general mensual
  return categoryBudgets.find((b) => {
    const p = b.period.toLowerCase();
    return p === 'monthly' || p === 'mensual';
  });
}

function buildAlertMessage(
  level: AlertLevel,
  category: string,
  period: string,
  spentAmount: number,
  limitAmount: number,
  percentage: number
): string {
  if (level === 'exceeded') {
    return `Alerta de sobregasto en "${category}" (${period}): alcanzaste ${spentAmount.toFixed(2)} de ${limitAmount.toFixed(2)} (${percentage}%).`;
  }
  return `Advertencia de presupuesto en "${category}" (${period}): alcanzaste el ${percentage}% (${spentAmount.toFixed(2)} de ${limitAmount.toFixed(2)}).`;
}

export const notificationService = {
  async evaluateTransaction(
    userId: string,
    authorizationHeader: string,
    input: TransactionEventPayload,
    lookupBudgets: BudgetLookup = fetchBudgetsFromBudgetsService
  ): Promise<TransactionEvaluationResult> {
    const { transactionId, amount, category, targetPeriod } = extractEventFields(input);

    const budgets = await lookupBudgets(authorizationHeader, category);
    const matchedBudget = selectMatchingBudget(budgets, category, targetPeriod);

    if (!matchedBudget) {
      logger.info('notification.evaluation_skipped', {
        userId,
        category,
        period: targetPeriod,
        reason: 'NO_BUDGET_FOUND',
      });
      return {
        triggered: false,
        level: null,
        reason: 'NO_BUDGET_FOUND',
        notification: null,
        evaluation: null,
      };
    }

    const effectivePeriod = matchedBudget.period.toLowerCase();
    const spentAmount = notificationStore.recordSpend(
      userId,
      category,
      effectivePeriod,
      amount,
      transactionId
    );
    const percentage = Math.round((spentAmount / matchedBudget.limitAmount) * 10000) / 100;

    const evaluation: EvaluationSummary = {
      budgetId: matchedBudget.id,
      category,
      period: effectivePeriod,
      limitAmount: matchedBudget.limitAmount,
      transactionAmount: amount,
      spentAmount,
      percentage,
    };

    let level: AlertLevel | null = null;
    if (percentage >= EXCEEDED_THRESHOLD_PERCENT) {
      level = 'exceeded';
    } else if (percentage >= WARNING_THRESHOLD_PERCENT) {
      level = 'warning';
    }

    if (!level) {
      logger.info('notification.evaluation_ok', {
        userId,
        budgetId: matchedBudget.id,
        category,
        period: effectivePeriod,
        percentage,
      });
      return {
        triggered: false,
        level: null,
        reason: 'BELOW_THRESHOLD',
        notification: null,
        evaluation,
      };
    }

    const notification = notificationStore.create({
      userId,
      budgetId: matchedBudget.id,
      ...(transactionId ? { transactionId } : {}),
      category,
      period: effectivePeriod,
      level,
      transactionAmount: amount,
      spentAmount,
      limitAmount: matchedBudget.limitAmount,
      percentage,
      message: buildAlertMessage(
        level,
        category,
        effectivePeriod,
        spentAmount,
        matchedBudget.limitAmount,
        percentage
      ),
    });

    logger.info('notification.triggered', {
      notificationId: notification.id,
      userId,
      budgetId: matchedBudget.id,
      category,
      period: effectivePeriod,
      level,
      percentage,
    });

    return {
      triggered: true,
      level,
      notification,
      evaluation,
    };
  },

  list(
    userId: string,
    filter: { category?: string; period?: string; level?: string } = {}
  ): NotificationRecord[] {
    if (filter.period !== undefined && !isValidPeriod(filter.period)) {
      throw new NotificationError(
        'INVALID_PERIOD',
        'El filtro "period" debe tener formato YYYY-MM o ser un periodo válido.'
      );
    }

    let normalizedLevel: AlertLevel | undefined;
    if (filter.level !== undefined) {
      const candidate = filter.level.trim().toLowerCase() as AlertLevel;
      if (!VALID_LEVELS.has(candidate)) {
        throw new NotificationError(
          'INVALID_LEVEL',
          'El filtro "level" debe ser "warning" o "exceeded".'
        );
      }
      normalizedLevel = candidate;
    }

    const parsedFilter: NotificationFilter = {
      category: filter.category?.trim().toLowerCase() || undefined,
      period: filter.period?.trim().toLowerCase() || undefined,
      level: normalizedLevel,
    };

    return notificationStore.listByUser(userId, parsedFilter);
  },
};
