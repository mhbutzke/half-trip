'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveFormContainer } from '@/components/ui/responsive-form-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createPoll } from '@/lib/supabase/polls';
import { createPollSchema, type CreatePollFormValues } from '@/lib/validation/poll-schemas';

interface CreatePollDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePollDialog({ tripId, open, onOpenChange, onSuccess }: CreatePollDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePollFormValues>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      trip_id: tripId,
      question: '',
      options: ['', ''],
      allow_multiple: false,
    },
  });

  const options = form.watch('options');

  const onSubmit = async (data: CreatePollFormValues) => {
    const filteredOptions = data.options.filter((o) => o.trim().length > 0);
    if (filteredOptions.length < 2) {
      toast.error('Adicione pelo menos 2 opções');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPoll({
        trip_id: tripId,
        question: data.question,
        options: filteredOptions,
        allow_multiple: data.allow_multiple,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Votação criada!');
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Nova votação"
      description="Crie uma enquete para o grupo decidir junto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pergunta</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Jantar japonês ou italiano?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Opções</Label>
            {options.map((_: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input placeholder={`Opção ${index + 1}`} {...form.register(`options.${index}`)} />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const current = form.getValues('options');
                      form.setValue(
                        'options',
                        current.filter((_: string, i: number) => i !== index)
                      );
                    }}
                    aria-label="Remover opção"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = form.getValues('options');
                  form.setValue('options', [...current, '']);
                }}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Adicionar opção
              </Button>
            )}
          </div>

          <FormField
            control={form.control}
            name="allow_multiple"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-sm">Permitir múltiplas respostas</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Cada pessoa pode votar em mais de uma opção
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar votação'}
          </Button>
        </form>
      </Form>
    </ResponsiveFormContainer>
  );
}
