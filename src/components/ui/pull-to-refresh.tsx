'use client';

import { Loader2 } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { prefersReducedMotion } from '@/lib/utils/accessibility';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const { containerRef, pulling, pullDistance, refreshing } = usePullToRefresh({
    onRefresh,
  });

  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  const showIndicator = pulling || refreshing;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: pullDistance }}
        >
          {refreshing ? (
            reduced ? (
              <span className="text-sm text-muted-foreground">Atualizando...</span>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )
          ) : (
            <div
              className={cn(
                'h-5 w-5 rounded-full border-2 border-muted-foreground/40',
                !reduced && 'transition-transform'
              )}
              style={{
                transform: `rotate(${(pullDistance / 60) * 360}deg)`,
                opacity: Math.min(1, pullDistance / 60),
              }}
            />
          )}
        </div>
      )}

      {children}
    </div>
  );
}
