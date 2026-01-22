'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { syncEngine } from '@/lib/sync';
import type { SyncQueueEntry } from '@/lib/sync/db';
import { toast } from 'sonner';

type SyncErrorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetrySuccess?: () => void;
};

export function SyncErrorsDialog({ open, onOpenChange, onRetrySuccess }: SyncErrorsDialogProps) {
  const [failedEntries, setFailedEntries] = useState<SyncQueueEntry[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (open) {
      loadFailedEntries();
    }
  }, [open]);

  const loadFailedEntries = async () => {
    try {
      const { db } = await import('@/lib/sync/db');
      const entries = await db.sync_queue.filter((entry) => entry.retries >= 3).toArray();
      setFailedEntries(entries);
    } catch (error) {
      console.error('[SyncErrorsDialog] Error loading failed entries:', error);
    }
  };

  const handleRetryAll = async () => {
    setIsRetrying(true);
    try {
      const count = await syncEngine.retryFailedEntries();
      toast.success(
        `${count} ${count === 1 ? 'item' : 'itens'} marcado${count === 1 ? '' : 's'} para tentar novamente`
      );

      // Trigger sync
      await syncEngine.processQueue();

      // Reload to see if any still failed
      await loadFailedEntries();
      onRetrySuccess?.();
    } catch (error) {
      console.error('[SyncErrorsDialog] Error retrying entries:', error);
      toast.error('Erro ao tentar novamente');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const count = await syncEngine.clearFailedEntries();
      toast.success(
        `${count} ${count === 1 ? 'item' : 'itens'} removido${count === 1 ? '' : 's'} da fila`
      );
      setFailedEntries([]);
      onOpenChange(false);
    } catch (error) {
      console.error('[SyncErrorsDialog] Error clearing entries:', error);
      toast.error('Erro ao limpar fila');
    } finally {
      setIsClearing(false);
    }
  };

  const getOperationLabel = (operation: string) => {
    switch (operation) {
      case 'insert':
        return 'Criar';
      case 'update':
        return 'Atualizar';
      case 'delete':
        return 'Excluir';
      default:
        return operation;
    }
  };

  const getTableLabel = (table: string) => {
    switch (table) {
      case 'activities':
        return 'Atividade';
      case 'expenses':
        return 'Despesa';
      case 'trip_notes':
        return 'Nota';
      case 'trips':
        return 'Viagem';
      default:
        return table;
    }
  };

  const getErrorType = (error?: string) => {
    if (!error) return 'unknown';
    const match = error.match(/\[(\w+)\]/);
    return match ? match[1] : 'unknown';
  };

  const getErrorTypeLabel = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return 'Rede';
      case 'permission':
        return 'Permissão';
      case 'validation':
        return 'Validação';
      case 'conflict':
        return 'Conflito';
      default:
        return 'Desconhecido';
    }
  };

  const getErrorTypeVariant = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return 'secondary';
      case 'permission':
        return 'destructive';
      case 'validation':
        return 'destructive';
      case 'conflict':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Erros de Sincronização
          </DialogTitle>
          <DialogDescription>
            {failedEntries.length === 0
              ? 'Nenhum erro de sincronização no momento.'
              : `${failedEntries.length} ${failedEntries.length === 1 ? 'item falhou' : 'itens falharam'} após múltiplas tentativas.`}
          </DialogDescription>
        </DialogHeader>

        {failedEntries.length > 0 && (
          <>
            <div className="space-y-3">
              {failedEntries.map((entry) => {
                const errorType = getErrorType(entry.error);
                return (
                  <div key={entry.id} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {getOperationLabel(entry.operation)} {getTableLabel(entry.table)}
                          </span>
                          <Badge variant={getErrorTypeVariant(errorType)}>
                            {getErrorTypeLabel(errorType)}
                          </Badge>
                          <Badge variant="outline">
                            {entry.retries} tentativa{entry.retries === 1 ? '' : 's'}
                          </Badge>
                        </div>
                        {entry.error && (
                          <p className="text-xs text-muted-foreground">
                            {entry.error.replace(/\[\w+\]\s*/, '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={isClearing || isRetrying}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Tudo
              </Button>
              <Button
                onClick={handleRetryAll}
                disabled={isRetrying || isClearing}
                className="gap-2"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Tentando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Tentar Novamente
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
