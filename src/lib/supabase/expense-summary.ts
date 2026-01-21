'use server';

import { createClient } from './server';
import type { ExpenseCategory } from '@/types/database';
import type { ExpenseWithDetails } from './expenses';

export type CategorySummary = {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
};

export type PersonExpenseSummary = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalPaid: number;
  expenseCount: number;
  percentage: number;
};

export type TripExpenseSummary = {
  tripId: string;
  totalExpenses: number;
  expenseCount: number;
  participantCount: number;
  averagePerPerson: number;
  categoryBreakdown: CategorySummary[];
  personBreakdown: PersonExpenseSummary[];
};

/**
 * Gets comprehensive expense summary for a trip
 */
export async function getTripExpenseSummary(tripId: string): Promise<TripExpenseSummary | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return null;
  }

  // Get all expenses with details
  const { data: expenses } = await supabase
    .from('expenses')
    .select(
      `
      *,
      paid_by_user:users!expenses_paid_by_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId);

  if (!expenses || expenses.length === 0) {
    // Return empty summary
    const { data: members } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId);

    return {
      totalExpenses: 0,
      expenseCount: 0,
      participantCount: members?.length || 0,
      averagePerPerson: 0,
      categoryBreakdown: [],
      personBreakdown: [],
    };
  }

  // Get participant count
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId);

  const participantCount = members?.length || 0;

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expenseCount = expenses.length;
  const averagePerPerson = participantCount > 0 ? totalExpenses / participantCount : 0;

  // Calculate category breakdown
  const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();

  expenses.forEach((expense) => {
    const category = expense.category as ExpenseCategory;
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    categoryMap.set(category, {
      total: existing.total + expense.amount,
      count: existing.count + 1,
    });
  });

  const categoryBreakdown: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total); // Sort by total descending

  // Calculate person breakdown
  const personMap = new Map<
    string,
    { userName: string; userAvatar: string | null; totalPaid: number; count: number }
  >();

  expenses.forEach((expense) => {
    const expenseTyped = expense as ExpenseWithDetails;
    const userId = expenseTyped.paid_by;
    const existing = personMap.get(userId) || {
      userName: expenseTyped.paid_by_user.name,
      userAvatar: expenseTyped.paid_by_user.avatar_url,
      totalPaid: 0,
      count: 0,
    };
    personMap.set(userId, {
      ...existing,
      totalPaid: existing.totalPaid + expense.amount,
      count: existing.count + 1,
    });
  });

  const personBreakdown: PersonExpenseSummary[] = Array.from(personMap.entries())
    .map(([userId, data]) => ({
      userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      totalPaid: data.totalPaid,
      expenseCount: data.count,
      percentage: totalExpenses > 0 ? (data.totalPaid / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid); // Sort by total paid descending

  return {
    tripId,
    totalExpenses,
    expenseCount,
    participantCount,
    averagePerPerson,
    categoryBreakdown,
    personBreakdown,
  };
}
