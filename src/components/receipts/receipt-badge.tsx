'use client';

import { Receipt } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReceiptBadgeProps {
  hasReceipt: boolean;
  className?: string;
}

/**
 * A simple badge to indicate if an expense has a receipt attached.
 * Shows a receipt icon when there's a receipt.
 */
export function ReceiptBadge({ hasReceipt, className }: ReceiptBadgeProps) {
  if (!hasReceipt) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 ${className}`}
          >
            <Receipt className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Comprovante anexado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
