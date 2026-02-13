'use server';

import { createClient } from './server';
import { computeTripRecap, type TripRecapInput, type TripRecapData } from '@/lib/utils/trip-recap';

export async function getTripRecapData(tripId: string): Promise<TripRecapData | null> {
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

  // Fetch all needed data in parallel
  const [tripResult, expensesResult, membersResult, activitiesResult, checklistResult] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase
        .from('expenses')
        .select('amount, category, exchange_rate, paid_by, users!expenses_paid_by_fkey(name)')
        .eq('trip_id', tripId),
      supabase
        .from('trip_members')
        .select('users!trip_members_user_id_fkey(name, avatar_url)')
        .eq('trip_id', tripId),
      supabase.from('activities').select('id').eq('trip_id', tripId),
      supabase
        .from('checklist_items')
        .select('is_completed, trip_checklists!inner(trip_id)')
        .eq('trip_checklists.trip_id', tripId),
    ]);

  const trip = tripResult.data;
  if (!trip) return null;

  const expenses = (expensesResult.data || []).map(
    (e: {
      amount: number;
      category: string;
      exchange_rate: number | null;
      users: { name: string } | null;
    }) => ({
      amount: e.amount,
      category: e.category,
      paidByName: e.users?.name || 'Desconhecido',
      exchangeRate: e.exchange_rate || 1,
    })
  );

  const participants = (membersResult.data || []).map(
    (m: { users: { name: string; avatar_url: string | null } | null }) => ({
      name: m.users?.name || 'Desconhecido',
      avatar: m.users?.avatar_url || null,
    })
  );

  const checklistItems = checklistResult.data || [];
  const completedItems = checklistItems.filter(
    (i: { is_completed: boolean }) => i.is_completed
  ).length;
  const checklistCompletionPercent =
    checklistItems.length > 0 ? Math.round((completedItems / checklistItems.length) * 100) : 100;

  const input: TripRecapInput = {
    trip: {
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      baseCurrency: trip.base_currency,
    },
    expenses,
    participants,
    activitiesCount: activitiesResult.data?.length || 0,
    checklistCompletionPercent,
  };

  return computeTripRecap(input);
}
