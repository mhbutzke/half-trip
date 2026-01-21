'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { uploadReceipt } from '@/lib/supabase/receipts';
import {
  isValidReceiptType,
  MAX_RECEIPT_SIZE,
  ALLOWED_RECEIPT_TYPES,
  formatReceiptSize,
} from '@/lib/utils/receipt-helpers';

interface ReceiptUploadProps {
  tripId: string;
  expenseId: string;
  onUploadComplete?: (receiptUrl: string) => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  preview: string | null;
}

export function ReceiptUpload({
  tripId,
  expenseId,
  onUploadComplete,
  disabled,
}: ReceiptUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;

      // Validate file type
      if (!isValidReceiptType(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use imagens (JPEG, PNG, WebP, GIF) ou PDF.');
        return;
      }

      // Validate file size
      if (file.size > MAX_RECEIPT_SIZE) {
        toast.error('Arquivo muito grande. O tamanho máximo é 10MB.');
        return;
      }

      // Create preview for images
      let preview: string | null = null;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Clean up previous preview
      if (selectedFile?.preview) {
        URL.revokeObjectURL(selectedFile.preview);
      }

      setSelectedFile({ file, preview });
    },
    [selectedFile?.preview]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFile(file);
      // Reset input value to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    },
    [handleFile]
  );

  const removeFile = useCallback(() => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
  }, [selectedFile?.preview]);

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);

    try {
      const result = await uploadReceipt(tripId, expenseId, selectedFile.file);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Comprovante enviado com sucesso!');
      removeFile();
      onUploadComplete?.(result.receiptUrl || '');
    } catch {
      toast.error('Erro ao enviar comprovante');
    } finally {
      setIsUploading(false);
    }
  };

  const acceptedTypes = ALLOWED_RECEIPT_TYPES.join(',');

  return (
    <div className="space-y-4">
      {/* Camera capture input (hidden, for mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      {/* File input (hidden) */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      {!selectedFile ? (
        <>
          {/* Drop Zone */}
          <div
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
            <p className="mt-1 text-xs text-muted-foreground">Imagens ou PDF. Máximo 10MB.</p>
          </div>

          {/* Camera Button (mobile only) */}
          {isMobile && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <Camera className="mr-2 h-4 w-4" />
              Tirar foto do comprovante
            </Button>
          )}
        </>
      ) : (
        /* File Preview */
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            {/* Preview Thumbnail */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
              {selectedFile.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedFile.preview}
                  alt={selectedFile.file.name}
                  className="h-16 w-16 object-cover"
                />
              ) : selectedFile.file.type === 'application/pdf' ? (
                <FileText className="h-8 w-8 text-red-500" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* File Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selectedFile.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatReceiptSize(selectedFile.file.size)}
              </p>
            </div>

            {/* Remove Button */}
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={removeFile}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleUpload}
              disabled={isUploading || disabled}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
