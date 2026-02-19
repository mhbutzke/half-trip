'use client';

import { cn } from '@/lib/utils';

interface BudgetProgressProps {
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
  className?: string;
}

export function BudgetProgress({ percentage, status, className }: BudgetProgressProps) {
  const clampedPercentage = Math.min(percentage, 100);

  const getFill = () => {
    if (status === 'safe') return 'bg-budget-safe';
    if (status === 'warning') return 'bg-budget-warning';
    return 'bg-budget-exceeded';
  };

  return (
    <div className={cn('h-2.5 w-full rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', getFill())}
        style={{ width: `${clampedPercentage}%` }}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(percentage)}% do orçamento utilizado`}
      />
    </div>
  );
}
