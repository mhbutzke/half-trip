'use server';

import { createClient } from './server';
import { revalidate } from '@/lib/utils/revalidation';
import type { TripBudget, BudgetWithSpending, BudgetSummary } from '@/types/budget';
import type { ExpenseCategory } from '@/types/database';
import { logActivity } from '@/lib/supabase/activity-log';

export type BudgetResult = {
  error?: string;
  success?: boolean;
  budgetId?: string;
};

export async function getTripBudgets(tripId: string): Promise<TripBudget[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  const { data } = await supabase
    .from('trip_budgets')
    .select('*')
    .eq('trip_id', tripId)
    .order('category');

  return (data as TripBudget[]) || [];
}

export async function getBudgetSummary(tripId: string): Promise<BudgetSummary | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();

  if (!member) return null;

  const [budgetsResult, expensesResult] = await Promise.all([
    supabase.from('trip_budgets').select('*').eq('trip_id', tripId),
    supabase.from('expenses').select('amount, category, exchange_rate').eq('trip_id', tripId),
  ]);

  const budgets = (budgetsResult.data as TripBudget[]) || [];
  const expenses = expensesResult.data || [];

  // Calculate spending per category
  const spendingByCategory: Record<string, number> = {};
  let totalSpent = 0;

  for (const expense of expenses) {
    const cat = expense.category as string;
    const convertedAmount = expense.amount * (expense.exchange_rate ?? 1);
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + convertedAmount;
    totalSpent += convertedAmount;
  }

  // Build budget with spending info
  const totalBudgetEntry = budgets.find((b) => b.category === 'total');
  const categoryBudgets: BudgetWithSpending[] = budgets
    .filter((b) => b.category !== 'total')
    .map((budget) => {
      const spent = spendingByCategory[budget.category] || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'safe',
      };
    });

  return {
    totalBudget: totalBudgetEntry?.amount ?? null,
    totalSpent,
    categoryBudgets,
    currency: totalBudgetEntry?.currency || budgets[0]?.currency || 'BRL',
  };
}

export async function createBudget(input: {
  trip_id: string;
  category: 'accommodation' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other' | 'total';
  amount: number;
  currency?: string;
}): Promise<BudgetResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado' };
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', input.trip_id)
    .eq('user_id', user.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem definir orçamentos' };
  }

  // Check if budget already exists for this category
  const { data: existing } = await supabase
    .from('trip_budgets')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('category', input.category)
    .single();

  if (existing) {
    return { error: 'Já existe um orçamento para esta categoria' };
  }

  const { data: budget, error } = await supabase
    .from('trip_budgets')
    .insert({
      trip_id: input.trip_id,
      category: input.category,
      amount: input.amount,
      currency: input.currency || 'BRL',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidate.tripBudget(input.trip_id);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'budget',
    entityId: budget.id,
    metadata: { category: input.category, amount: input.amount },
  });

  return { success: true, budgetId: budget.id };
}

export async function updateBudget(budgetId: string, amount: number): Promise<BudgetResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado' };
  }

  const { data: budget } = await supabase
    .from('trip_budgets')
    .select('trip_id')
    .eq('id', budgetId)
    .single();

  if (!budget) {
    return { error: 'Orçamento não encontrado' };
  }

  const { error } = await supabase.from('trip_budgets').update({ amount }).eq('id', budgetId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripBudget(budget.trip_id);

  logActivity({
    tripId: budget.trip_id,
    action: 'updated',
    entityType: 'budget',
    entityId: budgetId,
    metadata: { amount },
  });

  return { success: true, budgetId };
}

export async function deleteBudget(budgetId: string): Promise<BudgetResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado' };
  }

  const { data: budget } = await supabase
    .from('trip_budgets')
    .select('trip_id')
    .eq('id', budgetId)
    .single();

  if (!budget) {
    return { error: 'Orçamento não encontrado' };
  }

  const { error } = await supabase.from('trip_budgets').delete().eq('id', budgetId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripBudget(budget.trip_id);

  logActivity({
    tripId: budget.trip_id,
    action: 'deleted',
    entityType: 'budget',
    entityId: budgetId,
  });

  return { success: true };
}

export async function getExpensesByCategory(
  tripId: string
): Promise<Record<ExpenseCategory, number>> {
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, exchange_rate')
    .eq('trip_id', tripId);

  const result: Record<string, number> = {
    accommodation: 0,
    food: 0,
    transport: 0,
    tickets: 0,
    shopping: 0,
    other: 0,
  };

  if (expenses) {
    for (const expense of expenses) {
      const convertedAmount = expense.amount * (expense.exchange_rate ?? 1);
      result[expense.category] = (result[expense.category] || 0) + convertedAmount;
    }
  }

  return result as Record<ExpenseCategory, number>;
}
