'use client';

import { useCallback } from 'react';
import { UnifiedFileUpload } from '@/components/forms/unified-file-upload';
import { uploadAttachment } from '@/lib/supabase/attachments';
import { MAX_ATTACHMENT_SIZE, ALLOWED_ATTACHMENT_TYPES } from '@/lib/utils/attachment-helpers';

interface FileUploadProps {
  activityId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export function FileUpload({ activityId, onUploadComplete, disabled }: FileUploadProps) {
  const handleUploadFn = useCallback(
    async (file: File) => {
      const result = await uploadAttachment(activityId, file);
      if (result.error) {
        return { error: result.error };
      }
      return { url: result.url ?? '' };
    },
    [activityId]
  );

  const handleComplete = useCallback(() => {
    onUploadComplete?.();
  }, [onUploadComplete]);

  return (
    <UnifiedFileUpload
      onUploadComplete={handleComplete}
      uploadFn={handleUploadFn}
      disabled={disabled}
      maxFiles={10}
      maxSizeBytes={MAX_ATTACHMENT_SIZE}
      allowedTypes={ALLOWED_ATTACHMENT_TYPES}
      helperText="Imagens (JPEG, PNG, WebP, GIF) ou PDF. Máximo 20MB."
    />
  );
}
