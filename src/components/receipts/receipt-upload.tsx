'use client';

import { useCallback } from 'react';
import { UnifiedFileUpload } from '@/components/forms/unified-file-upload';
import { uploadReceipt } from '@/lib/supabase/receipts';
import { MAX_RECEIPT_SIZE, ALLOWED_RECEIPT_TYPES } from '@/lib/utils/receipt-helpers';

interface ReceiptUploadProps {
  tripId: string;
  expenseId: string;
  onUploadComplete?: (receiptUrl: string) => void;
  disabled?: boolean;
}

export function ReceiptUpload({
  tripId,
  expenseId,
  onUploadComplete,
  disabled,
}: ReceiptUploadProps) {
  const handleUploadFn = useCallback(
    async (file: File) => {
      const result = await uploadReceipt(tripId, expenseId, file);
      if (result.error) {
        return { error: result.error };
      }
      return { url: result.receiptUrl ?? '' };
    },
    [tripId, expenseId]
  );

  const handleComplete = useCallback(
    (urls: string[]) => {
      if (urls.length > 0) {
        onUploadComplete?.(urls[0]);
      }
    },
    [onUploadComplete]
  );

  return (
    <UnifiedFileUpload
      onUploadComplete={handleComplete}
      uploadFn={handleUploadFn}
      disabled={disabled}
      maxFiles={1}
      maxSizeBytes={MAX_RECEIPT_SIZE}
      allowedTypes={ALLOWED_RECEIPT_TYPES}
      enableCamera
      cameraLabel="Tirar foto do comprovante"
      helperText="Imagens ou PDF. Máximo 10MB."
    />
  );
}
