'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TripSummary } from '@/components/summary';
import type { TripExpenseSummary } from '@/lib/supabase/expense-summary';
import type { Trip } from '@/types/database';
import { Receipt } from 'lucide-react';

interface BalanceContentProps {
  summary: TripExpenseSummary;
  trip: Trip;
  currentUserId: string;
  isOrganizer: boolean;
}

export function BalanceContent({ summary, trip }: BalanceContentProps) {
  // Show empty state if no expenses
  if (summary.expenseCount === 0) {
    return (
      <main className="container flex-1 space-y-6 px-4 py-6 pb-20 md:pb-6">
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-muted p-6">
            <Receipt className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Nenhuma despesa registrada</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Comece a registrar despesas para ver o resumo da viagem
            </p>
          </div>
          <Button asChild>
            <Link href={`/trip/${trip.id}/expenses`}>Adicionar Despesa</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container flex-1 space-y-6 px-4 py-6 pb-20 md:pb-6">
      <TripSummary summary={summary} />
    </main>
  );
}
