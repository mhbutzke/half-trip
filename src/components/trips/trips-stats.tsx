'use client';

import { Calendar, MapPin, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TripsStatsProps {
  totalTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  className?: string;
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
}

function StatItem({ icon: Icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function TripsStats({
  totalTrips,
  upcomingTrips,
  completedTrips,
  className,
}: TripsStatsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-sm', className)}>
      <StatItem icon={MapPin} label="Total" value={totalTrips} />
      <Separator orientation="vertical" className="h-4" />
      <StatItem icon={Calendar} label="Próximas" value={upcomingTrips} />
      <Separator orientation="vertical" className="h-4" />
      <StatItem icon={TrendingUp} label="Concluídas" value={completedTrips} />
    </div>
  );
}
