import crypto from 'node:crypto';

export interface TransactionRecord {
  id: string;
  userId: string;
  amount: number;
  category: string;
  /** Fecha del gasto en formato YYYY-MM-DD */
  date: string;
  description?: string;
  createdAt: string;
}

export interface TransactionFilter {
  category?: string;
  from?: string;
  to?: string;
}

class TransactionStore {
  private transactionsById = new Map<string, TransactionRecord>();

  create(input: Omit<TransactionRecord, 'id' | 'createdAt'>): TransactionRecord {
    const record: TransactionRecord = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.transactionsById.set(record.id, record);
    return record;
  }

  /** Lista las transacciones de un usuario, de la más reciente a la más antigua. */
  listByUser(userId: string, filter: TransactionFilter = {}): TransactionRecord[] {
    return [...this.transactionsById.values()]
      .filter((t) => t.userId === userId)
      .filter((t) => !filter.category || t.category === filter.category)
      .filter((t) => !filter.from || t.date >= filter.from)
      .filter((t) => !filter.to || t.date <= filter.to)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  clear(): void {
    this.transactionsById.clear();
  }
}

export const transactionStore = new TransactionStore();
