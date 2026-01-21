import type { Expense, ExpenseSplit, ExpenseCategory } from './database';

export type ExpenseResult = {
  error?: string;
  success?: boolean;
  expenseId?: string;
};

export type ExpenseWithDetails = Expense & {
  paid_by_user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  created_by_user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  expense_splits: (ExpenseSplit & {
    users: {
      id: string;
      name: string;
      avatar_url: string | null;
    };
  })[];
};

export type CreateExpenseInput = {
  trip_id: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
  category: ExpenseCategory;
  paid_by: string;
  notes?: string | null;
  splits: {
    user_id: string;
    amount: number;
    percentage?: number | null;
  }[];
};

export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'trip_id'>>;
