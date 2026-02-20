'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from 'next-view-transitions';
import {
  ArrowLeft,
  ShieldBan,
  ShieldCheck,
  Trash2,
  MapPin,
  Receipt,
  Calendar,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { toggleUserBlock, deleteUser } from '@/lib/supabase/admin-actions';
import type { UserDetail } from '@/types/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

interface UserDetailContentProps {
  user: UserDetail;
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}

export function UserDetailContent({ user: initialUser }: UserDetailContentProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isActing, setIsActing] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'block' | 'unblock' | 'delete' | null>(null);

  const blocked = user.blocked_at !== null;

  const handleToggleBlock = useCallback(async () => {
    setIsActing(true);
    try {
      const result = await toggleUserBlock(user.id, !blocked);
      if (result.error) {
        toast.error(result.error);
      } else {
        const msg = blocked ? 'Conta desbloqueada com sucesso' : 'Conta bloqueada com sucesso';
        toast.success(msg);
        setUser((prev) => ({
          ...prev,
          blocked_at: blocked ? null : new Date().toISOString(),
        }));
      }
    } finally {
      setIsActing(false);
      setDialogOpen(false);
      setDialogAction(null);
    }
  }, [user.id, blocked]);

  const handleDelete = useCallback(async () => {
    setIsActing(true);
    try {
      const result = await deleteUser(user.id);
      if (result.error) {
        toast.error(result.error);
        setIsActing(false);
        setDialogOpen(false);
        setDialogAction(null);
      } else {
        toast.success('Conta excluida com sucesso');
        router.push(routes.admin.users());
      }
    } catch {
      setIsActing(false);
      setDialogOpen(false);
      setDialogAction(null);
    }
  }, [user.id, router]);

  const handleConfirm = useCallback(async () => {
    if (dialogAction === 'delete') {
      await handleDelete();
    } else {
      await handleToggleBlock();
    }
  }, [dialogAction, handleDelete, handleToggleBlock]);

  const dialogMessages = {
    block: {
      title: 'Bloquear usuario',
      description: `Tem certeza que deseja bloquear "${user.name}"? O usuario nao podera acessar o sistema enquanto estiver bloqueado.`,
      action: 'Bloquear',
    },
    unblock: {
      title: 'Desbloquear usuario',
      description: `Tem certeza que deseja desbloquear "${user.name}"? O usuario voltara a ter acesso ao sistema.`,
      action: 'Desbloquear',
    },
    delete: {
      title: 'Excluir conta',
      description: `Tem certeza que deseja excluir permanentemente a conta de "${user.name}"? Esta acao nao pode ser desfeita. Todos os dados do usuario serao removidos.`,
      action: 'Excluir',
    },
  };

  const currentDialog = dialogAction ? dialogMessages[dialogAction] : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={routes.admin.users()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para usuarios
      </Link>

      {/* User Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
            <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              {blocked ? (
                <Badge variant="destructive">Bloqueado</Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Ativo</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Membro desde {formatDate(user.created_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {blocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogAction('unblock');
                setDialogOpen(true);
              }}
              disabled={isActing}
            >
              <ShieldCheck className="mr-2 size-4" aria-hidden="true" />
              Desbloquear
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogAction('block');
                setDialogOpen(true);
              }}
              disabled={isActing}
            >
              <ShieldBan className="mr-2 size-4" aria-hidden="true" />
              Bloquear
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDialogAction('delete');
              setDialogOpen(true);
            }}
            disabled={isActing}
          >
            <Trash2 className="mr-2 size-4" aria-hidden="true" />
            Excluir conta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <MapPin className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">Viagens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.tripCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Receipt className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.expenseCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trips List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5" aria-hidden="true" />
            Viagens ({user.trips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma viagem encontrada</p>
          ) : (
            <div className="space-y-3">
              {user.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={routes.admin.tripDetail(trip.id)}
                      className="font-medium hover:underline"
                    >
                      {trip.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden="true" />
                        {trip.destination}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" aria-hidden="true" />
                        {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" aria-hidden="true" />
                        {trip.memberCount} {trip.memberCount === 1 ? 'membro' : 'membros'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {trip.role === 'owner' ? 'Criador' : 'Membro'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" aria-hidden="true" />
            Despesas recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.recentExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa encontrada</p>
          ) : (
            <div className="space-y-3">
              {user.recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{expense.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        <Link
                          href={routes.admin.tripDetail(expense.tripId)}
                          className="hover:underline"
                        >
                          {expense.tripName}
                        </Link>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" aria-hidden="true" />
                        {formatDate(expense.date)}
                      </span>
                    </div>
                  </div>
                  <p className="ml-2 shrink-0 font-semibold">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              onClick={handleConfirm}
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
