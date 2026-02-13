'use server';

import { createClient } from './server';
import { revalidate } from '@/lib/utils/revalidation';
import type { ActivityAttachment } from '@/types/database';
import { MAX_ATTACHMENT_SIZE, isValidAttachmentType } from '@/lib/utils/attachment-helpers';
import { logActivity } from '@/lib/supabase/activity-log';
import { logError } from '@/lib/errors/logger';

export type AttachmentResult = {
  error?: string;
  success?: boolean;
  attachmentId?: string;
  url?: string;
};

export type AttachmentWithUrl = ActivityAttachment & {
  signedUrl?: string;
};

// Note: Utility functions like formatFileSize, isImageType, isPdfType should be
// imported directly from '@/lib/utils/attachment-helpers' in client components

/**
 * Generates a unique file path for storage
 */
function generateFilePath(tripId: string, activityId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${tripId}/${activityId}/${timestamp}-${randomId}-${sanitizedFileName}`;
}

/**
 * Uploads an attachment for an activity
 */
export async function uploadAttachment(activityId: string, file: File): Promise<AttachmentResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Validate file type
  if (!isValidAttachmentType(file.type)) {
    return { error: 'Tipo de arquivo não permitido. Use imagens (JPEG, PNG, WebP, GIF) ou PDF.' };
  }

  // Validate file size
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { error: 'Arquivo muito grande. O tamanho máximo é 20MB.' };
  }

  // Get the activity to verify trip membership
  const { data: activity } = await supabase
    .from('activities')
    .select('trip_id')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'Atividade não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', activity.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Generate file path and upload to storage
  const filePath = generateFilePath(activity.trip_id, activityId, file.name);

  const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    logError(uploadError, { action: 'attachment-upload', activityId });
    return { error: 'Erro ao fazer upload do arquivo' };
  }

  // Create attachment record in database
  const { data: attachment, error: insertError } = await supabase
    .from('activity_attachments')
    .insert({
      activity_id: activityId,
      file_url: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    })
    .select('id')
    .single();

  if (insertError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('attachments').remove([filePath]);
    logError(insertError, { action: 'attachment-insert', activityId });
    return { error: 'Erro ao salvar anexo' };
  }

  revalidate.tripItinerary(activity.trip_id);

  logActivity({
    tripId: activity.trip_id,
    action: 'created',
    entityType: 'attachment',
    entityId: attachment.id,
    metadata: { fileName: file.name, fileType: file.type, activityId },
  });

  return { success: true, attachmentId: attachment.id };
}

/**
 * Deletes an attachment
 */
export async function deleteAttachment(attachmentId: string): Promise<AttachmentResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the attachment with activity info
  const { data: attachment } = await supabase
    .from('activity_attachments')
    .select(
      `
      id,
      file_url,
      activities!inner (
        trip_id
      )
    `
    )
    .eq('id', attachmentId)
    .single();

  if (!attachment) {
    return { error: 'Anexo não encontrado' };
  }

  const tripId = (attachment.activities as { trip_id: string }).trip_id;

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([attachment.file_url]);

  if (storageError) {
    logError(storageError, { action: 'attachment-storage-delete', attachmentId });
    // Continue with database delete even if storage fails
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('activity_attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteError) {
    logError(deleteError, { action: 'attachment-delete', attachmentId });
    return { error: 'Erro ao excluir anexo' };
  }

  revalidate.tripItinerary(tripId);

  logActivity({
    tripId,
    action: 'deleted',
    entityType: 'attachment',
    entityId: attachmentId,
  });

  return { success: true };
}

/**
 * Gets all attachments for an activity with signed URLs
 */
export async function getActivityAttachments(activityId: string): Promise<AttachmentWithUrl[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Get attachments
  const { data: attachments } = await supabase
    .from('activity_attachments')
    .select(
      `
      *,
      activities!inner (
        trip_id
      )
    `
    )
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true });

  if (!attachments || attachments.length === 0) {
    return [];
  }

  const tripId = (attachments[0].activities as { trip_id: string }).trip_id;

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

  // Generate signed URLs for each attachment
  const attachmentsWithUrls: AttachmentWithUrl[] = await Promise.all(
    attachments.map(async (attachment) => {
      const { data: signedUrl } = await supabase.storage
        .from('attachments')
        .createSignedUrl(attachment.file_url, 60 * 60); // 1 hour expiry

      // Remove the activities join from the result
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { activities: _activities, ...attachmentWithoutActivities } = attachment;

      return {
        ...attachmentWithoutActivities,
        signedUrl: signedUrl?.signedUrl,
      } as AttachmentWithUrl;
    })
  );

  return attachmentsWithUrls;
}

/**
 * Gets a single signed URL for an attachment
 */
export async function getAttachmentUrl(attachmentId: string): Promise<AttachmentResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the attachment
  const { data: attachment } = await supabase
    .from('activity_attachments')
    .select(
      `
      file_url,
      activities!inner (
        trip_id
      )
    `
    )
    .eq('id', attachmentId)
    .single();

  if (!attachment) {
    return { error: 'Anexo não encontrado' };
  }

  const tripId = (attachment.activities as { trip_id: string }).trip_id;

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Generate signed URL
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('attachments')
    .createSignedUrl(attachment.file_url, 60 * 60); // 1 hour expiry

  if (urlError || !signedUrl) {
    return { error: 'Erro ao gerar URL do arquivo' };
  }

  return { success: true, url: signedUrl.signedUrl };
}

/**
 * Gets the count of attachments for an activity
 */
export async function getAttachmentsCount(activityId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('activity_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('activity_id', activityId);

  return count || 0;
}
