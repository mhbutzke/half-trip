'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Share2, Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
}

export const ExpenseCard = memo(function ExpenseCard({
  expense,
  baseCurrency,
  canEdit,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const isForeignCurrency = baseCurrency && expense.currency !== baseCurrency;
  const convertedAmount = expense.amount * (expense.exchange_rate ?? 1);
  const categoryInfo = getCategoryInfo(expense.category);
  const CategoryIcon = categoryInfo.icon;
  const { isPending } = useSyncStatus('expenses', expense.id);

  const formattedDate = format(new Date(expense.date), "d 'de' MMM", { locale: ptBR });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {/* Left: Icon and main info */}
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              className={cn(
                'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg',
                categoryInfo.bgColor
              )}
            >
              <CategoryIcon className={cn('h-4 w-4 sm:h-5 sm:w-5', categoryInfo.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm sm:text-base">{expense.description}</p>
              <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Badge
                  variant="secondary"
                  className="text-[10px] sm:text-xs font-normal px-1.5 py-0"
                >
                  {categoryInfo.label}
                </Badge>
                <span>{formattedDate}</span>
                {isPending && <PendingIndicator isPending={isPending} size="sm" />}
              </div>
            </div>
          </div>

          {/* Right: Amount and menu */}
          <div className="flex items-start gap-1 shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <p className="font-semibold text-sm sm:text-lg whitespace-nowrap tabular-nums">
                {formatAmount(expense.amount, expense.currency)}
              </p>
              {isForeignCurrency && (
                <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                  {formatAmount(convertedAmount, baseCurrency)}
                </p>
              )}
            </div>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
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
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
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

        {/* Footer: Paid by and split info */}
        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          {/* Paid by */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Pago por</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={expense.paid_by_user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(expense.paid_by_user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm font-medium">
                      {expense.paid_by_user.name.split(' ')[0]}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{expense.paid_by_user.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Split info */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">
                    Dividido entre {expense.expense_splits.length}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {expense.expense_splits.map((split) => (
                    <div key={split.id} className="flex items-center justify-between gap-4">
                      <span>{split.users.name}</span>
                      <span className="font-medium">
                        {formatAmount(split.amount, expense.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Notes if present */}
        {expense.notes && (
          <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{expense.notes}</p>
        )}
      </CardContent>
    </Card>
  );
});
