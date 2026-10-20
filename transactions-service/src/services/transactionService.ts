import {
  transactionStore,
  type TransactionFilter,
  type TransactionRecord,
} from '../models/transactionStore.ts';
import { logger } from '../utils/logger.ts';

export class TransactionError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'TransactionError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface CreateTransactionInput {
  amount?: unknown;
  category?: unknown;
  date?: unknown;
  description?: unknown;
}

export const transactionService = {
  create(userId: string, input: CreateTransactionInput): TransactionRecord {
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
      throw new TransactionError('INVALID_AMOUNT', 'El monto debe ser un número mayor a 0.');
    }
    if (typeof input.category !== 'string' || input.category.trim() === '') {
      throw new TransactionError('INVALID_CATEGORY', 'La categoría es obligatoria.');
    }
    if (typeof input.date !== 'string' || !isValidDate(input.date)) {
      throw new TransactionError('INVALID_DATE', 'La fecha debe tener formato YYYY-MM-DD y ser válida.');
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      throw new TransactionError('INVALID_DESCRIPTION', 'La descripción debe ser texto.');
    }

    const record = transactionStore.create({
      userId,
      amount: Math.round(input.amount * 100) / 100,
      category: input.category.trim().toLowerCase(),
      date: input.date,
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    });

    logger.info('transaction.created', {
      transactionId: record.id,
      userId,
      category: record.category,
    });
    return record;
  },

  list(userId: string, filter: TransactionFilter = {}): TransactionRecord[] {
    for (const key of ['from', 'to'] as const) {
      const value = filter[key];
      if (value !== undefined && !isValidDate(value)) {
        throw new TransactionError('INVALID_DATE', `El filtro "${key}" debe tener formato YYYY-MM-DD.`);
      }
    }
    return transactionStore.listByUser(userId, {
      ...filter,
      category: filter.category?.trim().toLowerCase() || undefined,
    });
  },
};
