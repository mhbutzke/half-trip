'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnifiedFileUploadProps {
  onUploadComplete: (urls: string[]) => void;
  disabled?: boolean;
  /** Maximum number of files allowed. Defaults to 1. */
  maxFiles?: number;
  /** Maximum file size in bytes. Defaults to 10 MB. */
  maxSizeBytes?: number;
  /** Allowed MIME types. Defaults to images + PDF. */
  allowedTypes?: string[];
  /** Show the camera capture button on mobile. Defaults to false. */
  enableCamera?: boolean;
  className?: string;
  /**
   * Custom upload handler. Receives a single file and must return either
   * `{ url: string }` on success or `{ error: string }` on failure.
   */
  uploadFn: (file: File) => Promise<{ url?: string; error?: string }>;
  /** Label for the camera button. Defaults to "Tirar foto". */
  cameraLabel?: string;
  /** Helper text shown below the drop zone. */
  helperText?: string;
}

interface FilePreview {
  file: File;
  preview: string | null;
  uploading: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_FILES = 1;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnifiedFileUpload({
  onUploadComplete,
  disabled = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  enableCamera = false,
  className,
  uploadFn,
  cameraLabel = 'Tirar foto',
  helperText,
}: UnifiedFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device (only needed when camera is enabled)
  useEffect(() => {
    if (!enableCamera) return;
    const userAgent = navigator.userAgent || navigator.vendor;
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase()
    );
    setIsMobile(mobile);
  }, [enableCamera]);

  // Determine if we can still add more files
  const canAddMore = files.length < maxFiles;
  const isSingleMode = maxFiles === 1;

  // ------------------------------------------------------------------
  // File handling
  // ------------------------------------------------------------------

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming || (incoming instanceof FileList && incoming.length === 0)) return;

      const arr = incoming instanceof FileList ? Array.from(incoming) : incoming;
      const previews: FilePreview[] = [];

      for (const file of arr) {
        // Max files check
        if (files.length + previews.length >= maxFiles) {
          toast.error(
            maxFiles === 1
              ? 'Apenas 1 arquivo permitido.'
              : `Limite de ${maxFiles} arquivos atingido.`
          );
          break;
        }

        // Type validation
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Tipo de arquivo "${file.name}" não permitido.`);
          continue;
        }

        // Size validation
        if (file.size > maxSizeBytes) {
          toast.error(`Arquivo "${file.name}" muito grande. Máximo ${formatSize(maxSizeBytes)}.`);
          continue;
        }

        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
        previews.push({ file, preview, uploading: false });
      }

      if (previews.length > 0) {
        setFiles((prev) => {
          // In single mode, replace existing file
          if (isSingleMode) {
            prev.forEach((p) => {
              if (p.preview) URL.revokeObjectURL(p.preview);
            });
            return previews.slice(0, 1);
          }
          return [...prev, ...previews];
        });
      }
    },
    [files.length, maxFiles, allowedTypes, maxSizeBytes, isSingleMode]
  );

  // ------------------------------------------------------------------
  // Drag & drop
  // ------------------------------------------------------------------

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
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // ------------------------------------------------------------------
  // Input handlers
  // ------------------------------------------------------------------

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      if (inputRef.current) inputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    },
    [addFiles]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
      return [];
    });
  }, []);

  // ------------------------------------------------------------------
  // Upload
  // ------------------------------------------------------------------

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return;
    setIsUploading(true);

    const urls: string[] = [];
    let failCount = 0;

    const results = await Promise.allSettled(
      files.map(async (fp, index) => {
        setFiles((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], uploading: true };
          return next;
        });

        const result = await uploadFn(fp.file);

        setFiles((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], uploading: false, error: result.error };
          return next;
        });

        return result;
      })
    );

    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.url) {
        urls.push(r.value.url);
      } else {
        failCount++;
      }
    });

    if (urls.length > 0) {
      toast.success(
        urls.length === 1
          ? 'Arquivo enviado com sucesso!'
          : `${urls.length} arquivos enviados com sucesso!`
      );
      onUploadComplete(urls);
    }

    if (failCount > 0 && urls.length > 0) {
      toast.error(`${failCount} arquivo(s) não puderam ser enviados.`);
    } else if (failCount > 0 && urls.length === 0) {
      toast.error('Erro ao enviar arquivo(s).');
    }

    // Keep only files with errors, clear the rest
    if (failCount > 0) {
      setFiles((prev) => prev.filter((f) => !!f.error));
    } else {
      clearAll();
    }

    setIsUploading(false);
  };

  // ------------------------------------------------------------------
  // Derived values
  // ------------------------------------------------------------------

  const acceptString = allowedTypes.join(',');
  const showDropZone = canAddMore || files.length === 0;
  const showCameraButton = enableCamera && isMobile && canAddMore && files.length === 0;

  const defaultHelper = `Imagens ou PDF. Máximo ${formatSize(maxSizeBytes)}.`;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        multiple={!isSingleMode}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      {/* Hidden camera input */}
      {enableCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
        />
      )}

      {/* Drop zone - shown when we can accept more files */}
      {showDropZone && files.length === 0 && (
        <>
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
            <p className="text-sm font-medium">
              {isSingleMode
                ? 'Arraste ou clique para selecionar'
                : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{helperText ?? defaultHelper}</p>
          </div>

          {showCameraButton && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <Camera className="mr-2 h-4 w-4" />
              {cameraLabel}
            </Button>
          )}
        </>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fp, index) => (
            <div
              key={`${fp.file.name}-${index}`}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                fp.error ? 'border-destructive bg-destructive/5' : 'bg-card'
              }`}
            >
              {/* Thumbnail */}
              <div
                className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted ${
                  isSingleMode ? 'h-16 w-16' : 'h-10 w-10'
                }`}
              >
                {fp.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fp.preview}
                    alt={fp.file.name}
                    className={`object-cover ${isSingleMode ? 'h-16 w-16' : 'h-10 w-10 rounded'}`}
                  />
                ) : fp.file.type === 'application/pdf' ? (
                  <FileText className={`text-red-500 ${isSingleMode ? 'h-8 w-8' : 'h-5 w-5'}`} />
                ) : (
                  <ImageIcon
                    className={`text-muted-foreground ${isSingleMode ? 'h-8 w-8' : 'h-5 w-5'}`}
                  />
                )}
              </div>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fp.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(fp.file.size)}</p>
                {fp.error && <p className="text-xs text-destructive">{fp.error}</p>}
              </div>

              {/* Remove / spinner */}
              {fp.uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                !isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )
              )}
            </div>
          ))}

          {/* Add more button (multi-file mode, when under limit) */}
          {!isSingleMode && canAddMore && !isUploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="mr-2 h-4 w-4" />
              Adicionar mais
            </Button>
          )}

          {/* Action buttons */}
          {isSingleMode ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={clearAll}
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
          ) : (
            <Button
              type="button"
              onClick={handleUpload}
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
          )}
        </div>
      )}
    </div>
  );
}
