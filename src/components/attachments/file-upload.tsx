'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { uploadAttachment } from '@/lib/supabase/attachments';
import {
  isValidAttachmentType,
  MAX_ATTACHMENT_SIZE,
  ALLOWED_ATTACHMENT_TYPES,
} from '@/lib/utils/attachment-helpers';

interface FileUploadProps {
  activityId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  preview: string | null;
  uploading: boolean;
  error?: string;
}

export function FileUpload({ activityId, onUploadComplete, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    const previews: FilePreview[] = [];

    fileArray.forEach((file) => {
      // Validate file type
      if (!isValidAttachmentType(file.type)) {
        toast.error(`Arquivo "${file.name}" não é um tipo permitido.`);
        return;
      }

      // Validate file size
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`Arquivo "${file.name}" é muito grande (máximo 20MB).`);
        return;
      }

      // Create preview for images
      let preview: string | null = null;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      previews.push({ file, preview, uploading: false });
    });

    if (previews.length > 0) {
      setFiles((prev) => [...prev, ...previews]);
    }
  }, []);

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
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input value to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      // Revoke object URL to prevent memory leaks
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newFiles;
    });
  }, []);

  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);

    const results = await Promise.allSettled(
      files.map(async (filePreview, index) => {
        // Update uploading state
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index] = { ...newFiles[index], uploading: true };
          return newFiles;
        });

        const result = await uploadAttachment(activityId, filePreview.file);

        // Update state based on result
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index] = {
            ...newFiles[index],
            uploading: false,
            error: result.error,
          };
          return newFiles;
        });

        return result;
      })
    );

    // Check results and show appropriate messages
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    if (successful > 0) {
      toast.success(
        successful === 1
          ? 'Arquivo enviado com sucesso!'
          : `${successful} arquivos enviados com sucesso!`
      );
      // Remove successful uploads from the list
      setFiles((prev) => prev.filter((f) => f.error !== undefined || f.uploading));
      onUploadComplete?.();
    }

    if (failed > 0 && successful > 0) {
      toast.error(`${failed} arquivo(s) não puderam ser enviados.`);
    }

    // Clear files if all successful
    if (failed === 0) {
      setFiles([]);
    }

    setIsUploading(false);
  };

  const acceptedTypes = ALLOWED_ATTACHMENT_TYPES.join(',');

  return (
    <div className="space-y-4">
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
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />

        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Imagens (JPEG, PNG, WebP, GIF) ou PDF. Máximo 20MB.
        </p>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((filePreview, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                filePreview.error ? 'border-destructive bg-destructive/5' : ''
              }`}
            >
              {/* Preview Thumbnail */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                {filePreview.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={filePreview.preview}
                    alt={filePreview.file.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : filePreview.file.type === 'application/pdf' ? (
                  <FileText className="h-5 w-5 text-red-500" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{filePreview.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(filePreview.file.size / 1024).toFixed(1)} KB
                </p>
                {filePreview.error && (
                  <p className="text-xs text-destructive">{filePreview.error}</p>
                )}
              </div>

              {/* Status/Actions */}
              {filePreview.uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Upload Button */}
          <Button
            type="button"
            onClick={uploadFiles}
            disabled={isUploading || files.length === 0 || disabled}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
