'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategorySelector } from './category-selector';
import { AvatarSelector } from '@/components/ui/avatar-selector';
import { createExpense } from '@/lib/supabase/expenses';
import { useCurrencyInput } from '@/hooks/use-currency-input';
import { parseAmount } from '@/lib/validation/expense-schemas';
import type { TripMemberWithUser } from '@/lib/supabase/trips';

const quickExpenseSchema = z.object({
  description: z.string().min(2, 'Mínimo 2 caracteres'),
  amount: z.string().min(1, 'Valor obrigatório'),
  category: z.enum(['accommodation', 'food', 'transport', 'tickets', 'shopping', 'other'] as const),
  paid_by: z.string().uuid(),
});

type QuickExpenseInput = z.infer<typeof quickExpenseSchema>;

interface QuickAddExpenseProps {
  tripId: string;
  members: TripMemberWithUser[];
  currentUserId: string;
  baseCurrency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickAddExpense({
  tripId,
  members,
  currentUserId,
  baseCurrency,
  open,
  onOpenChange,
  onSuccess,
}: QuickAddExpenseProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuickExpenseInput>({
    resolver: zodResolver(quickExpenseSchema),
    defaultValues: {
      description: '',
      amount: '',
      category: 'food',
      paid_by: currentUserId,
    },
  });

  const amountInput = useCurrencyInput({
    value: form.watch('amount'),
    onChange: (v) => form.setValue('amount', v),
  });

  const avatarParticipants = members.map((m) => ({
    id: m.user_id,
    name: m.users.name,
    avatar_url: m.users.avatar_url,
  }));

  const onSubmit = async (data: QuickExpenseInput) => {
    setIsSubmitting(true);

    try {
      const amount = parseAmount(data.amount);
      const memberCount = members.length;

      if (memberCount === 0) {
        toast.error('Nenhum membro na viagem para dividir a despesa');
        return;
      }

      const splitAmount = amount / memberCount;

      const result = await createExpense({
        trip_id: tripId,
        description: data.description,
        amount,
        currency: baseCurrency,
        exchange_rate: 1,
        date: new Date().toISOString().split('T')[0],
        category: data.category,
        paid_by: data.paid_by,
        notes: null,
        splits: members.map((m) => ({
          user_id: m.user_id,
          amount: splitAmount,
          percentage: null,
        })),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Despesa adicionada!');
      onOpenChange(false);
      form.reset();
      onSuccess();
    } catch {
      toast.error('Erro ao adicionar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Despesa Rápida</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que foi?</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Almoço" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={() => (
                <FormItem>
                  <FormLabel>Valor total</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...amountInput} className="text-lg font-semibold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {baseCurrency}
                      </span>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Será dividido igualmente entre {members.length}{' '}
                    {members.length === 1 ? 'pessoa' : 'pessoas'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <CategorySelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Quem pagou?</FormLabel>
              <AvatarSelector
                participants={avatarParticipants}
                selected={form.watch('paid_by')}
                onSelect={(id) => form.setValue('paid_by', id)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={isSubmitting}>
                Adicionar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
