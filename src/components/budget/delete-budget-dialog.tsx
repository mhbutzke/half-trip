'use client';

import { useState } from 'react';
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
import { deleteBudget } from '@/lib/supabase/budgets';
import { budgetCategoryLabels } from '@/lib/validation/budget-schemas';
import { toast } from 'sonner';
import type { TripBudget, BudgetWithSpending } from '@/types/budget';

interface DeleteBudgetDialogProps {
  budget: TripBudget | BudgetWithSpending | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteBudgetDialog({
  budget,
  open,
  onOpenChange,
  onSuccess,
}: DeleteBudgetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!budget) return null;

  const label = budgetCategoryLabels[budget.category] || budget.category;

  async function handleDelete() {
    if (!budget) return;
    setIsDeleting(true);

    try {
      const result = await deleteBudget(budget.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Orçamento removido');
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir orçamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o orçamento de &quot;{label}&quot;? Esta ação não pode
            ser desfeita.
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
  );
}
