export type TransactionType = 'income' | 'expense';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  notes?: string;
}

export interface BudgetSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  activeBudgetsCount: number;
}
