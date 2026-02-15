'use server';

import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';
import { getTripExpenseSummary } from '@/lib/supabase/expense-summary';

export type DashboardData = {
  userBalance: number;
  balanceDescription: string;
  totalExpenses: number;
  expenseCount: number;
  activityCountTotal: number;
  checklistCount: number;
  nextActivity: {
    title: string;
    date: string;
    time: string | null;
    location: string | null;
  } | null;
  pendingSettlements: {
    count: number;
    totalAmount: number;
  };
  tripProgress: {
    currentDay: number;
    totalDays: number;
  };
  budgetUsed: number | null;
  budgetTotal: number | null;
  baseCurrency: string;
};

export async function getDashboardData(tripId: string): Promise<DashboardData | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  // Fetch trip for dates and currency
  const { data: trip } = await supabase
    .from('trips')
    .select('start_date, end_date, base_currency')
    .eq('id', tripId)
    .single();

  if (!trip) return null;

  const baseCurrency = trip.base_currency || 'BRL';

  // Fetch expense summary (has balances, settlements, totals)
  const summaryPromise = getTripExpenseSummary(tripId);

  // Count total activities and checklists for readiness UI
  const activityCountPromise = supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);
  const checklistCountPromise = supabase
    .from('trip_checklists')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  const [summary, activityCountResult, checklistCountResult] = await Promise.all([
    summaryPromise,
    activityCountPromise,
    checklistCountPromise,
  ]);

  const activityCountTotal = activityCountResult.count ?? 0;
  const checklistCount = checklistCountResult.count ?? 0;

  // Find current user's balance
  const userParticipant = summary?.participants.find((p) => p.userId === user.id);
  const userBalance = userParticipant?.netBalance ?? 0;

  // Count pending settlements involving current user
  const pendingForUser =
    summary?.suggestedSettlements.filter(
      (s) => s.from.userId === user.id || s.to.userId === user.id
    ) ?? [];
  const pendingAmount = pendingForUser
    .filter((s) => s.from.userId === user.id)
    .reduce((sum, s) => sum + s.amount, 0);

  // Balance description
  let balanceDescription = 'Tudo certo!';
  if (userBalance > 0.01) {
    const creditorsCount =
      summary?.suggestedSettlements.filter((s) => s.to.userId === user.id).length ?? 0;
    balanceDescription = `Você deve receber de ${creditorsCount} ${creditorsCount === 1 ? 'pessoa' : 'pessoas'}`;
  } else if (userBalance < -0.01) {
    const debtorsCount =
      summary?.suggestedSettlements.filter((s) => s.from.userId === user.id).length ?? 0;
    balanceDescription = `Você deve para ${debtorsCount} ${debtorsCount === 1 ? 'pessoa' : 'pessoas'}`;
  }

  // Fetch next activity (first upcoming activity from now)
  const { data: nextActivities } = await supabase
    .from('activities')
    .select('title, date, start_time, location')
    .eq('trip_id', tripId)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .limit(1);

  const nextActivity = nextActivities?.[0]
    ? {
        title: nextActivities[0].title,
        date: nextActivities[0].date,
        time: nextActivities[0].start_time,
        location: nextActivities[0].location,
      }
    : null;

  // Trip progress — normalize dates to local midnight to avoid timezone off-by-one
  const normalizeToMidnight = (d: Date) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };
  const startDate = normalizeToMidnight(new Date(trip.start_date));
  const endDate = normalizeToMidnight(new Date(trip.end_date));
  const today = normalizeToMidnight(new Date());
  const totalDays = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const currentDay = Math.max(
    0,
    Math.min(
      totalDays,
      Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )
  );

  // Budget
  const { data: budgets } = await supabase
    .from('trip_budgets')
    .select('amount, category')
    .eq('trip_id', tripId);

  const totalBudget = budgets?.find((b) => b.category === 'total');
  const budgetTotal = totalBudget ? totalBudget.amount : null;
  const budgetUsed = summary ? summary.totalExpenses : null;

  return {
    userBalance,
    balanceDescription,
    totalExpenses: summary?.totalExpenses ?? 0,
    expenseCount: summary?.expenseCount ?? 0,
    activityCountTotal,
    checklistCount,
    nextActivity,
    pendingSettlements: {
      count: pendingForUser.length,
      totalAmount: pendingAmount,
    },
    tripProgress: {
      currentDay,
      totalDays,
    },
    budgetUsed,
    budgetTotal,
    baseCurrency,
  };
}
