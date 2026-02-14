'use client';

import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyExpensesIllustration } from '@/components/illustrations';
import { TripSummary } from '@/components/summary';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import type { TripExpenseSummary } from '@/types/expense-summary';
import type { Trip } from '@/types/database';
import { Receipt } from 'lucide-react';

interface BalanceContentProps {
  summary: TripExpenseSummary;
  trip: Trip;
  currentUserId: string;
  isOrganizer: boolean;
}

export function BalanceContent({ summary, trip, currentUserId, isOrganizer }: BalanceContentProps) {
  const router = useRouter();

  // Enable real-time updates for this trip
  useTripRealtime({ tripId: trip.id });

  // Show empty state if no expenses
  if (summary.expenseCount === 0) {
    return (
      <div className="animate-in fade-in duration-200">
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa registrada"
          description="Comece a registrar despesas para ver o balanço da viagem e as divisões entre participantes"
          illustration={<EmptyExpensesIllustration className="size-20" />}
          action={{
            label: 'Ir para Despesas',
            onClick: () => router.push(`/trip/${trip.id}/expenses`),
          }}
          className="min-h-[400px]"
          tips={[
            'Registre despesas na aba Despesas para ver o balanço aqui',
            'O sistema calcula automaticamente quem deve para quem',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <TripSummary summary={summary} currentUserId={currentUserId} isOrganizer={isOrganizer} />
    </div>
  );
}
