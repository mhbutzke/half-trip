'use client';

import { useState, useCallback, useTransition } from 'react';
import { Link } from 'next-view-transitions';
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  MapPin,
  Users,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { listTrips, deleteTrip } from '@/lib/supabase/admin-actions';
import type { TripWithDetails, PaginatedResult } from '@/types/admin';
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

type FilterType = 'all' | 'active' | 'archived';

interface TripsContentProps {
  initialData: PaginatedResult<TripWithDetails>;
}

export function TripsContent({ initialData }: TripsContentProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<TripWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  const fetchTrips = useCallback((params: { page: number; search: string; filter: FilterType }) => {
    startTransition(async () => {
      const result = await listTrips({
        page: params.page,
        pageSize: PAGE_SIZE,
        search: params.search || undefined,
        filter: params.filter === 'all' ? undefined : params.filter,
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
      // Debounce de 300ms
      const timer = setTimeout(() => {
        fetchTrips({ page: 0, search: value, filter });
      }, 300);
      return () => clearTimeout(timer);
    },
    [filter, fetchTrips]
  );

  const handleFilterChange = useCallback(
    (newFilter: FilterType) => {
      setFilter(newFilter);
      setPage(0);
      fetchTrips({ page: 0, search, filter: newFilter });
    },
    [search, fetchTrips]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchTrips({ page: newPage, search, filter });
    },
    [search, filter, fetchTrips]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteTrip(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Viagem excluida com sucesso');
        fetchTrips({ page, search, filter });
      }
    } catch {
      toast.error('Erro ao excluir viagem');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, page, search, filter, fetchTrips]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Ativas' },
    { value: 'archived', label: 'Arquivadas' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Viagens</h2>
        <p className="text-sm text-muted-foreground">
          Gerenciar todas as viagens do sistema ({data.total} total)
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar por nome ou destino..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className={cn('hidden md:block', isPending && 'opacity-60 pointer-events-none')}>
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Destino
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Datas
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  Membros
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  Despesas
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Criador
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
                    Nenhuma viagem encontrada
                  </td>
                </tr>
              ) : (
                data.items.map((trip) => (
                  <tr key={trip.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trip.name}</span>
                        {trip.archived_at && (
                          <Badge variant="secondary" className="text-xs">
                            <Archive className="mr-1 h-3 w-3" aria-hidden="true" />
                            Arquivada
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {trip.destination}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {trip.memberCount}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {trip.expenseCount}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {trip.createdByName}
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
                            <Link href={routes.admin.tripDetail(trip.id)}>
                              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(trip)}
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
          <p className="py-8 text-center text-muted-foreground">Nenhuma viagem encontrada</p>
        ) : (
          data.items.map((trip) => (
            <Card key={trip.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{trip.name}</p>
                      {trip.archived_at && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <Archive className="mr-1 h-3 w-3" aria-hidden="true" />
                          Arquivada
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
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
                        <Link href={routes.admin.tripDetail(trip.id)}>
                          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(trip)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {trip.memberCount} membros
                  </span>
                  <span className="flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                    {trip.expenseCount} despesas
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Criado por {trip.createdByName}
                </p>
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
            <AlertDialogTitle>Excluir viagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a viagem <strong>{deleteTarget?.name}</strong>? Esta
              acao remover todas as despesas, acertos e dados relacionados. Esta acao nao pode ser
              desfeita.
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
