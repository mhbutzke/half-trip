'use client';

import { useState } from 'react';
import { AlertTriangle, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAutoSync } from '@/hooks/use-auto-sync';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { SyncErrorsDialog } from './sync-errors-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncStatus() {
  const isOnline = useOnlineStatus();
  const { isSyncing, lastSyncTime, lastSyncResult, pendingCount, sync } = useAutoSync({
    enabled: true,
    syncOnMount: true,
  });
  const [showErrorsDialog, setShowErrorsDialog] = useState(false);

  const hasPendingChanges = pendingCount > 0;
  const hasErrors = lastSyncResult && !lastSyncResult.success && lastSyncResult.errorCount > 0;
  const hasPermanentErrors = hasErrors && lastSyncResult.errors.some((e) => !e.retryable);

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    if (isSyncing) {
      return 'Sincronizando...';
    }
    if (hasPermanentErrors) {
      return 'Erro na sincronização';
    }
    if (hasPendingChanges) {
      return `${pendingCount} ${pendingCount === 1 ? 'alteração' : 'alterações'} pendente${pendingCount === 1 ? '' : 's'}`;
    }
    if (lastSyncTime) {
      return `Sincronizado ${formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR })}`;
    }
    return 'Sincronizado';
  };

  const getIcon = () => {
    if (!isOnline) {
      return <CloudOff className="h-4 w-4" aria-hidden="true" />;
    }
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
    }
    if (hasPermanentErrors) {
      return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    }
    if (hasPendingChanges) {
      return <CloudOff className="h-4 w-4" aria-hidden="true" />;
    }
    return <Cloud className="h-4 w-4" aria-hidden="true" />;
  };

  const handleClick = () => {
    if (hasPermanentErrors) {
      setShowErrorsDialog(true);
    } else if (isOnline && !isSyncing) {
      sync();
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 gap-2 px-3',
                !isOnline && 'text-muted-foreground',
                hasPermanentErrors && 'text-destructive',
                hasPendingChanges && isOnline && !hasPermanentErrors && 'text-warning',
                isSyncing && 'text-muted-foreground'
              )}
              onClick={handleClick}
              disabled={!isOnline || isSyncing}
            >
              {getIcon()}
              <span className="hidden sm:inline text-xs font-medium">{getStatusText()}</span>
              {isOnline && !isSyncing && (hasPendingChanges || hasPermanentErrors) && (
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getStatusText()}</p>
              {isOnline && !isSyncing && hasPendingChanges && !hasPermanentErrors && (
                <p className="text-xs text-muted-foreground">Clique para sincronizar agora</p>
              )}
              {hasPermanentErrors && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Alguns itens não puderam ser sincronizados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clique para ver detalhes e tentar novamente
                  </p>
                </div>
              )}
              {!isOnline && (
                <p className="text-xs text-muted-foreground">
                  As alterações serão sincronizadas quando você voltar online
                </p>
              )}
              {lastSyncTime && !hasPendingChanges && !hasErrors && (
                <p className="text-xs text-muted-foreground">
                  Última sincronização:{' '}
                  {formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR })}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SyncErrorsDialog
        open={showErrorsDialog}
        onOpenChange={setShowErrorsDialog}
        onRetrySuccess={() => {
          sync();
        }}
      />
    </>
  );
}
