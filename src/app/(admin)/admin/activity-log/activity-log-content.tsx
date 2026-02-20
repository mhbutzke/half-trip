'use client';

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAdminActivityLog } from '@/lib/supabase/admin-actions';
import type { AdminActivityLogEntry, PaginatedResult } from '@/types/admin';

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  block_user: 'Bloqueou usuário',
  unblock_user: 'Desbloqueou usuário',
  delete_user: 'Excluiu usuário',
  delete_trip: 'Excluiu viagem',
  delete_expense: 'Excluiu despesa',
  add_admin: 'Adicionou admin',
  remove_admin: 'Removeu admin',
  update_admin_role: 'Alterou role de admin',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: 'Usuário',
  trip: 'Viagem',
  expense: 'Despesa',
  admin: 'Administrador',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatEntityType(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

interface ActivityLogContentProps {
  initialData: PaginatedResult<AdminActivityLogEntry>;
}

export function ActivityLogContent({ initialData }: ActivityLogContentProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  function goToPage(newPage: number) {
    startTransition(async () => {
      const result = await getAdminActivityLog({ page: newPage, pageSize: PAGE_SIZE });
      if (result) {
        setData(result);
        setPage(newPage);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Log de Atividades</h2>
        <p className="text-sm text-muted-foreground">
          Histórico de ações realizadas por administradores
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" aria-hidden="true" />
            Atividades Recentes
          </CardTitle>
          <CardDescription>
            {data.total} registro{data.total !== 1 ? 's' : ''} no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-1">
              {/* Header - hidden on mobile */}
              <div className="hidden grid-cols-[1fr_1fr_auto_1fr_auto] items-center gap-4 border-b px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
                <span>Admin</span>
                <span>Ação</span>
                <span>Tipo</span>
                <span>ID da Entidade</span>
                <span>Data</span>
              </div>

              {isPending && (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="h-6 w-6 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Carregando...</span>
                </div>
              )}

              {!isPending &&
                data.items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 md:grid md:grid-cols-[1fr_1fr_auto_1fr_auto] md:items-center md:gap-4 md:border-0 md:border-b md:rounded-none md:last:border-b-0"
                  >
                    {/* Admin */}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.adminName}</p>
                      <p className="truncate text-sm text-muted-foreground">{entry.adminEmail}</p>
                    </div>

                    {/* Action */}
                    <div>
                      <span className="md:hidden text-sm font-medium text-muted-foreground">
                        Ação:{' '}
                      </span>
                      <span className="text-sm">{formatAction(entry.action)}</span>
                    </div>

                    {/* Entity type */}
                    <div>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {formatEntityType(entry.entity_type)}
                      </Badge>
                    </div>

                    {/* Entity ID */}
                    <div className="min-w-0">
                      <span className="md:hidden text-sm font-medium text-muted-foreground">
                        ID:{' '}
                      </span>
                      <span className="truncate text-sm font-mono text-muted-foreground">
                        {entry.entity_id ? `${entry.entity_id.slice(0, 8)}...` : '-'}
                      </span>
                    </div>

                    {/* Date */}
                    <p className="whitespace-nowrap text-sm text-muted-foreground">
                      <span className="md:hidden font-medium">Data: </span>
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 0 || isPending}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages - 1 || isPending}
                  aria-label="Próxima página"
                >
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
