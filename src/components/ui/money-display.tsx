'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { prefersReducedMotion } from '@/lib/utils/accessibility';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colorBySign?: boolean;
  showSign?: boolean;
  convertedAmount?: number;
  convertedCurrency?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base font-medium',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
};

function useAnimatedValue(target: number): number {
  const [value, setValue] = useState(target);
  const animationState = useRef({ prev: target });

  useEffect(() => {
    const prev = animationState.current.prev;
    animationState.current.prev = target;

    if (prev === target) return;

    if (prefersReducedMotion()) {
      // Use rAF to avoid synchronous setState in effect
      const raf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(raf);
    }

    const duration = 300;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(prev + (target - prev) * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

export function MoneyDisplay({
  amount,
  currency = 'BRL',
  size = 'md',
  colorBySign = false,
  showSign = false,
  convertedAmount,
  convertedCurrency,
  className,
}: MoneyDisplayProps) {
  const animatedAmount = useAnimatedValue(amount);
  const displayAmount = Math.abs(animatedAmount);
  const formatted = formatCurrency(displayAmount, currency);
  const sign = amount > 0.01 ? '+' : amount < -0.01 ? '-' : '';
  const display =
    showSign && sign ? `${sign} ${formatted}` : amount < 0 ? `- ${formatted}` : formatted;

  const hasConversion =
    convertedAmount !== undefined && convertedCurrency && convertedCurrency !== currency;

  const content = (
    <span
      className={cn(
        sizeClasses[size],
        colorBySign && amount > 0.01 && 'text-positive',
        colorBySign && amount < -0.01 && 'text-negative',
        colorBySign && Math.abs(amount) <= 0.01 && 'text-muted-foreground',
        hasConversion && 'cursor-help border-b border-dashed border-current',
        className
      )}
    >
      {display}
    </span>
  );

  if (hasConversion) {
    const convertedFormatted = formatCurrency(convertedAmount, convertedCurrency);
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{convertedFormatted}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
