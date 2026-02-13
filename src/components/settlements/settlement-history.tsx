'use client';

import { useState } from 'react';
import { History, Check, X, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import type { SettlementWithUsers } from '@/lib/supabase/settlements';
import { markSettlementAsUnpaid, deleteSettlement } from '@/lib/supabase/settlements';
import { MoneyDisplay } from '@/components/ui/money-display';

interface SettlementHistoryProps {
  settlements: SettlementWithUsers[];
  currentUserId: string;
  isOrganizer: boolean;
  onUpdate?: () => void;
}

export function SettlementHistory({
  settlements,
  currentUserId,
  isOrganizer,
  onUpdate,
}: SettlementHistoryProps) {
  const [unmarkDialogOpen, setUnmarkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementWithUsers | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canManageSettlement = (settlement: SettlementWithUsers) => {
    return (
      settlement.from_user === currentUserId || settlement.to_user === currentUserId || isOrganizer
    );
  };

  const handleUnmarkAsPaid = async () => {
    if (!selectedSettlement) return;

    try {
      const result = await markSettlementAsUnpaid(selectedSettlement.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Acerto desmarcado como pago');
      setUnmarkDialogOpen(false);
      setSelectedSettlement(null);
      onUpdate?.();
    } catch {
      toast.error('Erro ao desmarcar acerto');
    }
  };

  const handleDelete = async () => {
    if (!selectedSettlement) return;

    try {
      const result = await deleteSettlement(selectedSettlement.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Acerto excluído');
      setDeleteDialogOpen(false);
      setSelectedSettlement(null);
      onUpdate?.();
    } catch {
      toast.error('Erro ao excluir acerto');
    }
  };

  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de acertos
          </CardTitle>
          <CardDescription>Pagamentos realizados entre participantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhum acerto foi marcado como pago ainda
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de acertos
          </CardTitle>
          <CardDescription>
            {settlements.length}{' '}
            {settlements.length === 1 ? 'pagamento realizado' : 'pagamentos realizados'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-0 p-6">
              {settlements.map((settlement, index) => (
                <div key={settlement.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={settlement.from_user_data.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(settlement.from_user_data.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {settlement.from_user_data.name.split(' ')[0]} pagou{' '}
                            {settlement.to_user_data.name.split(' ')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {settlement.settled_at &&
                              formatDistanceToNow(new Date(settlement.settled_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-success/10 text-success">
                          <Check className="mr-1 h-3 w-3" />
                          <MoneyDisplay amount={settlement.amount} size="sm" />
                        </Badge>
                      </div>
                    </div>

                    {canManageSettlement(settlement) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSettlement(settlement);
                              setUnmarkDialogOpen(true);
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Desmarcar como pago
                          </DropdownMenuItem>
                          {isOrganizer && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSettlement(settlement);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Unmark as paid dialog */}
      <AlertDialog open={unmarkDialogOpen} onOpenChange={setUnmarkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmarcar como pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Este acerto voltará para a lista de pagamentos pendentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnmarkAsPaid}>Desmarcar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir acerto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro deste acerto será permanentemente
              removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
