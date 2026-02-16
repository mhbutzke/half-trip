'use client';

import { Receipt } from 'lucide-react';
import { ExportDropdown } from '@/components/export/export-dropdown';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { routes } from '@/lib/routes';

interface ExpensesHeaderProps {
  tripId: string;
  tripName: string;
}

export function ExpensesHeader({ tripId, tripName }: ExpensesHeaderProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[{ label: tripName, href: routes.trip.overview(tripId) }, { label: 'Despesas' }]}
      />
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
