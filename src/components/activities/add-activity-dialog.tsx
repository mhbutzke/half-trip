'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, X, ExternalLink } from 'lucide-react';
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
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import { createActivitySchema, type CreateActivityInput } from '@/lib/validation/activity-schemas';
import { createActivity } from '@/lib/supabase/activities';
import { activityCategoryList } from '@/lib/utils/activity-categories';
import type { ActivityLink } from '@/types/database';

interface AddActivityDialogProps {
  tripId: string;
  defaultDate?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  // Controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddActivityDialog({
  tripId,
  defaultDate,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddActivityDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [links, setLinks] = useState<ActivityLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [linkError, setLinkError] = useState('');

  const form = useForm<CreateActivityInput>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      trip_id: tripId,
      title: '',
      date: defaultDate || '',
      start_time: '',
      duration_minutes: null,
      location: '',
      description: '',
      category: undefined,
      links: [],
    },
  });

  // Reset form with new defaultDate when dialog opens in controlled mode
  useEffect(() => {
    if (isControlled && open && defaultDate) {
      form.setValue('date', defaultDate);
    }
  }, [isControlled, open, defaultDate, form]);

  const addLink = () => {
    setLinkError('');

    if (!newLinkUrl.trim()) {
      setLinkError('URL é obrigatória');
      return;
    }

    try {
      new URL(newLinkUrl);
    } catch {
      setLinkError('URL inválida');
      return;
    }

    if (!newLinkLabel.trim()) {
      setLinkError('Nome do link é obrigatório');
      return;
    }

    setLinks([...links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CreateActivityInput) => {
    setIsSubmitting(true);

    try {
      const result = await createActivity({
        ...data,
        start_time: data.start_time || null,
        duration_minutes: data.duration_minutes || null,
        location: data.location || null,
        description: data.description || null,
        links: links.length > 0 ? links : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Atividade adicionada!');
      setOpen(false);
      form.reset();
      setLinks([]);
      onSuccess?.();
    } catch {
      toast.error('Erro ao adicionar atividade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        form.reset({
          trip_id: tripId,
          title: '',
          date: defaultDate || '',
          start_time: '',
          duration_minutes: null,
          location: '',
          description: '',
          category: undefined,
          links: [],
        });
        setLinks([]);
        setNewLinkUrl('');
        setNewLinkLabel('');
        setLinkError('');
      }
    }
  };

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
      <DialogHeader>
        <DialogTitle>Adicionar atividade</DialogTitle>
        <DialogDescription>Adicione uma atividade ao roteiro da viagem.</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Voo para o destino" {...field} />
                </FormControl>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activityCategoryList.map((category) => {
                      const Icon = category.icon;
                      return (
                        <SelectItem key={category.value} value={category.value}>
                          <span className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${category.color}`} />
                            {category.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário (opcional)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração em minutos (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 120"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : parseInt(value, 10));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aeroporto GRU" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Detalhes da atividade..."
                    className="resize-none"
                    rows={3}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Links section */}
          <div className="space-y-3">
            <FormLabel>Links úteis (opcional)</FormLabel>

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{link.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeLink(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do link"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="URL"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={addLink}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {linkError && <p className="text-sm text-destructive">{linkError}</p>}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );

  // Controlled mode without trigger - just render the dialog
  if (isControlled && !trigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode or with trigger
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar atividade
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
