'use client';

import { Receipt } from 'lucide-react';
import { ReceiptUpload } from './receipt-upload';
import { ReceiptPreview } from './receipt-preview';

interface ReceiptSectionProps {
  tripId: string;
  expenseId: string;
  receiptUrl: string | null;
  onReceiptChange?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * A complete receipt section that shows either the upload form or the preview,
 * depending on whether a receipt is already attached.
 *
 * Use this in expense detail views or edit forms.
 */
export function ReceiptSection({
  tripId,
  expenseId,
  receiptUrl,
  onReceiptChange,
  disabled,
  readOnly,
}: ReceiptSectionProps) {
  if (receiptUrl) {
    // Show the existing receipt
    return (
      <ReceiptPreview
        tripId={tripId}
        expenseId={expenseId}
        receiptUrl={receiptUrl}
        onDelete={onReceiptChange}
        readOnly={readOnly}
      />
    );
  }

  // Show upload form if not read-only
  if (readOnly) {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Comprovante
        </span>
        <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4 text-muted-foreground">
          <Receipt className="h-5 w-5" />
          <span className="text-sm">Nenhum comprovante anexado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Comprovante
      </span>
      <ReceiptUpload
        tripId={tripId}
        expenseId={expenseId}
        onUploadComplete={onReceiptChange}
        disabled={disabled}
      />
    </div>
  );
}
