import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colorBySign?: boolean;
  showSign?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base font-medium',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
};

export function MoneyDisplay({
  amount,
  currency = 'BRL',
  size = 'md',
  colorBySign = false,
  showSign = false,
  className,
}: MoneyDisplayProps) {
  const formatted = formatCurrency(Math.abs(amount), currency);
  const sign = amount > 0.01 ? '+' : amount < -0.01 ? '-' : '';
  const display =
    showSign && sign ? `${sign} ${formatted}` : amount < 0 ? `- ${formatted}` : formatted;

  return (
    <span
      className={cn(
        sizeClasses[size],
        colorBySign && amount > 0.01 && 'text-positive',
        colorBySign && amount < -0.01 && 'text-negative',
        colorBySign && Math.abs(amount) <= 0.01 && 'text-muted-foreground',
        className
      )}
    >
      {display}
    </span>
  );
}
