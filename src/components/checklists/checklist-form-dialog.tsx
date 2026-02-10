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
  checklistFormSchema,
  checklistCategories,
  checklistCategoryLabels,
  type ChecklistFormValues,
} from '@/lib/validation/checklist-schemas';
import { createChecklist } from '@/lib/supabase/checklists';
import { toast } from 'sonner';

interface ChecklistFormDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChecklistFormDialog({
  tripId,
  open,
  onOpenChange,
  onSuccess,
}: ChecklistFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'packing',
    },
  });

  async function onSubmit(values: ChecklistFormValues) {
    setIsSubmitting(true);
    try {
      const result = await createChecklist({
        trip_id: tripId,
        name: values.name,
        description: values.description || null,
        category: values.category,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Checklist criada');
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
          <DialogTitle>Nova Checklist</DialogTitle>
          <DialogDescription>Crie uma lista de itens para organizar a viagem.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checklist-name">Nome</Label>
            <Input
              id="checklist-name"
              placeholder="Ex: Lista de bagagem"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="checklist-category">Categoria</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(value) =>
                form.setValue('category', value as ChecklistFormValues['category'])
              }
            >
              <SelectTrigger id="checklist-category">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {checklistCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {checklistCategoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isSubmitting ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
