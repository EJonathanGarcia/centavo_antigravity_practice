import crypto from 'node:crypto';

export type AlertLevel = 'warning' | 'exceeded';

export interface NotificationRecord {
  id: string;
  userId: string;
  budgetId: string;
  transactionId?: string;
  category: string;
  period: string;
  level: AlertLevel;
  transactionAmount: number;
  spentAmount: number;
  limitAmount: number;
  percentage: number;
  message: string;
  createdAt: string;
}

export interface NotificationFilter {
  category?: string;
  period?: string;
  level?: AlertLevel;
}

class NotificationStore {
  private notificationsById = new Map<string, NotificationRecord>();
  private accumulatedSpendByKey = new Map<string, number>();
  private processedTransactionKeys = new Set<string>();

  private buildSpendKey(userId: string, category: string, period: string): string {
    return `${userId}::${category}::${period}`;
  }

  /**
   * Acumula el monto de una transacción en memoria para (userId, category, period)
   * y devuelve el total acumulado redondeado a 2 decimales.
   * Si se proporciona `transactionId` y ya fue procesado para ese usuario, no duplica el cargo.
   */
  recordSpend(
    userId: string,
    category: string,
    period: string,
    amount: number,
    transactionId?: string
  ): number {
    const spendKey = this.buildSpendKey(userId, category, period);

    if (transactionId) {
      const txKey = `${userId}::${transactionId}`;
      if (this.processedTransactionKeys.has(txKey)) {
        return this.accumulatedSpendByKey.get(spendKey) ?? 0;
      }
      this.processedTransactionKeys.add(txKey);
    }

    const current = this.accumulatedSpendByKey.get(spendKey) ?? 0;
    const updated = Math.round((current + amount) * 100) / 100;
    this.accumulatedSpendByKey.set(spendKey, updated);
    return updated;
  }

  getSpent(userId: string, category: string, period: string): number {
    return this.accumulatedSpendByKey.get(this.buildSpendKey(userId, category, period)) ?? 0;
  }

  create(input: Omit<NotificationRecord, 'id' | 'createdAt'>): NotificationRecord {
    const record: NotificationRecord = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.notificationsById.set(record.id, record);
    return record;
  }

  /** Lista las alertas de un usuario, de la más reciente a la más antigua. */
  listByUser(userId: string, filter: NotificationFilter = {}): NotificationRecord[] {
    return [...this.notificationsById.values()]
      .filter((n) => n.userId === userId)
      .filter((n) => !filter.category || n.category === filter.category)
      .filter((n) => !filter.period || n.period === filter.period)
      .filter((n) => !filter.level || n.level === filter.level)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  clear(): void {
    this.notificationsById.clear();
    this.accumulatedSpendByKey.clear();
    this.processedTransactionKeys.clear();
  }
}

export const notificationStore = new NotificationStore();
