'use client';

import { useState, useCallback, useTransition } from 'react';
import { Link } from 'next-view-transitions';
import {
  Search,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { listExpenses, deleteExpense } from '@/lib/supabase/admin-actions';
import type { ExpenseWithTrip, PaginatedResult } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const PAGE_SIZE = 20;

interface ExpensesContentProps {
  initialData: PaginatedResult<ExpenseWithTrip>;
}

export function ExpensesContent({ initialData }: ExpensesContentProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ExpenseWithTrip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  const fetchExpenses = useCallback((params: { page: number; search: string }) => {
    startTransition(async () => {
      const result = await listExpenses({
        page: params.page,
        pageSize: PAGE_SIZE,
        search: params.search || undefined,
      });
      if (result) {
        setData(result);
      }
    });
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(0);
      const timer = setTimeout(() => {
        fetchExpenses({ page: 0, search: value });
      }, 300);
      return () => clearTimeout(timer);
    },
    [fetchExpenses]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchExpenses({ page: newPage, search });
    },
    [search, fetchExpenses]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteExpense(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Despesa excluida com sucesso');
        fetchExpenses({ page, search });
      }
    } catch {
      toast.error('Erro ao excluir despesa');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, page, search, fetchExpenses]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Despesas</h2>
        <p className="text-sm text-muted-foreground">
          Gerenciar todas as despesas do sistema ({data.total} total)
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar por descricao..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className={cn('hidden md:block', isPending && 'opacity-60 pointer-events-none')}>
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Descricao
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Viagem
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Pago por
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Data
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma despesa encontrada
                  </td>
                </tr>
              ) : (
                data.items.map((expense) => (
                  <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{expense.description}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={routes.admin.tripDetail(expense.tripId)}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {expense.tripName}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {expense.paidByName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Acoes</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={routes.admin.tripDetail(expense.tripId)}>
                              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                              Ver viagem
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(expense)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className={cn('md:hidden space-y-3', isPending && 'opacity-60 pointer-events-none')}>
        {data.items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Nenhuma despesa encontrada</p>
        ) : (
          data.items.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium truncate">{expense.description}</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Acoes</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={routes.admin.tripDetail(expense.tripId)}>
                          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                          Ver viagem
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(expense)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {expense.category}
                  </Badge>
                  <Link
                    href={routes.admin.tripDetail(expense.tripId)}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {expense.tripName}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Pago por {expense.paidByName}</span>
                  <span>{formatDate(expense.date)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, data.total)} de{' '}
            {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isPending}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1 || isPending}
              onClick={() => handlePageChange(page + 1)}
            >
              Proximo
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a despesa <strong>{deleteTarget?.description}</strong>{' '}
              no valor de{' '}
              <strong>
                {deleteTarget ? formatCurrency(deleteTarget.amount, deleteTarget.currency) : ''}
              </strong>
              ? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
