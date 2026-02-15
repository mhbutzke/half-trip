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
import type { TripParticipantResolved } from '@/lib/supabase/participants';

const quickExpenseSchema = z.object({
  description: z.string().min(2, 'Mínimo 2 caracteres'),
  amount: z.string().min(1, 'Valor obrigatório'),
  category: z.enum(['accommodation', 'food', 'transport', 'tickets', 'shopping', 'other'] as const),
  paid_by_participant_id: z.string().uuid(),
});

type QuickExpenseInput = z.infer<typeof quickExpenseSchema>;

interface QuickAddExpenseProps {
  tripId: string;
  participants: TripParticipantResolved[];
  currentParticipantId: string;
  baseCurrency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickAddExpense({
  tripId,
  participants,
  currentParticipantId,
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
      paid_by_participant_id: currentParticipantId,
    },
  });

  const amountInput = useCurrencyInput({
    value: form.watch('amount'),
    onChange: (v) => form.setValue('amount', v),
  });

  const avatarParticipants = participants.map((p) => ({
    id: p.id,
    name: p.displayName,
    avatar_url: p.displayAvatar,
  }));

  const onSubmit = async (data: QuickExpenseInput) => {
    setIsSubmitting(true);

    try {
      const amount = parseAmount(data.amount);
      const participantCount = participants.length;

      if (participantCount === 0) {
        toast.error('Nenhum participante na viagem para dividir a despesa');
        return;
      }

      const splitAmount = amount / participantCount;

      const result = await createExpense({
        trip_id: tripId,
        description: data.description,
        amount,
        currency: baseCurrency,
        exchange_rate: 1,
        date: new Date().toISOString().split('T')[0],
        category: data.category,
        paid_by_participant_id: data.paid_by_participant_id,
        notes: null,
        splits: participants.map((p) => ({
          participant_id: p.id,
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
                    Será dividido igualmente entre {participants.length}{' '}
                    {participants.length === 1 ? 'pessoa' : 'pessoas'}
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
                selected={form.watch('paid_by_participant_id')}
                onSelect={(id) => form.setValue('paid_by_participant_id', id)}
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
