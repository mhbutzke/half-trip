'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from 'next-view-transitions';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Receipt,
  ArrowLeftRight,
  Trash2,
  Archive,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { routes } from '@/lib/routes';
import { deleteTrip } from '@/lib/supabase/admin-actions';
import type { AdminTripDetail } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TripDetailContentProps {
  trip: AdminTripDetail;
}

export function TripDetailContent({ trip }: TripDetailContentProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge variant="default" className="text-xs">
            <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
            Dono
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="secondary" className="text-xs">
            <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <User className="mr-1 h-3 w-3" aria-hidden="true" />
            Membro
          </Badge>
        );
    }
  };

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTrip(trip.id);
      if (result.error) {
        toast.error(result.error);
        setIsDeleting(false);
      } else {
        toast.success('Viagem excluida com sucesso');
        router.push(routes.admin.trips());
      }
    } catch {
      toast.error('Erro ao excluir viagem');
      setIsDeleting(false);
    }
  }, [trip.id, router]);

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={routes.admin.trips()}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{trip.name}</h2>
              {trip.archived_at && (
                <Badge variant="secondary">
                  <Archive className="mr-1 h-3 w-3" aria-hidden="true" />
                  Arquivada
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Criada por {trip.createdByName} em {formatDate(trip.created_at)}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Excluir viagem
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir viagem</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a viagem <strong>{trip.name}</strong>? Esta acao
                remover todas as despesas, acertos e dados relacionados. Esta acao nao pode ser
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

      {/* Trip info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Destino</p>
              <p className="font-medium">{trip.destination}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Periodo</p>
              <p className="font-medium">
                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membros</p>
              <p className="font-medium">{trip.memberCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="font-medium">{trip.expenseCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional info */}
      {(trip.description || trip.style || trip.transport_type) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {trip.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descricao</p>
                <p className="text-sm">{trip.description}</p>
              </div>
            )}
            <div className="flex gap-4">
              {trip.style && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estilo</p>
                  <p className="text-sm">{trip.style}</p>
                </div>
              )}
              {trip.transport_type && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transporte</p>
                  <p className="text-sm">{trip.transport_type}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Moeda base</p>
                <p className="text-sm">{trip.base_currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" aria-hidden="true" />
            Membros ({trip.members.length})
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
            Despesas ({trip.expenses.length})
          </TabsTrigger>
          <TabsTrigger value="settlements">
            <ArrowLeftRight className="mr-2 h-4 w-4" aria-hidden="true" />
            Acertos ({trip.settlements.length})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Membros da viagem</CardTitle>
              <CardDescription>
                {trip.members.length} participante{trip.members.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trip.members.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum membro encontrado
                </p>
              ) : (
                <div className="space-y-3">
                  {trip.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <User className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                      {getRoleBadge(member.role)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Despesas</CardTitle>
              <CardDescription>Ultimas {trip.expenses.length} despesas da viagem</CardDescription>
            </CardHeader>
            <CardContent>
              {trip.expenses.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma despesa encontrada
                </p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
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
                              Pago por
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Data
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {trip.expenses.map((expense) => (
                            <tr
                              key={expense.id}
                              className="border-b last:border-0 hover:bg-muted/30"
                            >
                              <td className="px-4 py-3 text-sm font-medium">
                                {expense.description}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {formatCurrency(expense.amount, expense.currency)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {expense.category}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {expense.paidByName}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {formatDate(expense.date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {trip.expenses.map((expense) => (
                      <div key={expense.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{expense.description}</p>
                          <p className="font-semibold text-sm shrink-0 ml-2">
                            {formatCurrency(expense.amount, expense.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {expense.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {expense.paidByName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(expense.date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements">
          <Card>
            <CardHeader>
              <CardTitle>Acertos</CardTitle>
              <CardDescription>
                {trip.settlements.length} acerto{trip.settlements.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trip.settlements.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum acerto encontrado
                </p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <div className="rounded-lg border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              De
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Para
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              Valor
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {trip.settlements.map((settlement) => (
                            <tr
                              key={settlement.id}
                              className="border-b last:border-0 hover:bg-muted/30"
                            >
                              <td className="px-4 py-3 text-sm">{settlement.fromName}</td>
                              <td className="px-4 py-3 text-sm">{settlement.toName}</td>
                              <td className="px-4 py-3 text-right text-sm">
                                {formatCurrency(settlement.amount, trip.base_currency)}
                              </td>
                              <td className="px-4 py-3">
                                {settlement.settled_at ? (
                                  <Badge variant="default" className="text-xs">
                                    Liquidado em {formatDate(settlement.settled_at)}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    Pendente
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {trip.settlements.map((settlement) => (
                      <div key={settlement.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="text-sm">
                            <span className="font-medium">{settlement.fromName}</span>
                            <span className="text-muted-foreground mx-1">&rarr;</span>
                            <span className="font-medium">{settlement.toName}</span>
                          </div>
                          <p className="font-semibold text-sm shrink-0 ml-2">
                            {formatCurrency(settlement.amount, trip.base_currency)}
                          </p>
                        </div>
                        {settlement.settled_at ? (
                          <Badge variant="default" className="text-xs">
                            Liquidado em {formatDate(settlement.settled_at)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
