'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { MoneyDisplay } from '@/components/ui/money-display';
import { getExpensesByActivityId } from '@/lib/supabase/expenses';

interface ActivityExpensesSectionProps {
  activityId: string;
}

type ExpenseData = {
  activityId: string;
  expenses: { id: string; description: string; amount: number; currency: string }[];
};

export function ActivityExpensesSection({ activityId }: ActivityExpensesSectionProps) {
  const [data, setData] = useState<ExpenseData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getExpensesByActivityId(activityId).then((expenses) => {
      if (!cancelled) setData({ activityId, expenses });
    });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  if (!data || data.activityId !== activityId || data.expenses.length === 0) return null;

  const { expenses } = data;
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const currency = expenses[0]?.currency || 'BRL';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Despesas vinculadas
        </span>
      </div>
      <div className="space-y-1.5">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
          >
            <span className="truncate mr-2">{expense.description}</span>
            <MoneyDisplay amount={expense.amount} currency={expense.currency} size="sm" />
          </div>
        ))}
      </div>
      {expenses.length > 1 && (
        <div className="flex items-center justify-between text-sm font-medium pt-1">
          <span className="text-muted-foreground">Total</span>
          <MoneyDisplay amount={total} currency={currency} size="sm" />
        </div>
      )}
    </div>
  );
}
