'use client';

import { Calendar, MapPin, Receipt, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TripsStatsProps {
  totalTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  totalDestinations: number;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  unit?: string;
}

function StatCard({ icon: Icon, label, value, unit }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold tracking-tight">
            {value}
            {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TripsStats({
  totalTrips,
  upcomingTrips,
  completedTrips,
  totalDestinations,
}: TripsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={MapPin} label="Total de viagens" value={totalTrips} />
      <StatCard icon={Calendar} label="Próximas viagens" value={upcomingTrips} />
      <StatCard icon={TrendingUp} label="Concluídas" value={completedTrips} />
      <StatCard icon={Receipt} label="Destinos visitados" value={totalDestinations} />
    </div>
  );
}
