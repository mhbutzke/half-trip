'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  pendingCount?: number;
  onRetrySync?: () => void;
  className?: string;
}

export function SyncStatusIndicator({
  pendingCount = 0,
  onRetrySync,
  className,
}: SyncStatusIndicatorProps) {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRetry = async () => {
    if (!onRetrySync) return;
    setIsSyncing(true);
    await onRetrySync();
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const getStatusIcon = () => {
    if (isSyncing) return <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    if (!isOnline) return <WifiOff className="h-3.5 w-3.5" />;
    if (pendingCount > 0) return <CloudOff className="h-3.5 w-3.5" />;
    return <Cloud className="h-3.5 w-3.5" />;
  };

  const getStatusText = () => {
    if (isSyncing) return 'Sincronizando...';
    if (!isOnline) return 'Offline';
    if (pendingCount > 0) return `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`;
    return 'Sincronizado';
  };

  const getStatusVariant = () => {
    if (!isOnline) return 'secondary';
    if (pendingCount > 0) return 'outline';
    return 'secondary';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 gap-2 px-2',
            !isOnline && 'text-muted-foreground',
            pendingCount > 0 && 'text-warning',
            className
          )}
        >
          {getStatusIcon()}
          <span className="text-xs hidden sm:inline">{getStatusText()}</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Status de Sincronização</h4>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sem conexão</span>
                </>
              )}
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="rounded-lg border bg-warning/5 p-3">
              <p className="text-sm font-medium">
                {pendingCount} {pendingCount === 1 ? 'item' : 'itens'} aguardando sync
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isOnline
                  ? 'Será sincronizado automaticamente'
                  : 'Será sincronizado quando voltar online'}
              </p>
            </div>
          )}

          {isOnline && pendingCount > 0 && onRetrySync && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleRetry}
              disabled={isSyncing}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
              Sincronizar agora
            </Button>
          )}

          {pendingCount === 0 && isOnline && (
            <div className="flex items-center gap-2 text-success">
              <Cloud className="h-4 w-4" />
              <span className="text-sm">Tudo sincronizado</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
