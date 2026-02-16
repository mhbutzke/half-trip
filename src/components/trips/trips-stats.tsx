'use client';

import { Calendar, MapPin, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TripsStatsProps {
  totalTrips: number;
  upcomingTrips: number;
  completedTrips: number;
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

export function TripsStats({ totalTrips, upcomingTrips, completedTrips }: TripsStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard icon={MapPin} label="Total" value={totalTrips} />
      <StatCard icon={Calendar} label="Próximas" value={upcomingTrips} />
      <StatCard icon={TrendingUp} label="Concluídas" value={completedTrips} />
    </div>
  );
}
