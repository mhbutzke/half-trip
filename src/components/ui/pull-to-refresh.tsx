'use client';

import { ArrowDown, Loader2 } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, disabled, className }: PullToRefreshProps) {
  const { containerRef, pulling, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const showIndicator = pulling || isRefreshing;
  const pastThreshold = pullDistance >= 80;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: pullDistance }}
          aria-hidden="true"
        >
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-background shadow-sm',
              !prefersReducedMotion && 'transition-transform duration-200'
            )}
            style={{
              opacity: isRefreshing ? 1 : Math.min(1, pullDistance / 60),
            }}
          >
            {isRefreshing ? (
              prefersReducedMotion ? (
                <span className="text-xs text-muted-foreground">...</span>
              ) : (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              )
            ) : (
              <ArrowDown
                className={cn(
                  'h-4 w-4 text-muted-foreground',
                  !prefersReducedMotion && 'transition-transform duration-200'
                )}
                style={{
                  transform: pastThreshold ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}

      {/* Screen reader announcement */}
      {isRefreshing && (
        <div className="sr-only" role="status" aria-live="polite">
          Atualizando...
        </div>
      )}

      {children}
    </div>
  );
}
