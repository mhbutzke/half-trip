'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  DollarSign,
  Plus,
  Receipt,
  Scale,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InviteDialog } from '@/components/invites/invite-dialog';
import { StatWidget } from '@/components/ui/stat-widget';
import { MoneyDisplay } from '@/components/ui/money-display';
import { PollCard } from '@/components/polls/poll-card';
import { CreatePollDialog } from '@/components/polls/create-poll-dialog';
import { TripRecapCard } from '@/components/recap/trip-recap-card';
import { BadgeDisplay } from '@/components/badges/badge-display';
import { computeBadges } from '@/lib/utils/travel-badges';
import { computeTripReadiness } from '@/lib/utils/trip-readiness';
import { computeTripProgress } from '@/lib/utils/trip-progress';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import { parseDateOnly } from '@/lib/utils/date-only';
import { routes } from '@/lib/routes';
import { getTripActivityLog } from '@/lib/supabase/activity-log';
import type { TripParticipantResolved } from '@/lib/supabase/participants';
import { TripItineraryPreview } from '@/components/itinerary/trip-itinerary-preview';
import type { TripWithMembers } from '@/lib/supabase/trips';
import type { DashboardData } from '@/lib/supabase/dashboard';
import type { ActivityLogEntry } from '@/types/activity-log';
import type { PollWithVotes } from '@/types/poll';
import type { TripRecapData } from '@/lib/utils/trip-recap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ActivityLogFeed = dynamic(
  () =>
    import('@/components/activity-log/activity-log-feed').then((mod) => ({
      default: mod.ActivityLogFeed,
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
const AddExpenseDialog = dynamic(
  () =>
    import('@/components/expenses/add-expense-dialog').then((mod) => ({
      default: mod.AddExpenseDialog,
    })),
  { ssr: false }
);

interface TripOverviewProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
  currentUserId?: string;
  dashboard?: DashboardData | null;
  initialPolls?: PollWithVotes[];
  initialRecapData?: TripRecapData | null;
  participants?: TripParticipantResolved[];
}

export function TripOverview({
  trip,
  userRole,
  currentUserId,
  dashboard,
  initialPolls,
  initialRecapData,
  participants = [],
}: TripOverviewProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isFinancesOpen, setIsFinancesOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [activityLogData, setActivityLogData] = useState<{
    entries: ActivityLogEntry[];
    hasMore: boolean;
  } | null>(null);

  const currentParticipantId = useMemo(
    () => participants.find((p) => p.userId === currentUserId)?.id ?? '',
    [participants, currentUserId]
  );

  const [openItineraryAdd, setOpenItineraryAdd] = useState<((date?: string) => void) | null>(null);
  const refreshTripData = useCallback(() => {
    router.refresh();
  }, [router]);

  // Enable real-time updates for this trip
  useTripRealtime({
    tripId: trip.id,
    onPollChange: refreshTripData,
  });

  const baseCurrency = dashboard?.baseCurrency ?? 'BRL';
  const tripProgress = useMemo(
    () => computeTripProgress(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );
  const isPreTrip = tripProgress.currentDay === 0;

  // Budget progress
  const budgetPercentage =
    dashboard?.budgetTotal && dashboard.budgetUsed != null
      ? Math.min(100, Math.round((dashboard.budgetUsed / dashboard.budgetTotal) * 100))
      : null;

  // Compute badges from available data
  const tripEnded = useMemo(() => {
    const normalize = (d: Date) => {
      const out = new Date(d);
      out.setHours(0, 0, 0, 0);
      return out;
    };
    const end = normalize(parseDateOnly(trip.end_date));
    const today = normalize(new Date());
    return today.getTime() > end.getTime();
  }, [trip.end_date]);
  const earnedBadges = tripEnded
    ? computeBadges({
        tripCount: 1,
        totalExpenses: dashboard?.expenseCount ?? 0,
        hasReceipt: false,
        budgetKept: budgetPercentage != null ? budgetPercentage <= 100 : true,
        checklistComplete: initialRecapData?.checklistCompletionPercent === 100,
        participantCount: initialRecapData?.participantCount ?? trip.trip_members.length,
        activitiesCount: initialRecapData?.activitiesCount ?? 0,
        daysCount: initialRecapData?.durationDays ?? 0,
      })
    : [];

  const readiness =
    isPreTrip && dashboard
      ? computeTripReadiness({
          memberCount: trip.memberCount,
          activityCountTotal: dashboard.activityCountTotal,
          checklistCount: dashboard.checklistCount,
          budgetTotal: dashboard.budgetTotal,
          userRole,
        })
      : null;

  const loadActivityLog = useCallback(() => {
    if (activityLogLoading) return;
    if (activityLogData) return;

    setActivityLogLoading(true);
    getTripActivityLog(trip.id, 30, 0)
      .then((res) => setActivityLogData(res))
      .catch(() => toast.error('Erro ao carregar atividade recente'))
      .finally(() => setActivityLogLoading(false));
  }, [activityLogData, activityLogLoading, trip.id]);

  const handleActivityLogOpenChange = useCallback(
    (open: boolean) => {
      setIsActivityLogOpen(open);
      if (open) loadActivityLog();
    },
    [loadActivityLog]
  );

  const readinessIcon = (key: 'participants' | 'itinerary' | 'checklists' | 'budget') => {
    switch (key) {
      case 'participants':
        return Users;
      case 'itinerary':
        return Calendar;
      case 'checklists':
        return CheckSquare;
      case 'budget':
        return Wallet;
      default:
        return CheckCircle2;
    }
  };

  const primarySurfaceClass =
    'border-border/70 bg-gradient-to-b from-card to-card/95 shadow-sm shadow-primary/5';
  const secondarySurfaceClass =
    'border-border/60 bg-gradient-to-b from-background to-background/95 shadow-sm';
  const tertiarySurfaceClass = 'border-border/50 bg-background';

  const readinessCard = readiness ? (
    <Card className={primarySurfaceClass}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Preparação da viagem</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {readiness.isReady
                ? 'Tudo pronto para começar.'
                : `Faltam ${readiness.missing} de ${readiness.total} para ficar pronto`}
            </p>
          </div>
          {readiness.isReady && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(routes.trip.itinerary(trip.id))}
            >
              Ver roteiro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Prontidão</span>
            <span className="font-medium text-foreground">{readiness.score}%</span>
          </div>
          <Progress value={readiness.score} className="h-2" />
        </div>

        <div className="space-y-2">
          {readiness.items.map((item) => {
            const Icon = readinessIcon(item.key);
            const cta =
              item.key === 'participants'
                ? item.done
                  ? {
                      label: 'Grupo',
                      onClick: () => router.push(routes.trip.participants(trip.id)),
                    }
                  : { label: 'Convidar', onClick: () => setIsInviteOpen(true) }
                : item.key === 'itinerary'
                  ? item.done
                    ? { label: 'Abrir', onClick: () => router.push(routes.trip.itinerary(trip.id)) }
                    : {
                        label: 'Adicionar',
                        onClick: () =>
                          openItineraryAdd
                            ? openItineraryAdd()
                            : router.push(routes.trip.itinerary(trip.id)),
                      }
                  : item.key === 'checklists'
                    ? {
                        label: item.done ? 'Abrir' : 'Criar',
                        onClick: () => router.push(routes.trip.checklists(trip.id)),
                      }
                    : {
                        label:
                          !item.done && userRole === 'organizer'
                            ? 'Definir'
                            : item.done
                              ? 'Ver'
                              : 'Abrir',
                        onClick: () => router.push(routes.trip.budget(trip.id)),
                      };

            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/80 p-3.5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    {item.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={cta.onClick}>
                  {cta.label}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  ) : null;

  const balanceWidget = (
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
      onClick={() => router.push(routes.trip.balance(trip.id))}
    />
  );

  const totalExpensesWidget = (
    <StatWidget
      label="Total de despesas"
      icon={Receipt}
      value={
        <MoneyDisplay amount={dashboard?.totalExpenses ?? 0} currency={baseCurrency} size="lg" />
      }
      description={
        dashboard?.expenseCount
          ? `${dashboard.expenseCount} ${dashboard.expenseCount === 1 ? 'despesa' : 'despesas'}`
          : 'Nenhuma despesa registrada'
      }
      onClick={() => router.push(routes.trip.expenses(trip.id))}
    />
  );

  return (
    <>
      <div data-testid="trip-overview-root" className="space-y-6">
        {/* Cover Image Hero */}
        {trip.cover_url && (
          <div className="relative -mx-4 -mt-6 h-40 overflow-hidden rounded-b-xl sm:mx-0 sm:mt-0 sm:rounded-xl">
            <Image
              src={trip.cover_url}
              alt={`Capa de ${trip.name}`}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-background/45" />
          </div>
        )}

        {/* Roteiro (preview interativo) */}
        <TripItineraryPreview
          tripId={trip.id}
          startDate={trip.start_date}
          endDate={trip.end_date}
          userRole={userRole}
          onRegisterAdd={(fn) => setOpenItineraryAdd(() => fn)}
        />

        {/* Preparação (pré-viagem) */}
        {isPreTrip ? readinessCard : null}

        {/* Progresso da viagem (timezone do usuário) */}
        <Card className={secondarySurfaceClass}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Trip Days Progress */}
              {tripProgress.currentDay > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso da viagem</span>
                    <span className="font-medium">
                      Dia {Math.min(tripProgress.currentDay, tripProgress.totalDays)}/
                      {tripProgress.totalDays}
                    </span>
                  </div>
                  <Progress value={tripProgress.percentage} className="h-2" />
                </div>
              )}

              {/* Fallback when trip hasn't started yet */}
              {isPreTrip && (
                <p className="text-sm text-muted-foreground">
                  A viagem começa em{' '}
                  {parseDateOnly(trip.start_date).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mais (colapsável) */}
        <Card className={tertiarySurfaceClass}>
          <button
            type="button"
            className="w-full text-left"
            aria-expanded={isMoreOpen}
            onClick={() => setIsMoreOpen((v) => !v)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">Mais</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Votações, recap e atividade recente
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </div>
            </CardHeader>
          </button>
          {isMoreOpen && (
            <CardContent className="space-y-4">
              {/* Polls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Votações</h2>
                  <Button variant="ghost" size="sm" onClick={() => setCreatePollOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                    Nova
                  </Button>
                </div>
                {initialPolls && initialPolls.length > 0 ? (
                  <div className="space-y-3">
                    {initialPolls.map((poll) => (
                      <PollCard
                        key={poll.id}
                        poll={poll}
                        currentUserId={currentUserId || ''}
                        isOrganizer={userRole === 'organizer'}
                        onUpdate={refreshTripData}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-foreground/65">
                    Nenhuma votação ainda.
                  </div>
                )}
              </div>

              {/* Recap + badges */}
              {tripEnded && initialRecapData ? (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold">Trip Recap</h2>
                  <TripRecapCard recap={initialRecapData} />
                  {earnedBadges.length > 0 && <BadgeDisplay earned={earnedBadges} />}
                </div>
              ) : null}

              {/* Activity log access */}
              <div className="space-y-2">
                <h2 className="text-base font-semibold">Atividade recente</h2>
                <Button variant="outline" onClick={() => handleActivityLogOpenChange(true)}>
                  Ver atividade recente
                </Button>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <h2 className="text-base font-semibold">Ações rápidas</h2>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsExpenseOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Despesa
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsNoteOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Nota
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCreatePollOpen(true)}>
                    <BarChart3 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Votação
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Convidar
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Finanças (colapsável) */}
        <Card className={secondarySurfaceClass}>
          <button
            type="button"
            className="w-full text-left"
            aria-expanded={isFinancesOpen}
            onClick={() => setIsFinancesOpen((v) => !v)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">Finanças</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Saldo, despesas, pendências e orçamento
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isFinancesOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </div>
            </CardHeader>
          </button>
          {isFinancesOpen && (
            <CardContent className="space-y-4">
              {balanceWidget}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{totalExpensesWidget}</div>

              {/* Pendências */}
              {dashboard && dashboard.pendingSettlements.count > 0 ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                      <DollarSign className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(routes.trip.balance(trip.id))}
                    >
                      Abrir
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Orçamento */}
              {budgetPercentage != null && dashboard?.budgetTotal ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
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
                    <MoneyDisplay
                      amount={dashboard.budgetUsed ?? 0}
                      currency={baseCurrency}
                      size="sm"
                    />{' '}
                    de{' '}
                    <MoneyDisplay
                      amount={dashboard.budgetTotal}
                      currency={baseCurrency}
                      size="sm"
                    />
                  </p>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(routes.trip.budget(trip.id))}
                    >
                      Abrir orçamento
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          )}
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

      {/* Add Expense Dialog */}
      {currentUserId && (
        <AddExpenseDialog
          tripId={trip.id}
          participants={participants}
          currentUserId={currentUserId}
          currentParticipantId={currentParticipantId}
          baseCurrency={trip.base_currency}
          open={isExpenseOpen}
          onOpenChange={setIsExpenseOpen}
          onSuccess={() => {
            setIsExpenseOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* Create Poll Dialog */}
      <CreatePollDialog
        tripId={trip.id}
        open={createPollOpen}
        onOpenChange={setCreatePollOpen}
        onSuccess={() => {
          setCreatePollOpen(false);
          refreshTripData();
        }}
      />

      <Dialog open={isActivityLogOpen} onOpenChange={handleActivityLogOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atividade recente</DialogTitle>
            <DialogDescription>Registro das últimas mudanças na viagem.</DialogDescription>
          </DialogHeader>
          {activityLogLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Carregando...</div>
          ) : activityLogData ? (
            <ActivityLogFeed
              tripId={trip.id}
              initialEntries={activityLogData.entries}
              initialHasMore={activityLogData.hasMore}
            />
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Sem dados.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
