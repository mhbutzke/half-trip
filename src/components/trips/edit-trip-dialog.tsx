'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTripSchema, tripStyles, type CreateTripInput } from '@/lib/validation/trip-schemas';
import { updateTrip } from '@/lib/supabase/trips';
import type { TripWithMembers } from '@/lib/supabase/trips';
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, type SupportedCurrency } from '@/types/currency';

interface EditTripDialogProps {
  trip: TripWithMembers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTripDialog({ trip, open, onOpenChange, onSuccess }: EditTripDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      name: '',
      destination: '',
      start_date: '',
      end_date: '',
      description: '',
      style: null,
      base_currency: 'BRL',
    },
  });

  // Reset form when trip changes
  useEffect(() => {
    if (trip) {
      form.reset({
        name: trip.name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        description: trip.description || '',
        style: trip.style,
        base_currency: (trip.base_currency as SupportedCurrency) || 'BRL',
      });
    }
  }, [trip, form]);

  const onSubmit = async (data: CreateTripInput) => {
    if (!trip) return;

    setIsSubmitting(true);

    try {
      const result = await updateTrip(trip.id, {
        name: data.name,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description || null,
        style: data.style || null,
        base_currency: data.base_currency,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Viagem atualizada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao atualizar viagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar viagem</DialogTitle>
          <DialogDescription>Atualize os dados da viagem.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da viagem</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Férias na praia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Florianópolis, SC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estilo da viagem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o estilo (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tripStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moeda base</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {CURRENCY_LABELS[currency]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Algum detalhe sobre a viagem..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
