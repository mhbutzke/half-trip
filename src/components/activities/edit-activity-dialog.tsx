'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, X, ExternalLink, Paperclip } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateActivitySchema, type UpdateActivityInput } from '@/lib/validation/activity-schemas';
import { updateActivity } from '@/lib/supabase/activities';
import { getActivityAttachments, type AttachmentWithUrl } from '@/lib/supabase/attachments';
import { activityCategoryList } from '@/lib/utils/activity-categories';
import { FileUpload, AttachmentsList } from '@/components/attachments';
import type { Activity, ActivityLink, ActivityCategory } from '@/types/database';

interface EditActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditActivityDialog({
  activity,
  open,
  onOpenChange,
  onSuccess,
}: EditActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [links, setLinks] = useState<ActivityLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [linkError, setLinkError] = useState('');
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!activity) return;
    setLoadingAttachments(true);
    try {
      const data = await getActivityAttachments(activity.id);
      setAttachments(data);
    } catch {
      console.error('Error loading attachments');
    } finally {
      setLoadingAttachments(false);
    }
  }, [activity]);

  // Load attachments when dialog opens
  useEffect(() => {
    if (open && activity) {
      loadAttachments();
    }
  }, [open, activity, loadAttachments]);

  const form = useForm<UpdateActivityInput>({
    resolver: zodResolver(updateActivitySchema),
    defaultValues: {
      title: '',
      date: '',
      start_time: '',
      duration_minutes: null,
      location: '',
      description: '',
      category: undefined,
      links: [],
    },
  });

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      const activityLinks = Array.isArray(activity.links) ? (activity.links as ActivityLink[]) : [];

      form.reset({
        title: activity.title,
        date: activity.date,
        start_time: activity.start_time || '',
        duration_minutes: activity.duration_minutes,
        location: activity.location || '',
        description: activity.description || '',
        category: activity.category,
        links: activityLinks,
      });
      setLinks(activityLinks);
    }
  }, [activity, form]);

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

  const onSubmit = async (data: UpdateActivityInput) => {
    if (!activity) return;

    setIsSubmitting(true);

    try {
      const result = await updateActivity(activity.id, {
        ...data,
        start_time: data.start_time || null,
        duration_minutes: data.duration_minutes || null,
        location: data.location || null,
        description: data.description || null,
        links: links,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Atividade atualizada!');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao atualizar atividade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setNewLinkUrl('');
        setNewLinkLabel('');
        setLinkError('');
        setAttachments([]);
      }
    }
  };

  const handleAttachmentChange = () => {
    loadAttachments();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Editar atividade</DialogTitle>
          <DialogDescription>Atualize os detalhes da atividade.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexos
              {attachments.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {attachments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value as ActivityCategory | undefined}
                      >
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
                          <Input
                            placeholder="Ex: Aeroporto GRU"
                            {...field}
                            value={field.value || ''}
                          />
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
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="attachments" className="mt-4 space-y-6">
            {/* File Upload */}
            {activity && (
              <FileUpload
                activityId={activity.id}
                onUploadComplete={handleAttachmentChange}
                disabled={isSubmitting}
              />
            )}

            {/* Existing Attachments */}
            {loadingAttachments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AttachmentsList attachments={attachments} onDelete={handleAttachmentChange} />
            )}

            {!loadingAttachments && attachments.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <Paperclip className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Nenhum anexo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adicione arquivos usando a área acima
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
