'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';
import type {
  ExpenseResult,
  ExpenseWithDetails,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/types/expense';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/types/currency';

/**
 * Creates a new expense for a trip with splits
 */
export async function createExpense(input: CreateExpenseInput): Promise<ExpenseResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Validate that paid_by is a trip member
  const { data: paidByMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('user_id', input.paid_by)
    .single();

  if (!paidByMember) {
    return { error: 'O usuário que pagou não é membro desta viagem' };
  }

  // Validate splits sum equals amount (with small tolerance for floating point)
  const splitsTotal = input.splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(splitsTotal - input.amount) > 0.01) {
    return { error: 'A soma das divisões deve ser igual ao valor total' };
  }

  // Validate currency
  const currency = (input.currency || 'BRL') as SupportedCurrency;
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return { error: 'Moeda inválida' };
  }

  // Get trip base_currency to determine exchange_rate
  const { data: trip } = await supabase
    .from('trips')
    .select('base_currency')
    .eq('id', input.trip_id)
    .single();

  if (!trip) {
    return { error: 'Viagem não encontrada' };
  }

  // Force exchange_rate = 1 when currency matches base, otherwise require > 0
  const exchangeRate = currency === trip.base_currency ? 1 : (input.exchange_rate ?? 1);
  if (exchangeRate <= 0) {
    return { error: 'Taxa de câmbio deve ser maior que zero' };
  }

  // Create the expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      trip_id: input.trip_id,
      description: input.description,
      amount: input.amount,
      currency,
      exchange_rate: exchangeRate,
      date: input.date,
      category: input.category,
      paid_by: input.paid_by,
      created_by: authUser.id,
      notes: input.notes || null,
    })
    .select('id')
    .single();

  if (expenseError) {
    return { error: expenseError.message };
  }

  // Create expense splits
  const splits = input.splits.map((split) => ({
    expense_id: expense.id,
    user_id: split.user_id,
    amount: split.amount,
    percentage: split.percentage || null,
  }));

  const { error: splitsError } = await supabase.from('expense_splits').insert(splits);

  if (splitsError) {
    // Rollback: delete the expense if splits creation fails
    await supabase.from('expenses').delete().eq('id', expense.id);
    return { error: splitsError.message };
  }

  revalidatePath(`/trip/${input.trip_id}`);
  revalidatePath(`/trip/${input.trip_id}/expenses`);
  revalidatePath(`/trip/${input.trip_id}/balance`);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'expense',
    entityId: expense.id,
    metadata: { description: input.description, amount: input.amount, currency },
  });

  return { success: true, expenseId: expense.id };
}

/**
 * Updates an existing expense
 */
export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<ExpenseResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the expense to check trip membership and ownership
  const { data: expense } = await supabase
    .from('expenses')
    .select('trip_id, created_by')
    .eq('id', expenseId)
    .single();

  if (!expense) {
    return { error: 'Despesa não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', expense.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Only the creator or organizers can edit an expense
  if (expense.created_by !== authUser.id && member.role !== 'organizer') {
    return { error: 'Você não tem permissão para editar esta despesa' };
  }

  // If paid_by is being updated, validate they are a trip member
  if (input.paid_by) {
    const { data: paidByMember } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', expense.trip_id)
      .eq('user_id', input.paid_by)
      .single();

    if (!paidByMember) {
      return { error: 'O usuário que pagou não é membro desta viagem' };
    }
  }

  // Validate splits if provided
  if (input.splits && input.amount !== undefined) {
    const splitsTotal = input.splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(splitsTotal - input.amount) > 0.01) {
      return { error: 'A soma das divisões deve ser igual ao valor total' };
    }
  }

  // Validate currency if provided
  if (input.currency !== undefined) {
    const currency = input.currency as SupportedCurrency;
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return { error: 'Moeda inválida' };
    }

    // Get trip base_currency
    const { data: trip } = await supabase
      .from('trips')
      .select('base_currency')
      .eq('id', expense.trip_id)
      .single();

    if (trip) {
      // Force exchange_rate = 1 when currency matches base
      if (currency === trip.base_currency) {
        input.exchange_rate = 1;
      }
    }
  }

  // Validate exchange_rate if provided
  if (input.exchange_rate !== undefined && input.exchange_rate <= 0) {
    return { error: 'Taxa de câmbio deve ser maior que zero' };
  }

  // Update the expense
  const { error: updateError } = await supabase
    .from('expenses')
    .update({
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.paid_by !== undefined && { paid_by: input.paid_by }),
      ...(input.notes !== undefined && { notes: input.notes }),
    })
    .eq('id', expenseId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Update splits if provided
  if (input.splits) {
    // Delete existing splits
    const { error: deleteError } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    // Create new splits
    const splits = input.splits.map((split) => ({
      expense_id: expenseId,
      user_id: split.user_id,
      amount: split.amount,
      percentage: split.percentage || null,
    }));

    const { error: splitsError } = await supabase.from('expense_splits').insert(splits);

    if (splitsError) {
      return { error: splitsError.message };
    }
  }

  revalidatePath(`/trip/${expense.trip_id}`);
  revalidatePath(`/trip/${expense.trip_id}/expenses`);
  revalidatePath(`/trip/${expense.trip_id}/balance`);

  logActivity({
    tripId: expense.trip_id,
    action: 'updated',
    entityType: 'expense',
    entityId: expenseId,
    metadata: { description: input.description },
  });

  return { success: true, expenseId };
}

/**
 * Deletes an expense
 */
export async function deleteExpense(expenseId: string): Promise<ExpenseResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the expense to check trip membership and ownership
  const { data: expense } = await supabase
    .from('expenses')
    .select('trip_id, created_by')
    .eq('id', expenseId)
    .single();

  if (!expense) {
    return { error: 'Despesa não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', expense.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Only the creator or organizers can delete an expense
  if (expense.created_by !== authUser.id && member.role !== 'organizer') {
    return { error: 'Você não tem permissão para excluir esta despesa' };
  }

  // Get description before deleting for the activity log
  const { data: expenseFull } = await supabase
    .from('expenses')
    .select('description')
    .eq('id', expenseId)
    .single();

  // Delete expense (splits will be cascade deleted by FK)
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${expense.trip_id}`);
  revalidatePath(`/trip/${expense.trip_id}/expenses`);
  revalidatePath(`/trip/${expense.trip_id}/balance`);

  logActivity({
    tripId: expense.trip_id,
    action: 'deleted',
    entityType: 'expense',
    entityId: expenseId,
    metadata: { description: expenseFull?.description },
  });

  return { success: true };
}

/**
 * Gets all expenses for a trip, ordered by date (newest first)
 */
export async function getTripExpenses(tripId: string): Promise<ExpenseWithDetails[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select(
      `
      *,
      paid_by_user:users!expenses_paid_by_fkey (
        id,
        name,
        avatar_url
      ),
      created_by_user:users!expenses_created_by_fkey (
        id,
        name,
        avatar_url
      ),
      expense_splits (
        *,
        users!expense_splits_user_id_fkey (
          id,
          name,
          avatar_url
        )
      )
    `
    )
    .eq('trip_id', tripId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  return (expenses as ExpenseWithDetails[]) || [];
}

/**
 * Gets a single expense by ID
 */
export async function getExpenseById(expenseId: string): Promise<ExpenseWithDetails | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Get expense with details
  const { data: expense } = await supabase
    .from('expenses')
    .select(
      `
      *,
      paid_by_user:users!expenses_paid_by_fkey (
        id,
        name,
        avatar_url
      ),
      created_by_user:users!expenses_created_by_fkey (
        id,
        name,
        avatar_url
      ),
      expense_splits (
        *,
        users!expense_splits_user_id_fkey (
          id,
          name,
          avatar_url
        )
      )
    `
    )
    .eq('id', expenseId)
    .single();

  if (!expense) {
    return null;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', expense.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return null;
  }

  return expense as ExpenseWithDetails;
}

/**
 * Gets expenses count for a trip
 */
export async function getExpensesCount(tripId: string): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return 0;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return 0;
  }

  const { count } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}

/**
 * Gets total expenses amount for a trip
 */
export async function getTripExpensesTotal(tripId: string): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return 0;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return 0;
  }

  const { data: expenses } = await supabase.from('expenses').select('amount').eq('trip_id', tripId);

  if (!expenses) {
    return 0;
  }

  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}
