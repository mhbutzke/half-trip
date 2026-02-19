'use server';

import { computeTripRecap, type TripRecapInput, type TripRecapData } from '@/lib/utils/trip-recap';
import { requireTripMember } from './auth-helpers';

export async function getTripRecapData(tripId: string): Promise<TripRecapData | null> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return null;

  const supabase = auth.supabase;

  // Fetch all needed data in parallel
  const [
    tripResult,
    expensesResult,
    membersResult,
    activitiesResult,
    checklistResult,
    participantsResult,
  ] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).single(),
    supabase
      .from('expenses')
      .select(
        'amount, category, exchange_rate, paid_by, paid_by_participant_id, users!expenses_paid_by_fkey(name)'
      )
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
    supabase
      .from('trip_participants')
      .select('id, type, user_id, guest_name, users!trip_participants_user_id_fkey(name)')
      .eq('trip_id', tripId),
  ]);

  const trip = tripResult.data;
  if (!trip) return null;

  // Build participant name map (participant_id -> displayName)
  const participantNameMap = new Map<string, string>();
  (participantsResult.data || []).forEach(
    (p: {
      id: string;
      type: string;
      guest_name: string | null;
      users: { name: string } | null;
    }) => {
      const name = p.type === 'guest' ? p.guest_name : p.users?.name;
      if (name) participantNameMap.set(p.id, name);
    }
  );

  const expenses = (expensesResult.data || []).map(
    (e: {
      amount: number;
      category: string;
      exchange_rate: number | null;
      paid_by_participant_id: string | null;
      users: { name: string } | null;
    }) => ({
      amount: e.amount,
      category: e.category,
      paidByName:
        (e.paid_by_participant_id && participantNameMap.get(e.paid_by_participant_id)) ||
        e.users?.name ||
        'Convidado',
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
