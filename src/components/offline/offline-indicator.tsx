'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Component that shows an offline indicator when not connected
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-16 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-2 rounded-full',
        'bg-warning/90 px-4 py-2 text-sm font-medium text-warning-foreground',
        'shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-top-2',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4" />
      <span>Modo offline</span>
    </div>
  );
}
