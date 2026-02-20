'use client';

import { useState, useCallback, useTransition, useEffect, useRef } from 'react';
import { Link } from 'next-view-transitions';
import {
  Search,
  MoreHorizontal,
  Eye,
  ShieldBan,
  ShieldCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { listUsers, toggleUserBlock, deleteUser } from '@/lib/supabase/admin-actions';
import type { UserWithStats, PaginatedResult } from '@/types/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_SIZE = 20;

type FilterType = 'all' | 'active' | 'blocked';

interface UsersContentProps {
  initialData: PaginatedResult<UserWithStats>;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function UsersContent({ initialData }: UsersContentProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isPending, startTransition] = useTransition();

  // Alert dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'block' | 'unblock' | 'delete' | null>(null);
  const [targetUser, setTargetUser] = useState<UserWithStats | null>(null);
  const [isActing, setIsActing] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback((newPage: number, newSearch: string, newFilter: FilterType) => {
    startTransition(async () => {
      const result = await listUsers({
        page: newPage,
        pageSize: PAGE_SIZE,
        search: newSearch || undefined,
        filter: newFilter,
      });
      if (result) {
        setData(result);
        setPage(newPage);
      }
    });
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchUsers(0, value, filter);
      }, 400);
    },
    [filter, fetchUsers]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleFilterChange = useCallback(
    (newFilter: FilterType) => {
      setFilter(newFilter);
      fetchUsers(0, search, newFilter);
    },
    [search, fetchUsers]
  );

  const handlePrevPage = useCallback(() => {
    if (page > 0) fetchUsers(page - 1, search, filter);
  }, [page, search, filter, fetchUsers]);

  const handleNextPage = useCallback(() => {
    const maxPage = Math.ceil(data.total / PAGE_SIZE) - 1;
    if (page < maxPage) fetchUsers(page + 1, search, filter);
  }, [page, search, filter, data.total, fetchUsers]);

  const openConfirmDialog = useCallback(
    (action: 'block' | 'unblock' | 'delete', user: UserWithStats) => {
      setDialogAction(action);
      setTargetUser(user);
      setDialogOpen(true);
    },
    []
  );

  const handleConfirmAction = useCallback(async () => {
    if (!targetUser || !dialogAction) return;
    setIsActing(true);

    try {
      if (dialogAction === 'delete') {
        const result = await deleteUser(targetUser.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Conta excluida com sucesso');
          fetchUsers(page, search, filter);
        }
      } else {
        const block = dialogAction === 'block';
        const result = await toggleUserBlock(targetUser.id, block);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(block ? 'Conta bloqueada com sucesso' : 'Conta desbloqueada com sucesso');
          fetchUsers(page, search, filter);
        }
      }
    } finally {
      setIsActing(false);
      setDialogOpen(false);
      setTargetUser(null);
      setDialogAction(null);
    }
  }, [targetUser, dialogAction, page, search, filter, fetchUsers]);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);
  const isBlocked = (user: UserWithStats) => user.blocked_at !== null;

  const dialogMessages = {
    block: {
      title: 'Bloquear usuário',
      description: `Tem certeza que deseja bloquear "${targetUser?.name}"? O usuário não poderá acessar o sistema enquanto estiver bloqueado.`,
      action: 'Bloquear',
    },
    unblock: {
      title: 'Desbloquear usuário',
      description: `Tem certeza que deseja desbloquear "${targetUser?.name}"? O usuário voltará a ter acesso ao sistema.`,
      action: 'Desbloquear',
    },
    delete: {
      title: 'Excluir conta',
      description: `Tem certeza que deseja excluir permanentemente a conta de "${targetUser?.name}"? Esta ação não pode ser desfeita. Todos os dados do usuário serão removidos.`,
      action: 'Excluir',
    },
  };

  const currentDialog = dialogAction ? dialogMessages[dialogAction] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Usuários</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os usuários do sistema ({data.total} total)
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          {(
            [
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Ativos' },
              { value: 'blocked', label: 'Bloqueados' },
            ] as const
          ).map(({ value, label }) => (
            <Button
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      <div className={cn('transition-opacity', isPending && 'pointer-events-none opacity-50')}>
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Users className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                      <th className="px-4 py-3">Avatar</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 text-center">Viagens</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((user) => (
                      <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Avatar className="size-8">
                            {user.avatar_url && (
                              <AvatarImage src={user.avatar_url} alt={user.name} />
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={routes.admin.userDetail(user.id)}
                            className="font-medium hover:underline"
                          >
                            {user.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-center text-sm">{user.tripCount}</td>
                        <td className="px-4 py-3 text-center">
                          {isBlocked(user) ? (
                            <Badge variant="destructive">Bloqueado</Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                              Ativo
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <UserActionsMenu
                            user={user}
                            onBlock={() => openConfirmDialog('block', user)}
                            onUnblock={() => openConfirmDialog('unblock', user)}
                            onDelete={() => openConfirmDialog('delete', user)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {data.items.map((user) => (
                <div key={user.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                        <AvatarFallback className="text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={routes.admin.userDetail(user.id)}
                          className="block truncate font-medium hover:underline"
                        >
                          {user.name}
                        </Link>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <UserActionsMenu
                      user={user}
                      onBlock={() => openConfirmDialog('block', user)}
                      onUnblock={() => openConfirmDialog('unblock', user)}
                      onDelete={() => openConfirmDialog('delete', user)}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {isBlocked(user) ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                        Ativo
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {user.tripCount} {user.tripCount === 1 ? 'viagem' : 'viagens'}
                    </span>
                    <span className="text-muted-foreground">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}
            {' - '}
            {Math.min((page + 1) * PAGE_SIZE, data.total)} de {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 0}>
              <ChevronLeft className="mr-1 size-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages - 1}
            >
              Proximo
              <ChevronRight className="ml-1 size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{currentDialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isActing}
              className={cn(
                dialogAction === 'delete' && 'bg-destructive text-white hover:bg-destructive/90'
              )}
            >
              {isActing ? 'Processando...' : currentDialog?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Dropdown actions menu (shared between desktop & mobile)
// ──────────────────────────────────────────────────────────────

function UserActionsMenu({
  user,
  onBlock,
  onUnblock,
  onDelete,
}: {
  user: UserWithStats;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
}) {
  const blocked = user.blocked_at !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acoes para ${user.name}`}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={routes.admin.userDetail(user.id)}>
            <Eye className="mr-2 size-4" aria-hidden="true" />
            Ver detalhes
          </Link>
        </DropdownMenuItem>
        {blocked ? (
          <DropdownMenuItem onClick={onUnblock}>
            <ShieldCheck className="mr-2 size-4" aria-hidden="true" />
            Desbloquear
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onBlock}>
            <ShieldBan className="mr-2 size-4" aria-hidden="true" />
            Bloquear
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
