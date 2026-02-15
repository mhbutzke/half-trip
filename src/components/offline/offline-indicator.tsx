'use client';

import { useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatusExtended } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Compact offline indicator: thin bar at top when offline, expandable for details.
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, pendingCount } = useOnlineStatusExtended();
  const [expanded, setExpanded] = useState(false);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* Thin indicator bar */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'fixed top-0 left-0 right-0 z-[55] h-1 bg-warning animate-pulse',
          'cursor-pointer',
          className
        )}
        aria-label={expanded ? 'Fechar detalhes offline' : 'Ver detalhes offline'}
      />

      {/* Expanded details */}
      {expanded && (
        <div
          className={cn(
            'fixed top-1 left-1/2 z-[55] -translate-x-1/2',
            'flex items-center gap-2 rounded-full',
            'bg-warning/95 px-4 py-2 text-sm font-medium text-warning-foreground',
            'shadow-lg backdrop-blur-sm',
            'animate-in slide-in-from-top-1'
          )}
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>
            {isOnline ? 'Sincronizando' : 'Modo offline'}
            {pendingCount > 0 &&
              ` · ${pendingCount} ${pendingCount === 1 ? 'operação pendente' : 'operações pendentes'}`}
          </span>
        </div>
      )}
    </>
  );
}
