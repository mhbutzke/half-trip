'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/ui/money-display';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntityBalance } from '@/lib/balance';

interface BalanceItem {
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  participantType: 'member' | 'guest';
  balance: number;
}

interface BalanceBarChartProps {
  participants?: BalanceItem[];
  entities?: EntityBalance[];
  currency: string;
  className?: string;
}

type ChartItem = {
  id: string;
  name: string;
  balance: number;
  isGroup: boolean;
};

export function BalanceBarChart({
  participants,
  entities,
  currency,
  className,
}: BalanceBarChartProps) {
  // Normalize to chart items
  const items: ChartItem[] = entities
    ? entities.map((e) => ({
        id: e.entityId,
        name: e.displayName,
        balance: e.netBalance,
        isGroup: e.entityType === 'group',
      }))
    : (participants ?? []).map((p) => ({
        id: p.participantId,
        name: p.participantName,
        balance: p.balance,
        isGroup: false,
      }));

  // Find max absolute value for scaling
  const maxAbsValue = items.length > 0 ? Math.max(...items.map((i) => Math.abs(i.balance))) : 0;

  const sortedItems = [...items].sort((a, b) => b.balance - a.balance);

  const getBarWidth = (balance: number) => {
    if (maxAbsValue === 0) return 0;
    return (Math.abs(balance) / maxAbsValue) * 100;
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0.01) return 'positive';
    if (balance < -0.01) return 'negative';
    return 'neutral';
  };

  const getStatusIcon = (status: string, isGroup: boolean) => {
    if (isGroup) return <Users className="h-4 w-4" aria-hidden="true" />;
    if (status === 'positive') return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
    if (status === 'negative') return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
    return <Minus className="h-4 w-4" aria-hidden="true" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'positive') return 'bg-green-500';
    if (status === 'negative') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusTextColor = (status: string) => {
    if (status === 'positive') return 'text-green-600 dark:text-green-400';
    if (status === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Balanço visual</CardTitle>
        <CardDescription>
          Quem está no positivo (recebe) e quem está no negativo (deve)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const status = getBalanceStatus(item.balance);
            const barWidth = getBarWidth(item.balance);

            return (
              <div key={item.id} className="space-y-1">
                {/* Name and balance */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status, item.isGroup)}
                    <span className="font-medium">
                      {item.isGroup ? item.name : item.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className={cn('font-semibold', getStatusTextColor(status))}>
                    <MoneyDisplay
                      amount={Math.abs(item.balance)}
                      currency={currency}
                      size="sm"
                      showSign={false}
                    />
                  </span>
                </div>

                {/* Bar */}
                <div className="relative h-6 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      getStatusColor(status),
                      'flex items-center justify-center'
                    )}
                    style={{ width: `${barWidth}%` }}
                  >
                    {barWidth > 20 && (
                      <span className="text-xs font-semibold text-white px-2 truncate">
                        {status === 'positive'
                          ? 'Recebe'
                          : status === 'negative'
                            ? 'Deve'
                            : 'Quitado'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Recebe dinheiro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Deve dinheiro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span>Quitado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
