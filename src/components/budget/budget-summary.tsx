'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetProgress } from './budget-progress';
import { MoneyDisplay } from '@/components/ui/money-display';
import type { BudgetSummary as BudgetSummaryType } from '@/types/budget';

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
}

export function BudgetSummaryCard({ summary }: BudgetSummaryProps) {
  if (summary.totalBudget === null) return null;

  const percentage = summary.totalBudget > 0 ? (summary.totalSpent / summary.totalBudget) * 100 : 0;
  const remaining = summary.totalBudget - summary.totalSpent;
  const status = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : ('safe' as const);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Orçamento Total</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <MoneyDisplay amount={summary.totalSpent} currency={summary.currency} size="xl" />
            <p className="text-sm text-muted-foreground">
              de <MoneyDisplay amount={summary.totalBudget} currency={summary.currency} size="sm" />
            </p>
          </div>
          <p
            className={`text-sm font-medium ${
              remaining < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            <MoneyDisplay amount={Math.abs(remaining)} currency={summary.currency} size="sm" />{' '}
            {remaining >= 0 ? 'restante' : 'excedido'}
          </p>
        </div>

        <BudgetProgress percentage={percentage} status={status} />
      </CardContent>
    </Card>
  );
}
