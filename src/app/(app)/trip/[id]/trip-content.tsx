'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTripOffline } from '@/hooks/use-trip-offline';
import { TripHeader } from './trip-header';
import { TripOverview } from './trip-overview';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState } from '@/components/ui/error-state';
import type { TripWithMembers } from '@/lib/supabase/trips';
import type { Trip, TripMemberRole } from '@/types/database';
import type { DashboardData } from '@/lib/supabase/dashboard';
import type { TripParticipantResolved } from '@/lib/supabase/participants';
import type { PollWithVotes } from '@/types/poll';
import type { TripRecapData } from '@/lib/utils/trip-recap';

interface TripContentProps {
  tripId: string;
  initialTrip: TripWithMembers | null;
  initialUserRole: TripMemberRole | null;
  initialCurrentUser: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  initialDashboard?: DashboardData | null;
  initialPolls?: PollWithVotes[];
  initialRecapData?: TripRecapData | null;
  initialParticipants?: TripParticipantResolved[];
}

export function TripContent({
  tripId,
  initialTrip,
  initialUserRole,
  initialCurrentUser,
  initialDashboard,
  initialPolls,
  initialRecapData,
  initialParticipants,
}: TripContentProps) {
  const router = useRouter();
  const { data: cachedData, isOffline, cacheData } = useTripOffline(tripId);
  const [retryCount, setRetryCount] = useState(0);
  const maxAutoRetries = 3;

  // Derive isRetrying from state (no need for separate setState)
  const isRetrying = !initialTrip && !isOffline && retryCount < maxAutoRetries;

  // Auto-retry when trip is not found (handles race condition after creation)
  useEffect(() => {
    if (!initialTrip && !isOffline && retryCount < maxAutoRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
      const timer = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        router.refresh();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [initialTrip, isOffline, retryCount, router]);

  const handleManualRetry = useCallback(() => {
    setRetryCount(0);
    router.refresh();
  }, [router]);

  // Cache fresh data when online
  useEffect(() => {
    if (!isOffline && initialTrip) {
      // Extract base trip data (without trip_members and memberCount)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { trip_members, memberCount, ...tripData } = initialTrip;

      // Extract just the member data without the user details
      const members = trip_members.map((tm) => ({
        id: tm.id,
        trip_id: tm.trip_id,
        user_id: tm.user_id,
        role: tm.role,
        joined_at: tm.joined_at,
        invited_by: tm.invited_by || null,
      }));

      // Extract user data
      const users = trip_members.map((tm) => ({
        id: tm.users.id,
        name: tm.users.name,
        email: tm.users.email,
        avatar_url: tm.users.avatar_url,
      }));

      // Add current user if not already in the list
      if (initialCurrentUser && !users.some((u) => u.id === initialCurrentUser.id)) {
        users.push({
          id: initialCurrentUser.id,
          name: initialCurrentUser.name,
          email: initialCurrentUser.email,
          avatar_url: initialCurrentUser.avatar_url,
        });
      }

      // Cache the trip data for offline use
      cacheData({
        trip: tripData as Trip,
        members,
        activities: [],
        expenses: [],
        expenseSplits: [],
        notes: [],
        users,
      });
    }
  }, [isOffline, initialTrip, initialCurrentUser, cacheData]);

  // Use cached data when offline, otherwise use server data
  let trip: TripWithMembers | null = initialTrip;

  // Reconstruct TripWithMembers from cached data when offline
  if (isOffline && cachedData?.trip) {
    // Combine cached trip with members and user data
    const tripMembers = cachedData.members.map((member) => {
      const user = cachedData.users.find((u) => u.id === member.user_id);
      return {
        ...member,
        users: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar_url: user.avatar_url,
              blocked_at: null,
              blocked_by: null,
              created_at: '', // Not stored in cache
              updated_at: '', // Not stored in cache
            }
          : {
              id: member.user_id,
              email: '',
              name: 'User',
              avatar_url: null,
              blocked_at: null,
              blocked_by: null,
              created_at: '',
              updated_at: '',
            },
      };
    });

    trip = {
      ...cachedData.trip,
      trip_members: tripMembers,
      memberCount: cachedData.members.length,
    };
  }

  const userRole = initialUserRole;
  const currentUser = initialCurrentUser;

  if (!trip) {
    // Show loading while auto-retrying
    if (isRetrying) {
      return (
        <PageContainer bottomNav>
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center space-y-2">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Carregando viagem...</p>
            </div>
          </div>
        </PageContainer>
      );
    }

    // Show error with retry after auto-retries exhausted
    return (
      <PageContainer bottomNav>
        <div className="flex min-h-[400px] items-center justify-center">
          <ErrorState
            title={isOffline ? 'Viagem indisponível offline' : 'Erro ao carregar viagem'}
            description={
              isOffline
                ? 'Esta viagem não está disponível no modo offline. Conecte-se à internet para acessá-la.'
                : 'Não foi possível carregar os dados da viagem. Tente novamente.'
            }
            onRetry={!isOffline ? handleManualRetry : undefined}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer bottomNav>
      <div className="space-y-7 animate-in fade-in duration-200">
        <TripHeader
          trip={trip}
          userRole={userRole}
          currentUserId={currentUser?.id}
          currentUser={currentUser}
        />
        <TripOverview
          trip={trip}
          userRole={userRole}
          currentUserId={currentUser?.id}
          dashboard={initialDashboard}
          initialPolls={initialPolls}
          initialRecapData={initialRecapData}
          participants={initialParticipants ?? []}
        />
      </div>
    </PageContainer>
  );
}
