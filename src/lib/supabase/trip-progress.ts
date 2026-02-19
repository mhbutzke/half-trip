/**
 * Trip progress utilities for fetching checklist and budget completion data
 * Optimized to avoid N+1 queries when fetching progress for multiple trips
 */

import { createClient } from '@/lib/supabase/client';
import type { TripProgressData } from '@/components/trips/trip-progress';
import type { TripChecklist } from '@/types/checklist';
import type { TripBudget } from '@/types/budget';
import { calculateBalancesWithSettlements } from '@/lib/balance/calculate-balance';
import { calculateSettlements } from '@/lib/balance/calculate-settlements';
import type { ExpenseData, ParticipantData, PersistedSettlement } from '@/lib/balance/types';

interface Expense {
  trip_id: string;
  amount: number;
  category: string;
  exchange_rate: number | null;
}

/**
 * Fetch progress data for multiple trips in batch
 * Returns a Map of tripId -> progress data
 */
export async function getTripProgressBatch(
  tripIds: string[]
): Promise<Map<string, TripProgressData>> {
  if (tripIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  // Fetch all data in parallel
  const [checklistsResult, itemsResult, budgetsResult, expensesResult] = await Promise.all([
    // Fetch all checklists for these trips
    supabase.from('trip_checklists').select('id, trip_id').in('trip_id', tripIds),

    // Fetch all checklist items for these trips
    supabase
      .from('checklist_items')
      .select('checklist_id, is_completed, trip_checklists!inner(trip_id)')
      .in('trip_checklists.trip_id', tripIds),

    // Fetch all budgets with category 'total'
    supabase
      .from('trip_budgets')
      .select('trip_id, amount, category')
      .in('trip_id', tripIds)
      .eq('category', 'total'),

    // Fetch all expenses for these trips
    supabase.from('expenses').select('trip_id, amount, exchange_rate').in('trip_id', tripIds),
  ]);

  const checklists = (checklistsResult.data as TripChecklist[]) || [];
  interface ChecklistItemRow {
    checklist_id: string;
    is_completed: boolean;
    trip_checklists?: { trip_id: string };
  }
  const items = (itemsResult.data as ChecklistItemRow[]) || [];
  const budgets = (budgetsResult.data as TripBudget[]) || [];
  const expenses = (expensesResult.data as Expense[]) || [];

  // Build checklist lookup: tripId -> { completed, total }
  const checklistProgress = new Map<string, { completed: number; total: number }>();

  // First, create a map of checklistId -> tripId
  const checklistToTrip = new Map<string, string>();
  for (const checklist of checklists) {
    checklistToTrip.set(checklist.id, checklist.trip_id);
  }

  // Count items per trip
  for (const item of items) {
    const tripId = item.trip_checklists?.trip_id;
    if (!tripId) continue;

    const current = checklistProgress.get(tripId) || { completed: 0, total: 0 };
    current.total += 1;
    if (item.is_completed) {
      current.completed += 1;
    }
    checklistProgress.set(tripId, current);
  }

  // Build budget lookup: tripId -> { used, total }
  const budgetProgress = new Map<string, { used: number; total: number }>();

  // Calculate total spent per trip
  const spentByTrip = new Map<string, number>();
  for (const expense of expenses) {
    const convertedAmount = expense.amount * (expense.exchange_rate ?? 1);
    const current = spentByTrip.get(expense.trip_id) || 0;
    spentByTrip.set(expense.trip_id, current + convertedAmount);
  }

  // Map budgets to trips
  for (const budget of budgets) {
    const spent = spentByTrip.get(budget.trip_id) || 0;
    budgetProgress.set(budget.trip_id, {
      used: spent,
      total: budget.amount,
    });
  }

  // Build final map
  const progressMap = new Map<string, TripProgressData>();

  for (const tripId of tripIds) {
    const checklistData = checklistProgress.get(tripId);
    const budgetData = budgetProgress.get(tripId);

    progressMap.set(tripId, {
      checklist: checklistData || null,
      budget: budgetData || null,
    });
  }

  return progressMap;
}

/**
 * Fetch progress data for a single trip
 * Use getTripProgressBatch when fetching for multiple trips
 */
export async function getTripProgress(tripId: string): Promise<TripProgressData> {
  const progressMap = await getTripProgressBatch([tripId]);
  return progressMap.get(tripId) || { checklist: null, budget: null };
}

export type ActionCardStats = {
  pendingSettlements: number;
  recentExpensesCount: number;
  pendingChecklistsCount: number;
};

/**
 * Derive action card stats from progress data + additional queries.
 * - pendingChecklistsCount: computed from progressData (no extra query)
 * - recentExpensesCount: expenses created in last 7 days
 * - pendingSettlements: suggested settlements count from balance calculation (upcoming trip only)
 */
export async function getActionCardStats(
  tripIds: string[],
  progressData: Map<string, TripProgressData>,
  upcomingTripId?: string
): Promise<ActionCardStats> {
  if (tripIds.length === 0) {
    return { pendingSettlements: 0, recentExpensesCount: 0, pendingChecklistsCount: 0 };
  }

  // Derive pending checklists from already-loaded progress data
  let pendingChecklistsCount = 0;
  for (const [, data] of progressData) {
    if (data.checklist) {
      pendingChecklistsCount += data.checklist.total - data.checklist.completed;
    }
  }

  const supabase = createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Recent expenses count
  const expensesCountResult = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .in('trip_id', tripIds)
    .gte('created_at', sevenDaysAgo);

  // Calculate pending settlements from balance data (upcoming trip only)
  let pendingSettlements = 0;
  if (upcomingTripId) {
    const [expensesResult, participantsResult, settlementsResult] = await Promise.all([
      supabase
        .from('expenses')
        .select(
          'id, amount, paid_by_participant_id, exchange_rate, expense_splits(participant_id, amount)'
        )
        .eq('trip_id', upcomingTripId),
      supabase.from('trip_participants').select('id, type').eq('trip_id', upcomingTripId),
      supabase
        .from('settlements')
        .select('from_participant_id, to_participant_id, amount')
        .eq('trip_id', upcomingTripId),
    ]);

    const expenses = expensesResult.data ?? [];
    const participants = participantsResult.data ?? [];
    const settlements = settlementsResult.data ?? [];

    if (expenses.length > 0 && participants.length > 0) {
      const expenseData: ExpenseData[] = expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        paidByParticipantId: e.paid_by_participant_id || '',
        exchangeRate: e.exchange_rate ?? 1,
        splits: (e.expense_splits as Array<{ participant_id: string | null; amount: number }>).map(
          (s) => ({
            participantId: s.participant_id || '',
            amount: s.amount,
          })
        ),
      }));

      const participantData: ParticipantData[] = participants.map((p) => ({
        participantId: p.id,
        participantName: '',
        participantAvatar: null,
        participantType: p.type as 'member' | 'guest',
      }));

      const persistedSettlements: PersistedSettlement[] = settlements.map((s) => ({
        fromParticipantId: s.from_participant_id || '',
        toParticipantId: s.to_participant_id || '',
        amount: s.amount,
      }));

      const balanceResult = calculateBalancesWithSettlements(
        expenseData,
        participantData,
        persistedSettlements
      );
      const suggestedSettlements = calculateSettlements(balanceResult.participants);
      pendingSettlements = suggestedSettlements.length;
    }
  }

  return {
    pendingSettlements,
    recentExpensesCount: expensesCountResult.count ?? 0,
    pendingChecklistsCount,
  };
}
