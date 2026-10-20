import {
  budgetStore,
  type BudgetFilter,
  type BudgetRecord,
} from '../models/budgetStore.ts';
import { logger } from '../utils/logger.ts';

export class BudgetError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'BudgetError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const MONTH_PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const NAMED_PERIODS = new Set(['monthly', 'weekly', 'yearly', 'mensual', 'semanal', 'anual']);

function isValidPeriod(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return MONTH_PERIOD_REGEX.test(normalized) || NAMED_PERIODS.has(normalized);
}

export interface CreateBudgetInput {
  category?: unknown;
  limitAmount?: unknown;
  amount?: unknown;
  period?: unknown;
}

export const budgetService = {
  create(userId: string, input: CreateBudgetInput): BudgetRecord {
    if (typeof input.category !== 'string' || input.category.trim() === '') {
      throw new BudgetError('INVALID_CATEGORY', 'La categoría es obligatoria.');
    }

    const rawLimit = input.limitAmount !== undefined ? input.limitAmount : input.amount;
    if (typeof rawLimit !== 'number' || !Number.isFinite(rawLimit) || rawLimit <= 0) {
      throw new BudgetError('INVALID_LIMIT_AMOUNT', 'El monto límite debe ser un número mayor a 0.');
    }

    if (typeof input.period !== 'string' || !isValidPeriod(input.period)) {
      throw new BudgetError(
        'INVALID_PERIOD',
        'El periodo debe tener formato YYYY-MM (ej. 2026-10) o ser un periodo válido (monthly, weekly, yearly).'
      );
    }

    const record = budgetStore.upsert({
      userId,
      category: input.category.trim().toLowerCase(),
      limitAmount: Math.round(rawLimit * 100) / 100,
      period: input.period.trim().toLowerCase(),
    });

    logger.info('budget.upserted', {
      budgetId: record.id,
      userId,
      category: record.category,
      period: record.period,
    });
    return record;
  },

  list(userId: string, filter: BudgetFilter = {}): BudgetRecord[] {
    if (filter.period !== undefined && !isValidPeriod(filter.period)) {
      throw new BudgetError(
        'INVALID_PERIOD',
        'El filtro "period" debe tener formato YYYY-MM o ser un periodo válido.'
      );
    }

    return budgetStore.listByUser(userId, {
      category: filter.category?.trim().toLowerCase() || undefined,
      period: filter.period?.trim().toLowerCase() || undefined,
    });
  },
};
