'use client';

import { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Loader2,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type AttachmentWithUrl, deleteAttachment } from '@/lib/supabase/attachments';
import { formatFileSize, isImageType, isPdfType } from '@/lib/utils/attachment-helpers';

interface AttachmentsListProps {
  attachments: AttachmentWithUrl[];
  onDelete?: () => void;
  readOnly?: boolean;
}

export function AttachmentsList({ attachments, onDelete, readOnly }: AttachmentsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AttachmentWithUrl | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentWithUrl | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.id);

    try {
      const result = await deleteAttachment(confirmDelete.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Anexo excluído!');
      onDelete?.();
    } catch {
      toast.error('Erro ao excluir anexo');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleDownload = async (attachment: AttachmentWithUrl) => {
    if (!attachment.signedUrl) {
      toast.error('URL do arquivo não disponível');
      return;
    }

    try {
      const response = await fetch(attachment.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handlePreview = (attachment: AttachmentWithUrl) => {
    if (isImageType(attachment.file_type)) {
      setPreviewAttachment(attachment);
    } else if (attachment.signedUrl) {
      // Open PDF or other files in new tab
      window.open(attachment.signedUrl, '_blank');
    }
  };

  return (
    <>
      <div className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Anexos ({attachments.length})
        </span>
        <div className="grid gap-2">
          {attachments.map((attachment) => {
            const isImage = isImageType(attachment.file_type);
            const isPdf = isPdfType(attachment.file_type);
            const isDeleting = deletingId === attachment.id;

            return (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                {/* Thumbnail */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {isImage && attachment.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.signedUrl}
                      alt={attachment.file_name}
                      className="h-10 w-10 cursor-pointer object-cover"
                      onClick={() => handlePreview(attachment)}
                    />
                  ) : isPdf ? (
                    <FileText className="h-5 w-5 text-red-500" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {/* Preview Button */}
                  {(isImage || isPdf) && attachment.signedUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreview(attachment)}
                      title="Visualizar"
                    >
                      {isImage ? <Eye className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                    </Button>
                  )}

                  {/* Download Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment)}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Delete Button */}
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(attachment)}
                      disabled={isDeleting}
                      title="Excluir"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo &quot;{confirmDelete?.file_name}&quot;? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewAttachment?.file_name}</DialogTitle>
          </DialogHeader>
          {previewAttachment?.signedUrl && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewAttachment.signedUrl}
                alt={previewAttachment.file_name}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
