'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logDebug } from '@/lib/errors/logger';

export type PresenceUser = {
  user_id: string;
  name: string;
  avatar_url: string | null;
};

export type PresenceState = {
  [key: string]: PresenceUser[];
};

/**
 * Hook to track presence (online users) in a trip using Supabase Realtime Presence
 * @param tripId - The ID of the trip to track presence for
 * @param currentUser - The current user's info
 * @returns Object with online users array and presence state
 */
export function useTripPresence(tripId: string | null, currentUser: PresenceUser | null) {
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!tripId || !currentUser) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const setupPresence = async () => {
      // Create a channel for this trip
      channel = supabase.channel(`trip:${tripId}:presence`, {
        config: {
          presence: {
            key: currentUser.user_id,
          },
        },
      });

      // Subscribe to presence changes
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceUser>();
          setPresenceState(state);

          // Flatten the presence state to get array of unique users
          const users: PresenceUser[] = [];
          const seenIds = new Set<string>();

          Object.values(state).forEach((presences) => {
            presences.forEach((presence) => {
              if (!seenIds.has(presence.user_id)) {
                users.push(presence);
                seenIds.add(presence.user_id);
              }
            });
          });

          setOnlineUsers(users);
        })
        .on('presence', { event: 'join' }, () => {
          // User joined presence
        })
        .on('presence', { event: 'leave' }, () => {
          // User left presence
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track our presence
            await channel.track(currentUser);
            logDebug(`Tracking presence for user: ${currentUser.user_id}`, {
              tripId: tripId ?? undefined,
            });
          }
        });
    };

    setupPresence();

    // Cleanup on unmount
    return () => {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }, [tripId, currentUser]);

  return {
    presenceState,
    onlineUsers,
    // Filter out current user from online users
    otherUsers: onlineUsers.filter((u) => u.user_id !== currentUser?.user_id),
  };
}
