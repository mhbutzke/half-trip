'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatAmount } from '@/lib/validation/expense-schemas';
import { SwipeAction } from '@/components/ui/swipe-action';
import { ExpenseCard } from './expense-card';
import type { ExpenseWithDetails } from '@/types/expense';

interface ExpenseDateGroupProps {
  date: string;
  expenses: ExpenseWithDetails[];
  baseCurrency: string;
  canEditExpense: (expense: ExpenseWithDetails) => boolean;
  onEdit: (expense: ExpenseWithDetails) => void;
  onDelete: (expense: ExpenseWithDetails) => void;
  onSwipeDelete: (expense: ExpenseWithDetails) => void;
}

export function ExpenseDateGroup({
  date,
  expenses,
  baseCurrency,
  canEditExpense,
  onEdit,
  onDelete,
  onSwipeDelete,
}: ExpenseDateGroupProps) {
  const dayTotal = expenses.reduce((sum, exp) => sum + exp.amount * (exp.exchange_rate ?? 1), 0);

  const formattedDate = format(new Date(date), "EEE, d 'de' MMM", { locale: ptBR });

  return (
    <div>
      <div className="sticky top-24 z-30 flex items-center justify-between bg-background/95 px-1 py-2 backdrop-blur md:static md:bg-transparent md:backdrop-blur-none">
        <span className="text-xs font-medium capitalize text-muted-foreground">
          {formattedDate}
        </span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {formatAmount(dayTotal, baseCurrency)}
        </span>
      </div>
      <div className="space-y-2">
        {expenses.map((expense) => (
          <SwipeAction
            key={expense.id}
            onDelete={() => onSwipeDelete(expense)}
            confirmMessage={`Excluir despesa "${expense.description}"?`}
            disabled={!canEditExpense(expense)}
          >
            <ExpenseCard
              expense={expense}
              baseCurrency={baseCurrency}
              canEdit={canEditExpense(expense)}
              onEdit={() => onEdit(expense)}
              onDelete={() => onDelete(expense)}
            />
          </SwipeAction>
        ))}
      </div>
    </div>
  );
}
