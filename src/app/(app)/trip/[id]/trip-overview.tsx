'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, DollarSign, Plus, Scale, ChevronRight, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InviteDialog } from '@/components/invites/invite-dialog';
import { StatWidget } from '@/components/ui/stat-widget';
import { MoneyDisplay } from '@/components/ui/money-display';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import { formatCurrency } from '@/lib/utils/currency';
import type { TripWithMembers } from '@/lib/supabase/trips';
import type { DashboardData } from '@/lib/supabase/dashboard';

// Lazy load dialogs - only needed when user clicks a CTA button
const AddActivityDialog = dynamic(
  () =>
    import('@/components/activities/add-activity-dialog').then((mod) => ({
      default: mod.AddActivityDialog,
    })),
  { ssr: false }
);
const AddNoteDialog = dynamic(
  () =>
    import('@/components/notes/add-note-dialog').then((mod) => ({
      default: mod.AddNoteDialog,
    })),
  { ssr: false }
);

interface TripOverviewProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
  currentUserId?: string;
  dashboard?: DashboardData | null;
}

export function TripOverview({ trip, userRole, currentUserId, dashboard }: TripOverviewProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Enable real-time updates for this trip
  useTripRealtime({ tripId: trip.id });

  const baseCurrency = dashboard?.baseCurrency ?? 'BRL';

  // Format date for next activity
  const formatActivityDate = (date: string, time: string | null) => {
    const d = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateStr: string;
    if (d.getTime() === today.getTime()) {
      dateStr = 'Hoje';
    } else if (d.getTime() === tomorrow.getTime()) {
      dateStr = 'Amanhã';
    } else {
      dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    if (time) {
      return `${dateStr} às ${time.slice(0, 5)}`;
    }
    return dateStr;
  };

  // Budget progress
  const budgetPercentage =
    dashboard?.budgetTotal && dashboard.budgetUsed != null
      ? Math.min(100, Math.round((dashboard.budgetUsed / dashboard.budgetTotal) * 100))
      : null;

  return (
    <>
      <div className="space-y-4">
        {/* Balance Widget - Full Width */}
        <StatWidget
          label="Meu saldo"
          icon={Scale}
          value={
            <MoneyDisplay
              amount={dashboard?.userBalance ?? 0}
              currency={baseCurrency}
              size="xl"
              colorBySign
              showSign
            />
          }
          description={dashboard?.balanceDescription ?? 'Sem despesas ainda'}
          onClick={() => router.push(`/trip/${trip.id}/balance`)}
        />

        {/* Two-column grid: Next Activity + Total Expenses */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Next Activity */}
          <StatWidget
            label="Próxima atividade"
            icon={Calendar}
            value={
              dashboard?.nextActivity ? (
                <p className="text-sm font-medium leading-tight">{dashboard.nextActivity.title}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma atividade futura</p>
              )
            }
            description={
              dashboard?.nextActivity
                ? formatActivityDate(dashboard.nextActivity.date, dashboard.nextActivity.time)
                : undefined
            }
            onClick={() => router.push(`/trip/${trip.id}/itinerary`)}
          />

          {/* Total Expenses */}
          <StatWidget
            label="Total de despesas"
            icon={Receipt}
            value={
              <MoneyDisplay
                amount={dashboard?.totalExpenses ?? 0}
                currency={baseCurrency}
                size="lg"
              />
            }
            description={
              dashboard?.expenseCount
                ? `${dashboard.expenseCount} ${dashboard.expenseCount === 1 ? 'despesa' : 'despesas'}`
                : 'Nenhuma despesa registrada'
            }
            onClick={() => router.push(`/trip/${trip.id}/expenses`)}
          />
        </div>

        {/* Trip Progress + Budget */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Trip Days Progress */}
              {dashboard && dashboard.tripProgress.currentDay > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso da viagem</span>
                    <span className="font-medium">
                      Dia{' '}
                      {Math.min(
                        dashboard.tripProgress.currentDay,
                        dashboard.tripProgress.totalDays
                      )}
                      /{dashboard.tripProgress.totalDays}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (dashboard.tripProgress.currentDay / dashboard.tripProgress.totalDays) * 100
                    )}
                    className="h-2"
                  />
                </div>
              )}

              {/* Budget Progress */}
              {budgetPercentage != null && dashboard?.budgetTotal && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orçamento</span>
                    <span className="font-medium">{budgetPercentage}% utilizado</span>
                  </div>
                  <Progress
                    value={budgetPercentage}
                    className={`h-2 ${
                      budgetPercentage > 100
                        ? '[&>div]:bg-destructive'
                        : budgetPercentage > 80
                          ? '[&>div]:bg-warning'
                          : '[&>div]:bg-success'
                    }`}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(dashboard.budgetUsed ?? 0, baseCurrency)} de{' '}
                    {formatCurrency(dashboard.budgetTotal, baseCurrency)}
                  </p>
                </div>
              )}

              {/* Fallback when trip hasn't started yet */}
              {dashboard && dashboard.tripProgress.currentDay <= 0 && budgetPercentage == null && (
                <p className="text-sm text-muted-foreground">
                  A viagem começa em{' '}
                  {new Date(trip.start_date).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        {dashboard && dashboard.pendingSettlements.count > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pendências</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.pendingSettlements.count > 0 && (
                <Link
                  href={`/trip/${trip.id}/balance`}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                      <DollarSign className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Pagar{' '}
                        <MoneyDisplay
                          amount={dashboard.pendingSettlements.totalAmount}
                          currency={baseCurrency}
                          size="sm"
                          className="font-semibold"
                        />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dashboard.pendingSettlements.count}{' '}
                        {dashboard.pendingSettlements.count === 1
                          ? 'pagamento pendente'
                          : 'pagamentos pendentes'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsActivityOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Atividade
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/trip/${trip.id}/expenses/add`)}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Despesa
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsNoteOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Nota
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Convidar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <InviteDialog
        tripId={trip.id}
        tripName={trip.name}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        userRole={userRole}
        currentUserId={currentUserId}
      />

      {/* Add Activity Dialog */}
      <AddActivityDialog
        tripId={trip.id}
        defaultDate={trip.start_date}
        open={isActivityOpen}
        onOpenChange={setIsActivityOpen}
        onSuccess={() => {
          setIsActivityOpen(false);
          router.refresh();
        }}
      />

      {/* Add Note Dialog */}
      <AddNoteDialog
        tripId={trip.id}
        open={isNoteOpen}
        onOpenChange={setIsNoteOpen}
        onNoteCreated={() => {
          setIsNoteOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
