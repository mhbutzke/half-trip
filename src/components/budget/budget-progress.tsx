'use client';

import { cn } from '@/lib/utils';

interface BudgetProgressProps {
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
  className?: string;
}

export function BudgetProgress({ percentage, status, className }: BudgetProgressProps) {
  const clampedPercentage = Math.min(percentage, 100);

  return (
    <div className={cn('h-2 w-full rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', {
          'bg-emerald-500': status === 'safe',
          'bg-amber-500': status === 'warning',
          'bg-red-500': status === 'exceeded',
        })}
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
