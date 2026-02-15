'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Share2, Trash2, Users, Copy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getCategoryInfo } from '@/lib/utils/expense-categories';
import { formatAmount } from '@/lib/validation/expense-schemas';
import type { ExpenseWithDetails } from '@/types/expense';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { PendingIndicator } from '@/components/sync';
import { toast } from 'sonner';

interface ExpenseCardProps {
  expense: ExpenseWithDetails;
  baseCurrency?: string;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export const ExpenseCard = memo(function ExpenseCard({
  expense,
  baseCurrency,
  canEdit,
  onEdit,
  onDelete,
  onDuplicate,
}: ExpenseCardProps) {
  const isForeignCurrency = baseCurrency && expense.currency !== baseCurrency;
  const convertedAmount = expense.amount * (expense.exchange_rate ?? 1);
  const categoryInfo = getCategoryInfo(expense.category);
  const CategoryIcon = categoryInfo.icon;
  const { isPending } = useSyncStatus('expenses', expense.id);

  const formattedDate = format(new Date(expense.date), "d 'de' MMM", { locale: ptBR });

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card className="overflow-hidden transition-transform duration-100 active:scale-[0.98]">
      <CardContent className="p-3">
        {/* Line 1: Icon + Description + Amount + Menu */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              categoryInfo.bgColor
            )}
          >
            <CategoryIcon className={cn('h-4 w-4', categoryInfo.color)} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{expense.description}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <div className="flex flex-col items-end">
              <p className="whitespace-nowrap text-base font-bold tabular-nums">
                {formatAmount(expense.amount, expense.currency)}
              </p>
              {isForeignCurrency && (
                <p className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
                  {formatAmount(convertedAmount, baseCurrency)}
                </p>
              )}
            </div>
            {isPending && <PendingIndicator isPending={isPending} size="sm" />}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Opções</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      const url = `${window.location.origin}/trip/${expense.trip_id}/expenses`;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: expense.description,
                            text: `${expense.description} - ${formatAmount(expense.amount, expense.currency)}`,
                            url,
                          });
                          return;
                        } catch {}
                      }
                      await navigator.clipboard.writeText(url);
                      toast.success('Link copiado!');
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Compartilhar
                  </DropdownMenuItem>
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                      Duplicar
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Line 2: Date + Split info + Paid by */}
        <div className="mt-1.5 flex items-center justify-between pl-12">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>

          <div className="flex items-center gap-3">
            {/* Split info */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    <span className="text-xs">{expense.expense_splits.length}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    {expense.expense_splits.map((split) => (
                      <div key={split.id} className="flex items-center justify-between gap-4">
                        <span>{split.users?.name || 'Desconhecido'}</span>
                        <span className="font-medium">
                          {formatAmount(split.amount, expense.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Paid by */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={expense.paid_by_user.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(expense.paid_by_user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {expense.paid_by_user.name.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
