'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/ui/money-display';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceItem {
  userId: string;
  userName: string;
  userAvatar: string | null;
  balance: number;
}

interface BalanceBarChartProps {
  participants: BalanceItem[];
  currency: string;
  className?: string;
}

export function BalanceBarChart({ participants, currency, className }: BalanceBarChartProps) {
  // Find max absolute value for scaling
  const maxAbsValue =
    participants.length > 0 ? Math.max(...participants.map((p) => Math.abs(p.balance))) : 0;

  // Separate positive and negative balances
  const sortedParticipants = [...participants].sort((a, b) => b.balance - a.balance);

  const getBarWidth = (balance: number) => {
    if (maxAbsValue === 0) return 0;
    return (Math.abs(balance) / maxAbsValue) * 100;
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0.01) return 'positive';
    if (balance < -0.01) return 'negative';
    return 'neutral';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'positive') return <TrendingUp className="h-4 w-4" />;
    if (status === 'negative') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
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
          {sortedParticipants.map((participant) => {
            const status = getBalanceStatus(participant.balance);
            const barWidth = getBarWidth(participant.balance);

            return (
              <div key={participant.userId} className="space-y-1">
                {/* Name and balance */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span className="font-medium">{participant.userName.split(' ')[0]}</span>
                  </div>
                  <span className={cn('font-semibold', getStatusTextColor(status))}>
                    <MoneyDisplay
                      amount={Math.abs(participant.balance)}
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
