import { Transaction } from '../types';

export interface BackendTransaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  createdAt: string;
}

const TRANSACTIONS_BASE_URL = '/api/transactions';

function formatCategoryLabel(rawCategory: string): string {
  const trimmed = rawCategory.trim();
  if (!trimmed) return 'Otros Gastos';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function mapBackendToFrontend(tx: BackendTransaction, fallbackType: 'income' | 'expense' = 'expense'): Transaction {
  return {
    id: tx.id,
    description: tx.description || formatCategoryLabel(tx.category),
    amount: tx.amount,
    type: fallbackType,
    category: formatCategoryLabel(tx.category),
    date: tx.date,
  };
}

export const transactionsApi = {
  async list(token: string): Promise<Transaction[]> {
    const res = await fetch(`${TRANSACTIONS_BASE_URL}/transactions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error('No se pudieron obtener las transacciones.');
    }
    const data = (await res.json()) as { transactions: BackendTransaction[] };
    return (data.transactions ?? []).map((tx) => mapBackendToFrontend(tx, 'expense'));
  },

  async create(
    token: string,
    input: Omit<Transaction, 'id'>
  ): Promise<Transaction> {
    const res = await fetch(`${TRANSACTIONS_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amount,
        category: input.category,
        date: input.date,
        description: input.description,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Error al registrar la transacción.');
    }

    const data = (await res.json()) as { transaction: BackendTransaction };
    const mapped = mapBackendToFrontend(data.transaction, input.type);
    return {
      ...mapped,
      category: formatCategoryLabel(data.transaction.category),
      notes: input.notes,
    };
  },
};
