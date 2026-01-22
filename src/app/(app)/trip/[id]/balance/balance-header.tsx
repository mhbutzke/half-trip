import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/types/database';

type BalanceHeaderProps = {
  trip: Trip;
};

export function BalanceHeader({ trip }: BalanceHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4 px-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={`/trip/${trip.id}`}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">Balanço</h1>
        </div>
      </div>
    </header>
  );
}
