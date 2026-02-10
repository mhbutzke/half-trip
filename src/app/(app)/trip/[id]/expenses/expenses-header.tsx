'use client';

import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportDropdown } from '@/components/export/export-dropdown';

interface ExpensesHeaderProps {
  tripId: string;
  tripName: string;
}

export function ExpensesHeader({ tripId, tripName }: ExpensesHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
          <Link href={`/trip/${tripId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{tripName}</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <Receipt className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Registre e acompanhe os gastos da viagem</span>
          </div>
        </div>
        <ExportDropdown tripId={tripId} tripName={tripName} />
      </div>
    </div>
  );
}
