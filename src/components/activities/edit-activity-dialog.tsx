'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/errors/logger';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateActivitySchema, type UpdateActivityInput } from '@/lib/validation/activity-schemas';
import { updateActivity } from '@/lib/supabase/activities';
import { getActivityAttachments, type AttachmentWithUrl } from '@/lib/supabase/attachments';
import { FileUpload, AttachmentsList } from '@/components/attachments';
import { ActivityFormFields } from './activity-form-fields';
import type { LocationCoords } from './location-autocomplete';
import type { Activity, ActivityLink, ActivityMetadata, Json } from '@/types/database';

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
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(null);
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!activity) return;
    setLoadingAttachments(true);
    try {
      const data = await getActivityAttachments(activity.id);
      setAttachments(data);
    } catch (err) {
      logError(err, { action: 'load-attachments', activityId: activity?.id });
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
      transport_type: null,
      links: [],
    },
  });

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      const activityLinks = Array.isArray(activity.links) ? (activity.links as ActivityLink[]) : [];
      const meta = activity.metadata as ActivityMetadata | null;

      form.reset({
        title: activity.title,
        date: activity.date,
        start_time: activity.start_time || '',
        duration_minutes: activity.duration_minutes,
        location: activity.location || '',
        description: activity.description || '',
        category: activity.category,
        transport_type: meta?.transport_type || null,
        links: activityLinks,
      });
      setLinks(activityLinks);

      // Restore location coords from metadata
      if (meta?.location_lat && meta?.location_lng && meta?.location_place_id) {
        setLocationCoords({
          lat: meta.location_lat,
          lng: meta.location_lng,
          place_id: meta.location_place_id,
        });
      } else {
        setLocationCoords(null);
      }
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

  const onSubmit = async (data: UpdateActivityInput) => {
    if (!activity) return;

    setIsSubmitting(true);

    try {
      // Build metadata: preserve existing metadata (like flight data), merge new fields
      const existingMeta = (activity.metadata as { [key: string]: Json | undefined }) || {};
      const metadata: { [key: string]: Json | undefined } = { ...existingMeta };

      // Update transport_type
      if (data.transport_type) {
        metadata.transport_type = data.transport_type;
      } else {
        delete metadata.transport_type;
      }

      // Update location coords
      if (locationCoords) {
        metadata.location_lat = locationCoords.lat;
        metadata.location_lng = locationCoords.lng;
        metadata.location_place_id = locationCoords.place_id;
      } else {
        delete metadata.location_lat;
        delete metadata.location_lng;
        delete metadata.location_place_id;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { transport_type: _transportType, ...activityData } = data;
      const result = await updateActivity(activity.id, {
        ...activityData,
        start_time: activityData.start_time || null,
        duration_minutes: activityData.duration_minutes || null,
        location: activityData.location || null,
        description: activityData.description || null,
        links: links,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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
        setLocationCoords(null);
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
              <Paperclip className="h-4 w-4" aria-hidden="true" />
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
                <ActivityFormFields
                  form={form}
                  links={links}
                  setLinks={setLinks}
                  newLinkUrl={newLinkUrl}
                  setNewLinkUrl={setNewLinkUrl}
                  newLinkLabel={newLinkLabel}
                  setNewLinkLabel={setNewLinkLabel}
                  linkError={linkError}
                  addLink={addLink}
                  locationCoords={locationCoords}
                  setLocationCoords={setLocationCoords}
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
                <Paperclip className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
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
