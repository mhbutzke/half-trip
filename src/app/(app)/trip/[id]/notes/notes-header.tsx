'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotesHeaderProps {
  tripId: string;
  tripName: string;
}

export function NotesHeader({ tripId, tripName }: NotesHeaderProps) {
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
          <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Informações importantes sobre a viagem</span>
          </div>
        </div>
      </div>
    </div>
  );
}
