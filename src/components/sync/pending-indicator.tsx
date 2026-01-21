'use client';

import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PendingIndicatorProps = {
  isPending?: boolean;
  isSyncing?: boolean;
  hasError?: boolean;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function PendingIndicator({
  isPending = false,
  isSyncing = false,
  hasError = false,
  className,
  showLabel = false,
  size = 'sm',
}: PendingIndicatorProps) {
  if (!isPending && !isSyncing && !hasError) {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1',
        textSize,
        hasError && 'text-destructive',
        isPending && !hasError && 'text-warning',
        isSyncing && 'text-muted-foreground',
        className
      )}
    >
      {isSyncing && <Loader2 className={cn(iconSize, 'animate-spin')} />}
      {isPending && !isSyncing && !hasError && <CloudOff className={iconSize} />}
      {hasError && <CloudOff className={iconSize} />}
      {!isPending && !isSyncing && !hasError && <Cloud className={iconSize} />}

      {showLabel && (
        <span className="font-medium">
          {isSyncing && 'Sincronizando...'}
          {isPending && !isSyncing && !hasError && 'Aguardando sincronização'}
          {hasError && 'Erro ao sincronizar'}
          {!isPending && !isSyncing && !hasError && 'Sincronizado'}
        </span>
      )}
    </div>
  );
}
