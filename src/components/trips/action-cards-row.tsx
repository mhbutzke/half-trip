'use client';

import { Link } from 'next-view-transitions';
import { ArrowRight, Receipt, CheckSquare, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

interface ActionCard {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: React.ElementType;
  href: string;
  variant: 'default' | 'success' | 'warning';
}

interface ActionCardsRowProps {
  pendingSettlements: number;
  recentExpensesCount: number;
  pendingChecklistsCount: number;
  upcomingTripId?: string;
}

export function ActionCardsRow({
  pendingSettlements,
  recentExpensesCount,
  pendingChecklistsCount,
  upcomingTripId,
}: ActionCardsRowProps) {
  const cards: ActionCard[] = [
    {
      id: 'settlements',
      title: 'Acertos pendentes',
      description: upcomingTripId ? 'Pagamentos a fazer' : 'Sem viagem ativa',
      count: pendingSettlements,
      icon: ArrowRightLeft,
      href: upcomingTripId ? routes.trip.balance(upcomingTripId) : routes.trips(),
      variant: pendingSettlements > 0 ? 'warning' : 'default',
    },
    {
      id: 'expenses',
      title: 'Gastos recentes',
      description: recentExpensesCount > 0 ? 'Últimos 7 dias' : 'Nenhum gasto',
      count: recentExpensesCount,
      icon: Receipt,
      href: upcomingTripId ? routes.trip.expenses(upcomingTripId) : routes.trips(),
      variant: 'default',
    },
    {
      id: 'checklists',
      title: 'Tarefas pendentes',
      description: upcomingTripId ? 'Preparativos' : 'Sem tarefas',
      count: pendingChecklistsCount,
      icon: CheckSquare,
      href: upcomingTripId ? routes.trip.checklists(upcomingTripId) : routes.trips(),
      variant: pendingChecklistsCount > 0 ? 'success' : 'default',
    },
  ];

  const hasAnyActions =
    pendingSettlements > 0 || recentExpensesCount > 0 || pendingChecklistsCount > 0;

  if (!hasAnyActions) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Ações rápidas</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory hide-scrollbar">
        {cards.map((card) => {
          const Icon = card.icon;
          const badgeVariant =
            card.variant === 'warning'
              ? 'destructive'
              : card.variant === 'success'
                ? 'default'
                : 'secondary';

          return (
            <Card
              key={card.id}
              className="min-w-[280px] flex-shrink-0 snap-center sm:min-w-0 sm:flex-1 transition-all hover:shadow-md hover:border-primary/20"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  {card.count > 0 && (
                    <Badge variant={badgeVariant} className="tabular-nums">
                      {card.count}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 mb-3">
                  <h4 className="font-semibold text-sm">{card.title}</h4>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="w-full justify-between group">
                  <Link href={card.href}>
                    Ver
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
