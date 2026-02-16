'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  /**
   * Progress value from 0 to 100
   */
  value: number;
  /**
   * Label for the progress bar
   */
  label: string;
  /**
   * Color variant based on progress level
   * low: 0-50% (warning)
   * medium: 50-80% (primary)
   * high: 80-100% (success)
   */
  variant?: 'low' | 'medium' | 'high' | 'auto';
  /**
   * Optional className for the container
   */
  className?: string;
  /**
   * Show percentage value
   */
  showPercentage?: boolean;
}

function getVariantFromValue(value: number): 'low' | 'medium' | 'high' {
  if (value >= 80) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
}

export function ProgressIndicator({
  value,
  label,
  variant = 'auto',
  className,
  showPercentage = true,
}: ProgressIndicatorProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const actualVariant = variant === 'auto' ? getVariantFromValue(safeValue) : variant;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {showPercentage && (
          <span className="font-medium tabular-nums">{Math.round(safeValue)}%</span>
        )}
      </div>
      <Progress
        value={safeValue}
        className={cn(
          'h-1.5',
          actualVariant === 'low' && '[&>div]:bg-amber-500',
          actualVariant === 'medium' && '[&>div]:bg-primary',
          actualVariant === 'high' && '[&>div]:bg-green-500'
        )}
        aria-label={`${label}: ${Math.round(safeValue)}%`}
      />
    </div>
  );
}
