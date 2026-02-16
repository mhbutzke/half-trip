'use client';

import { FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { routes } from '@/lib/routes';

interface NotesHeaderProps {
  tripId: string;
  tripName: string;
}

export function NotesHeader({ tripId, tripName }: NotesHeaderProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[{ label: tripName, href: routes.trip.overview(tripId) }, { label: 'Notas' }]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Informações importantes sobre a viagem</span>
          </div>
        </div>
      </div>
    </div>
  );
}
