import type { ExpenseCategory } from './database';

export type BudgetCategory = ExpenseCategory | 'total';

export interface TripBudget {
  id: string;
  trip_id: string;
  category: BudgetCategory;
  amount: number;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithSpending extends TripBudget {
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

export interface BudgetSummary {
  totalBudget: number | null;
  totalSpent: number;
  categoryBudgets: BudgetWithSpending[];
  currency: string;
}
