'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, DollarSign, TrendingUp, Download, Share2 } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/money-display';
import { formatAmount } from '@/lib/validation/expense-schemas';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCategoryInfo } from '@/lib/utils/expense-categories';
import { cn } from '@/lib/utils';
import type { ExpenseCategory, Trip } from '@/types/database';

interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  percentage: number;
  count: number;
}

interface TripSummaryData {
  trip: Trip;
  totalExpenses: number;
  participantCount: number;
  perPersonAverage: number;
  categoryBreakdown: CategorySummary[];
  activityCount: number;
  dayCount: number;
}

interface TripSummaryCardProps {
  data: TripSummaryData;
  onShare?: () => void;
  onExport?: () => void;
  className?: string;
}

export function TripSummaryCard({ data, onShare, onExport, className }: TripSummaryCardProps) {
  const {
    trip,
    totalExpenses,
    participantCount,
    perPersonAverage,
    categoryBreakdown,
    activityCount,
  } = data;

  const tripDuration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;

  const formattedPeriod = `${format(new Date(trip.start_date), "d 'de' MMM", { locale: ptBR })} - ${format(new Date(trip.end_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-accent">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{trip.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {trip.destination || 'Destino não definido'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Concluída
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedPeriod}
          </span>
          <span>•</span>
          <span>{tripDuration} dias</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Financial Summary */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Resumo Financeiro
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Total Gasto</p>
              <MoneyDisplay
                amount={totalExpenses}
                currency={trip.base_currency}
                size="lg"
                className="mt-1"
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Por Pessoa</p>
              <MoneyDisplay
                amount={perPersonAverage}
                currency={trip.base_currency}
                size="lg"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Categorias
            </h3>
            <div className="space-y-2">
              {categoryBreakdown.slice(0, 3).map((cat, index) => {
                const categoryInfo = getCategoryInfo(cat.category);
                const CategoryIcon = categoryInfo.icon;

                return (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                        <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CategoryIcon className={cn('h-4 w-4', categoryInfo.color)} />
                          <span className="font-medium text-sm">{categoryInfo.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} {cat.count === 1 ? 'despesa' : 'despesas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatAmount(cat.total, trip.base_currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(0)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity Summary */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Atividades
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-2xl font-bold">{activityCount}</p>
              <p className="text-xs text-muted-foreground">Total de atividades</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-2xl font-bold">{participantCount}</p>
              <p className="text-xs text-muted-foreground">Participantes</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onShare && (
            <Button variant="outline" className="flex-1" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
          )}
          {onExport && (
            <Button variant="outline" className="flex-1" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Generate shareable text summary
 */
export function generateTripSummaryText(data: TripSummaryData): string {
  const { trip, totalExpenses, perPersonAverage, categoryBreakdown, activityCount } = data;

  const formattedPeriod = `${format(new Date(trip.start_date), "d 'de' MMM", { locale: ptBR })} - ${format(new Date(trip.end_date), "d 'de' MMM", { locale: ptBR })}`;

  let text = `✈️ ${trip.name}\n`;
  text += `📍 ${trip.destination || 'Destino não definido'}\n`;
  text += `📅 ${formattedPeriod}\n\n`;

  text += `💰 RESUMO FINANCEIRO\n`;
  text += `Total gasto: ${formatAmount(totalExpenses, trip.base_currency)}\n`;
  text += `Por pessoa: ${formatAmount(perPersonAverage, trip.base_currency)}\n\n`;

  if (categoryBreakdown.length > 0) {
    text += `🏆 TOP CATEGORIAS\n`;
    categoryBreakdown.slice(0, 3).forEach((cat, index) => {
      const categoryInfo = getCategoryInfo(cat.category);
      text += `${index + 1}. ${categoryInfo.label}: ${formatAmount(cat.total, trip.base_currency)} (${cat.percentage.toFixed(0)}%)\n`;
    });
    text += '\n';
  }

  text += `📍 ${activityCount} atividades planejadas\n`;
  text += `\n---\n`;
  text += `✈️ Criado com Half Trip`;

  return text;
}
