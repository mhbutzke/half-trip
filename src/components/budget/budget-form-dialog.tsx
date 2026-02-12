'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  budgetFormSchema,
  budgetCategories,
  budgetCategoryLabels,
  type BudgetFormValues,
} from '@/lib/validation/budget-schemas';
import { parseAmount } from '@/lib/validation/expense-schemas';
import { useCurrencyInput } from '@/hooks/use-currency-input';
import { createBudget, updateBudget } from '@/lib/supabase/budgets';
import { toast } from 'sonner';
import type { BudgetWithSpending, TripBudget } from '@/types/budget';

interface BudgetFormDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBudget?: BudgetWithSpending | TripBudget | null;
  existingCategories: string[];
  onSuccess: () => void;
}

export function BudgetFormDialog({
  tripId,
  open,
  onOpenChange,
  editBudget,
  existingCategories,
  onSuccess,
}: BudgetFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editBudget;

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: editBudget?.category || 'total',
      amount: editBudget ? String(editBudget.amount).replace('.', ',') : '',
    },
  });

  const budgetAmountInput = useCurrencyInput({
    value: form.watch('amount'),
    onChange: (v) => form.setValue('amount', v),
  });

  const availableCategories = budgetCategories.filter(
    (cat) => !existingCategories.includes(cat) || cat === editBudget?.category
  );

  async function onSubmit(values: BudgetFormValues) {
    setIsSubmitting(true);

    const amount = parseAmount(values.amount);
    if (amount <= 0) {
      form.setError('amount', { message: 'Valor deve ser maior que zero' });
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing && editBudget) {
        const result = await updateBudget(editBudget.id, amount);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Orçamento atualizado');
      } else {
        const result = await createBudget({
          trip_id: tripId,
          category: values.category,
          amount,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Orçamento definido');
      }

      form.reset();
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Orçamento' : 'Definir Orçamento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere o valor do orçamento para esta categoria.'
              : 'Defina um limite de gastos para a viagem ou categoria.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-category">Categoria</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(value) =>
                form.setValue('category', value as BudgetFormValues['category'])
              }
              disabled={isEditing}
            >
              <SelectTrigger id="budget-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {budgetCategoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Valor (R$)</Label>
            <Input id="budget-amount" {...budgetAmountInput} />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Definir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
