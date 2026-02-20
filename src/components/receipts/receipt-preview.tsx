'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Loader2,
  ExternalLink,
  Eye,
  Receipt,
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
import { getReceiptUrl, deleteReceipt } from '@/lib/supabase/receipts';
import { isImageUrl, isPdfUrl } from '@/lib/utils/receipt-helpers';

interface ReceiptPreviewProps {
  tripId: string;
  expenseId: string;
  receiptUrl: string;
  onDelete?: () => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function ReceiptPreview({
  tripId,
  expenseId,
  receiptUrl,
  onDelete,
  readOnly,
  compact,
}: ReceiptPreviewProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const isImage = isImageUrl(receiptUrl);
  const isPdf = isPdfUrl(receiptUrl);

  const loadSignedUrl = useCallback(async () => {
    setIsLoading(true);
    const result = await getReceiptUrl(tripId, receiptUrl);
    if (result.signedUrl) {
      setSignedUrl(result.signedUrl);
    }
    setIsLoading(false);
  }, [tripId, receiptUrl]);

  useEffect(() => {
    loadSignedUrl();
  }, [loadSignedUrl]);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteReceipt(tripId, expenseId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Comprovante excluído!');
      setShowDeleteDialog(false);
      onDelete?.();
    } catch {
      toast.error('Erro ao excluir comprovante');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!signedUrl) {
      toast.error('URL do comprovante não disponível');
      return;
    }

    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from receiptUrl
      const filename = receiptUrl.split('/').pop() || 'comprovante';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar comprovante');
    }
  };

  const handlePreview = () => {
    if (isImage) {
      setShowPreviewDialog(true);
    } else if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${compact ? 'h-10 w-10' : 'h-20 w-20'} rounded bg-muted`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact mode - just a clickable thumbnail/icon
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={handlePreview}
          className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-muted transition-colors hover:bg-muted/80"
          title="Ver comprovante"
        >
          {isImage && signedUrl ? (
            <Image
              src={signedUrl}
              alt="Comprovante"
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
              unoptimized
            />
          ) : isPdf ? (
            <FileText className="h-5 w-5 text-red-500" />
          ) : (
            <Receipt className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Eye className="h-4 w-4 text-white" />
          </div>
        </button>

        {/* Image Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Comprovante</DialogTitle>
            </DialogHeader>
            {signedUrl && (
              <div className="relative flex h-[70vh] w-full items-center justify-center">
                <Image
                  src={signedUrl}
                  alt="Comprovante"
                  fill
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full mode - shows thumbnail with actions
  return (
    <>
      <div className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Comprovante
        </span>
        <div className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
          {/* Thumbnail */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
            {isImage && signedUrl ? (
              <Image
                src={signedUrl}
                alt="Comprovante"
                width={64}
                height={64}
                className="h-16 w-16 cursor-pointer object-cover"
                onClick={handlePreview}
                unoptimized
              />
            ) : isPdf ? (
              <FileText className="h-8 w-8 text-red-500" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Comprovante anexado</p>
            <p className="text-xs text-muted-foreground">
              {isImage ? 'Imagem' : isPdf ? 'PDF' : 'Arquivo'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Preview Button */}
            {signedUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePreview}
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
              onClick={handleDownload}
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
                onClick={() => setShowDeleteDialog(true)}
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comprovante?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comprovante? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
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
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprovante</DialogTitle>
          </DialogHeader>
          {signedUrl && (
            <div className="relative flex h-[70vh] w-full items-center justify-center">
              <Image
                src={signedUrl}
                alt="Comprovante"
                fill
                className="rounded-lg object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
