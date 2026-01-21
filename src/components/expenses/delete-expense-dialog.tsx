'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { deleteExpense } from '@/lib/supabase/expenses';
import type { ExpenseWithDetails } from '@/lib/supabase/expenses';

interface DeleteExpenseDialogProps {
  expense: ExpenseWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseDeleted?: (expenseId: string) => void;
}

export function DeleteExpenseDialog({
  expense,
  open,
  onOpenChange,
  onExpenseDeleted,
}: DeleteExpenseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!expense) return;

    setIsDeleting(true);

    try {
      const result = await deleteExpense(expense.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Despesa excluída!');
      onOpenChange(false);
      onExpenseDeleted?.(expense.id);
    } catch {
      toast.error('Erro ao excluir despesa');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!expense) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a despesa &quot;{expense.description}&quot;? Esta ação
            não pode ser desfeita. Todos os dados da despesa, incluindo divisões
            {expense.receipt_url && ' e comprovante'}, serão permanentemente removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
