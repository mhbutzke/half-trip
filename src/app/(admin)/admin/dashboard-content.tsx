'use client';

import { Users, Map, Receipt, ArrowLeftRight, UserPlus, ShieldOff } from 'lucide-react';
import { StatWidget } from '@/components/ui/stat-widget';
import type { SystemStats } from '@/types/admin';

interface DashboardContentProps {
  stats: SystemStats;
}

export function DashboardContent({ stats }: DashboardContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visão geral do sistema HalfTrip</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatWidget
          label="Total de Usuários"
          value={<p className="text-2xl font-bold">{stats.totalUsers}</p>}
          icon={Users}
          description={`${stats.newUsersThisMonth} novos este mês`}
        />

        <StatWidget
          label="Usuários Bloqueados"
          value={<p className="text-2xl font-bold">{stats.blockedUsers}</p>}
          icon={ShieldOff}
        />

        <StatWidget
          label="Total de Viagens"
          value={<p className="text-2xl font-bold">{stats.totalTrips}</p>}
          icon={Map}
          description={`${stats.activeTripsThisMonth} ativas`}
        />

        <StatWidget
          label="Total de Despesas"
          value={<p className="text-2xl font-bold">{stats.totalExpenses}</p>}
          icon={Receipt}
        />

        <StatWidget
          label="Total de Acertos"
          value={<p className="text-2xl font-bold">{stats.totalSettlements}</p>}
          icon={ArrowLeftRight}
        />

        <StatWidget
          label="Novos Este Mês"
          value={<p className="text-2xl font-bold">{stats.newUsersThisMonth}</p>}
          icon={UserPlus}
        />
      </div>
    </div>
  );
}
