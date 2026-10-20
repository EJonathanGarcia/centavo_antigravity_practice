import crypto from 'node:crypto';

export interface BudgetRecord {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  /** Periodo del presupuesto (ej. YYYY-MM o monthly/weekly/yearly) */
  period: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetFilter {
  category?: string;
  period?: string;
}

class BudgetStore {
  private budgetsById = new Map<string, BudgetRecord>();
  private budgetIdByCompositeKey = new Map<string, string>();

  private buildKey(userId: string, category: string, period: string): string {
    return `${userId}::${category}::${period}`;
  }

  /**
   * Crea o actualiza el presupuesto de un usuario para una categoría y periodo dados.
   */
  upsert(input: Omit<BudgetRecord, 'id' | 'createdAt' | 'updatedAt'>): BudgetRecord {
    const compositeKey = this.buildKey(input.userId, input.category, input.period);
    const existingId = this.budgetIdByCompositeKey.get(compositeKey);
    const now = new Date().toISOString();

    if (existingId) {
      const existing = this.budgetsById.get(existingId);
      if (existing) {
        const updated: BudgetRecord = {
          ...existing,
          limitAmount: input.limitAmount,
          updatedAt: now,
        };
        this.budgetsById.set(existing.id, updated);
        return updated;
      }
    }

    const record: BudgetRecord = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.budgetsById.set(record.id, record);
    this.budgetIdByCompositeKey.set(compositeKey, record.id);
    return record;
  }

  /** Lista los presupuestos de un usuario, ordenados por periodo y categoría. */
  listByUser(userId: string, filter: BudgetFilter = {}): BudgetRecord[] {
    return [...this.budgetsById.values()]
      .filter((b) => b.userId === userId)
      .filter((b) => !filter.category || b.category === filter.category)
      .filter((b) => !filter.period || b.period === filter.period)
      .sort((a, b) => b.period.localeCompare(a.period) || a.category.localeCompare(b.category));
  }

  clear(): void {
    this.budgetsById.clear();
    this.budgetIdByCompositeKey.clear();
  }
}

export const budgetStore = new BudgetStore();
