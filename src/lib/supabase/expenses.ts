'use server';

import { requireAuth, requireTripMember } from './auth-helpers';
import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';
import { canOnOwn } from '@/lib/permissions/trip-permissions';
import type {
  ExpenseResult,
  ExpenseWithDetails,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/types/expense';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/types/currency';

/**
 * Creates a new expense for a trip with splits.
 * Uses atomic RPC function to prevent orphaned expenses if splits insertion fails.
 */
export async function createExpense(input: CreateExpenseInput): Promise<ExpenseResult> {
  const auth = await requireTripMember(input.trip_id);
  if (!auth.ok) {
    return { error: auth.error };
  }

  const { supabase } = auth;

  // Load trip participants (IDs only for validation) and base_currency in parallel
  const [participantsResult, tripResult] = await Promise.all([
    supabase.from('trip_participants').select('id').eq('trip_id', input.trip_id),
    supabase.from('trips').select('base_currency').eq('id', input.trip_id).single(),
  ]);

  const tripParticipants = participantsResult.data;
  const trip = tripResult.data;

  if (!tripParticipants || tripParticipants.length === 0) {
    return { error: 'Nenhum participante encontrado para esta viagem' };
  }

  if (!trip) {
    return { error: 'Viagem não encontrada' };
  }

  // Build set for fast lookup
  const participantIds = new Set(tripParticipants.map((p) => p.id));

  // Validate paid_by_participant_id exists in trip_participants
  if (!participantIds.has(input.paid_by_participant_id)) {
    return { error: 'O participante que pagou não pertence a esta viagem' };
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

  // Force exchange_rate = 1 when currency matches base, otherwise require > 0
  const exchangeRate = currency === trip.base_currency ? 1 : (input.exchange_rate ?? 1);
  if (exchangeRate <= 0) {
    return { error: 'Taxa de câmbio deve ser maior que zero' };
  }

  // Build splits JSONB for RPC — legacy user_id is auto-populated by DB trigger
  const splitsJsonb = input.splits.map((split) => ({
    user_id: null, // auto-populated by trg_expense_splits_sync_legacy_user
    participant_id: split.participant_id,
    amount: split.amount,
    percentage: split.percentage || null,
  }));

  // Atomic RPC: creates expense + splits in a single transaction
  // Legacy paid_by is auto-populated by trg_expenses_sync_legacy_user trigger
  const { data: expenseId, error: rpcError } = await supabase.rpc('create_expense_with_splits', {
    p_trip_id: input.trip_id,
    p_description: input.description,
    p_amount: input.amount,
    p_currency: currency,
    p_exchange_rate: exchangeRate,
    p_date: input.date,
    p_category: input.category,
    p_paid_by: null, // auto-populated by DB trigger
    p_paid_by_participant_id: input.paid_by_participant_id,
    p_notes: input.notes || null,
    p_activity_id: input.activity_id || null,
    p_splits: splitsJsonb,
  });

  if (rpcError || !expenseId) {
    return { error: rpcError?.message ?? 'Erro ao criar despesa' };
  }

  const resultId = String(expenseId);

  revalidate.tripExpenses(input.trip_id);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'expense',
    entityId: resultId,
    metadata: { description: input.description, amount: input.amount, currency },
  });

  return { success: true, expenseId: resultId };
}

/**
 * Updates an existing expense
 */
export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<ExpenseResult> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

  // Get the expense to check trip membership and ownership
  const { data: expense } = await supabase
    .from('expenses')
    .select('trip_id, created_by')
    .eq('id', expenseId)
    .single();

  if (!expense) {
    return { error: 'Despesa não encontrada' };
  }

  // Check membership and role
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', expense.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  if (!canOnOwn('EDIT', member.role, expense.created_by === authUser.id)) {
    return { error: 'Você não tem permissão para editar esta despesa' };
  }

  // Load trip participants (IDs only for validation)
  const { data: tripParticipants } = await supabase
    .from('trip_participants')
    .select('id')
    .eq('trip_id', expense.trip_id);

  if (!tripParticipants || tripParticipants.length === 0) {
    return { error: 'Nenhum participante encontrado para esta viagem' };
  }

  const participantIds = new Set(tripParticipants.map((p) => p.id));

  // If paid_by_participant_id is being updated, validate it exists
  if (input.paid_by_participant_id && !participantIds.has(input.paid_by_participant_id)) {
    return { error: 'O participante que pagou não pertence a esta viagem' };
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

    const { data: trip } = await supabase
      .from('trips')
      .select('base_currency')
      .eq('id', expense.trip_id)
      .single();

    if (trip && currency === trip.base_currency) {
      input.exchange_rate = 1;
    }
  }

  if (input.exchange_rate !== undefined && input.exchange_rate <= 0) {
    return { error: 'Taxa de câmbio deve ser maior que zero' };
  }

  // Build update data — legacy paid_by auto-populated by DB trigger
  const updateData: Record<string, unknown> = {
    ...(input.description !== undefined && { description: input.description }),
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.currency !== undefined && { currency: input.currency }),
    ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
    ...(input.date !== undefined && { date: input.date }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.notes !== undefined && { notes: input.notes }),
  };

  if (input.paid_by_participant_id !== undefined) {
    updateData.paid_by_participant_id = input.paid_by_participant_id;
    updateData.paid_by = null; // auto-populated by trg_expenses_sync_legacy_user
  }

  const { error: updateError } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Replace splits if provided — legacy user_id auto-populated by DB trigger
  if (input.splits) {
    await supabase.from('expense_splits').delete().eq('expense_id', expenseId);

    const splits = input.splits.map((split) => ({
      expense_id: expenseId,
      participant_id: split.participant_id,
      amount: split.amount,
      percentage: split.percentage || null,
    }));

    const { error: splitsError } = await supabase.from('expense_splits').insert(splits);
    if (splitsError) {
      return { error: splitsError.message };
    }
  }

  revalidate.tripExpenses(expense.trip_id);

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
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

  // Get expense with description for activity log
  const { data: expense } = await supabase
    .from('expenses')
    .select('trip_id, created_by, description')
    .eq('id', expenseId)
    .single();

  if (!expense) {
    return { error: 'Despesa não encontrada' };
  }

  // Check membership and role
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', expense.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  if (!canOnOwn('DELETE', member.role, expense.created_by === authUser.id)) {
    return { error: 'Você não tem permissão para excluir esta despesa' };
  }

  // Delete expense (splits cascade deleted by FK)
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripExpenses(expense.trip_id);

  logActivity({
    tripId: expense.trip_id,
    action: 'deleted',
    entityType: 'expense',
    entityId: expenseId,
    metadata: { description: expense.description },
  });

  return { success: true };
}

/**
 * Gets all expenses for a trip, ordered by date (newest first)
 */
export async function getTripExpenses(tripId: string): Promise<ExpenseWithDetails[]> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return [];

  const { data: expenses } = await auth.supabase
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

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};

const EXPENSES_PAGE_SIZE = 30;

/**
 * Gets paginated expenses for a trip (for list view).
 * Use getTripExpenses() for balance/summary calculations that need all data.
 */
export async function getTripExpensesPaginated(
  tripId: string,
  page: number = 0,
  limit: number = EXPENSES_PAGE_SIZE
): Promise<PaginatedResult<ExpenseWithDetails>> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return { items: [], total: 0, hasMore: false };

  const from = page * limit;
  const to = from + limit - 1;

  const [countResult, dataResult] = await Promise.all([
    auth.supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId),
    auth.supabase
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
      .order('created_at', { ascending: false })
      .range(from, to),
  ]);

  const total = countResult.count ?? 0;
  const items = (dataResult.data as ExpenseWithDetails[]) || [];

  return { items, total, hasMore: from + items.length < total };
}

/**
 * Gets a single expense by ID
 */
export async function getExpenseById(expenseId: string): Promise<ExpenseWithDetails | null> {
  const auth = await requireAuth();
  if (!auth.ok) return null;
  const { supabase, user: authUser } = auth;

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

  if (!expense) return null;

  // Verify membership
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', expense.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) return null;

  return expense as ExpenseWithDetails;
}

/**
 * Gets expenses count for a trip
 */
export async function getExpensesCount(tripId: string): Promise<number> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return 0;

  const { count } = await auth.supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}

/**
 * Gets total expenses amount for a trip (converted to base currency).
 * Uses server-side SUM via RPC instead of fetching all rows.
 */
export async function getTripExpensesTotal(tripId: string): Promise<number> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return 0;
  }

  const { data, error } = await auth.supabase.rpc('get_trip_expenses_total', {
    p_trip_id: tripId,
  });

  if (error || data === null) {
    return 0;
  }

  return Number(data);
}

/**
 * Gets expenses linked to a specific activity
 */
export async function getExpensesByActivityId(
  activityId: string
): Promise<{ id: string; description: string; amount: number; currency: string }[]> {
  const auth = await requireAuth();
  if (!auth.ok) return [];

  const { data } = await auth.supabase
    .from('expenses')
    .select('id, description, amount, currency')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false });

  return data || [];
}
