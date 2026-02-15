'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Settlement } from '@/lib/balance';

interface QuickSettleActionsProps {
  settlement: Settlement;
  onMarkPaid: (settlement: Settlement) => Promise<void>;
  className?: string;
}

export function QuickSettleActions({
  settlement,
  onMarkPaid,
  className,
}: QuickSettleActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuickSettle = async () => {
    setIsProcessing(true);
    try {
      await onMarkPaid(settlement);
      toast.success('Pagamento registrado!');
    } catch {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        size="sm"
        variant="default"
        className="h-8"
        onClick={handleQuickSettle}
        disabled={isProcessing}
      >
        <Check className="mr-1 h-3.5 w-3.5" />
        Pago
      </Button>
    </div>
  );
}

/**
 * Swipeable settle action for mobile
 */
interface SwipeableSettlementProps {
  settlement: Settlement;
  onMarkPaid: (settlement: Settlement) => Promise<void>;
  children: React.ReactNode;
}

export function SwipeableSettlement({
  settlement,
  onMarkPaid,
  children,
}: SwipeableSettlementProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const delta = e.touches[0].clientX - startX;
    // Only allow swipe to the left
    if (delta < 0) {
      setCurrentX(Math.max(delta, -100));
    }
  };

  const handleTouchEnd = async () => {
    if (currentX < -70) {
      // Swipe threshold reached - mark as paid
      await onMarkPaid(settlement);
      toast.success('Pagamento registrado!');
    }
    setCurrentX(0);
    setIsSwiping(false);
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background action (revealed on swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end bg-success px-4">
        <Check className="h-5 w-5 text-white" />
      </div>

      {/* Content */}
      <div
        className="transition-transform"
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
