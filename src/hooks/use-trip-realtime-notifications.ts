/**
 * Trip Realtime Notifications Hook
 *
 * Enhanced version of useTripRealtime that also triggers in-app notifications
 * for realtime events
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { notifications } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';

interface UseTripRealtimeNotificationsOptions {
  tripId: string;
  tripName?: string;
  currentUserId?: string;
}

/**
 * Hook for subscribing to trip realtime updates with notification support
 */
export function useTripRealtimeNotifications({
  tripId,
  tripName,
  currentUserId,
}: UseTripRealtimeNotificationsOptions) {
  const queryClient = useQueryClient();

  // Subscribe to activity changes
  useRealtimeSubscription({
    table: 'activities',
    filter: `trip_id=eq.${tripId}`,
    onInsert: async (payload) => {
      // Activity added - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activity-count', tripId] });

      // Fetch activity details and creator info
      const newRecord = payload.new as { id: string; created_by: string };
      const supabase = createClient();
      const { data: activity } = await supabase
        .from('activities')
        .select('title, created_by, users!activities_created_by_fkey(name)')
        .eq('id', newRecord.id)
        .single();

      if (activity && activity.created_by !== currentUserId) {
        const creatorName = activity.users?.name || 'Alguém';
        notifications.activityAdded({
          tripId,
          tripName,
          userId: activity.created_by,
          userName: creatorName,
          itemName: activity.title,
        });
      }
    },
    onUpdate: async (payload) => {
      // Activity updated - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });

      const newRecord = payload.new as { id: string; created_by: string };
      if (newRecord.created_by !== currentUserId) {
        const supabase = createClient();
        const { data: activity } = await supabase
          .from('activities')
          .select('title, created_by, users!activities_created_by_fkey(name)')
          .eq('id', newRecord.id)
          .single();

        if (activity) {
          const creatorName = activity.users?.name || 'Alguém';
          notifications.activityUpdated({
            tripId,
            tripName,
            userId: activity.created_by,
            userName: creatorName,
            itemName: activity.title,
          });
        }
      }
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activity-count', tripId] });
    },
  });

  // Subscribe to expense changes
  useRealtimeSubscription({
    table: 'expenses',
    filter: `trip_id=eq.${tripId}`,
    onInsert: async (payload) => {
      // Expense added - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-count', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });

      const newRecord = payload.new as { id: string; paid_by: string };
      if (newRecord.paid_by !== currentUserId) {
        const supabase = createClient();
        const { data: expense } = await supabase
          .from('expenses')
          .select('amount, paid_by, users!expenses_paid_by_fkey(name)')
          .eq('id', newRecord.id)
          .single();

        if (expense) {
          const paidByName = expense.users?.name || 'Alguém';
          notifications.expenseAdded({
            tripId,
            tripName,
            userId: expense.paid_by,
            userName: paidByName,
            amount: expense.amount,
          });
        }
      }
    },
    onUpdate: async (payload) => {
      // Expense updated - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });

      const newRecord = payload.new as { id: string; paid_by: string };
      if (newRecord.paid_by !== currentUserId) {
        const supabase = createClient();
        const { data: expense } = await supabase
          .from('expenses')
          .select('amount, paid_by, users!expenses_paid_by_fkey(name)')
          .eq('id', newRecord.id)
          .single();

        if (expense) {
          const paidByName = expense.users?.name || 'Alguém';
          notifications.expenseUpdated({
            tripId,
            tripName,
            userId: expense.paid_by,
            userName: paidByName,
            amount: expense.amount,
          });
        }
      }
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-count', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });

      notifications.expenseDeleted({
        tripId,
        tripName,
      });
    },
  });

  // Subscribe to trip member changes
  useRealtimeSubscription({
    table: 'trip_members',
    filter: `trip_id=eq.${tripId}`,
    onInsert: async (payload) => {
      // Trip member joined - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });

      const newRecord = payload.new as { user_id: string };
      if (newRecord.user_id !== currentUserId) {
        const supabase = createClient();
        const { data: user } = await supabase
          .from('users')
          .select('name')
          .eq('id', newRecord.user_id)
          .single();

        if (user) {
          notifications.participantJoined({
            tripId,
            tripName,
            userId: newRecord.user_id,
            userName: user.name,
          });
        }
      }
    },
    onDelete: async (payload) => {
      // Trip member left - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });

      const oldRecord = payload.old as { user_id: string };
      if (oldRecord.user_id !== currentUserId) {
        const supabase = createClient();
        const { data: user } = await supabase
          .from('users')
          .select('name')
          .eq('id', oldRecord.user_id)
          .single();

        if (user) {
          notifications.participantLeft({
            tripId,
            tripName,
            userId: oldRecord.user_id,
            userName: user.name,
          });
        }
      }
    },
  });

  // Subscribe to notes changes
  useRealtimeSubscription({
    table: 'trip_notes',
    filter: `trip_id=eq.${tripId}`,
    onInsert: async (payload) => {
      // Note added - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['notes', tripId] });
      queryClient.invalidateQueries({ queryKey: ['notes-count', tripId] });

      const newRecord = payload.new as { id: string; created_by: string };
      if (newRecord.created_by !== currentUserId) {
        const supabase = createClient();
        const { data: note } = await supabase
          .from('trip_notes')
          .select('created_by, users!trip_notes_created_by_fkey(name)')
          .eq('id', newRecord.id)
          .single();

        if (note) {
          const creatorName = note.users?.name || 'Alguém';
          notifications.noteAdded({
            tripId,
            tripName,
            userId: note.created_by,
            userName: creatorName,
          });
        }
      }
    },
    onUpdate: async (payload) => {
      // Note updated - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['notes', tripId] });

      const newRecord = payload.new as { id: string; created_by: string };
      if (newRecord.created_by !== currentUserId) {
        const supabase = createClient();
        const { data: note } = await supabase
          .from('trip_notes')
          .select('created_by, users!trip_notes_created_by_fkey(name)')
          .eq('id', newRecord.id)
          .single();

        if (note) {
          const creatorName = note.users?.name || 'Alguém';
          notifications.noteUpdated({
            tripId,
            tripName,
            userId: note.created_by,
            userName: creatorName,
          });
        }
      }
    },
  });

  // Subscribe to settlement changes
  useRealtimeSubscription({
    table: 'settlements',
    filter: `trip_id=eq.${tripId}`,
    onUpdate: async (payload) => {
      // Settlement changed - invalidate cache
      queryClient.invalidateQueries({ queryKey: ['settlements', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });

      const oldRecord = payload.old as { paid_at: string | null };
      const newRecord = payload.new as { id: string; paid_at: string | null };

      // Check if settlement was marked as paid
      if (!oldRecord.paid_at && newRecord.paid_at) {
        const supabase = createClient();
        const { data: settlement } = await supabase
          .from('settlements')
          .select('from_user, users!settlements_from_user_fkey(name)')
          .eq('id', newRecord.id)
          .single();

        if (settlement && settlement.from_user !== currentUserId) {
          const fromUserName = settlement.users?.name || 'Alguém';
          notifications.settlementMarkedPaid({
            tripId,
            tripName,
            userId: settlement.from_user,
            userName: fromUserName,
          });
        }
      }

      // Check if settlement was unmarked as paid
      if (oldRecord.paid_at && !newRecord.paid_at) {
        notifications.settlementMarkedUnpaid({
          tripId,
          tripName,
        });
      }
    },
  });

  // Subscribe to trip updates
  useRealtimeSubscription({
    table: 'trips',
    filter: `id=eq.${tripId}`,
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });

      notifications.tripUpdated({
        tripId,
        tripName,
      });
    },
  });
}
