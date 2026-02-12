'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BudgetProgress } from './budget-progress';
import { getCategoryInfo } from '@/lib/utils/expense-categories';
import { formatCurrency } from '@/lib/utils/currency';
import { budgetCategoryLabels } from '@/lib/validation/budget-schemas';
import type { BudgetWithSpending } from '@/types/budget';
import type { ExpenseCategory } from '@/types/database';

interface BudgetCategoryCardProps {
  budget: BudgetWithSpending;
  isOrganizer: boolean;
  onEdit: (budget: BudgetWithSpending) => void;
  onDelete: (budget: BudgetWithSpending) => void;
}

export function BudgetCategoryCard({
  budget,
  isOrganizer,
  onEdit,
  onDelete,
}: BudgetCategoryCardProps) {
  const isTotal = budget.category === 'total';
  const categoryInfo = isTotal ? null : getCategoryInfo(budget.category as ExpenseCategory);
  const Icon = categoryInfo?.icon;
  const label = budgetCategoryLabels[budget.category] || budget.category;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${categoryInfo?.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${categoryInfo?.color}`} aria-hidden="true" />
              </div>
            )}
            {isTotal && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary" aria-hidden="true">
                  $
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(budget.spent, budget.currency)} de{' '}
                {formatCurrency(budget.amount, budget.currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Badge
              variant={
                budget.status === 'exceeded'
                  ? 'destructive'
                  : budget.status === 'warning'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {Math.round(budget.percentage)}%
            </Badge>
            {isOrganizer && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(budget)}
                  aria-label={`Editar orçamento de ${label}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete(budget)}
                  aria-label={`Excluir orçamento de ${label}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <BudgetProgress percentage={budget.percentage} status={budget.status} />
        </div>

        {budget.remaining < 0 && (
          <p className="mt-2 text-sm font-medium text-destructive">
            Excedido em {formatCurrency(Math.abs(budget.remaining), budget.currency)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
