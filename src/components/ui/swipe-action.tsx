'use client';

import { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
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
import { prefersReducedMotion } from '@/lib/utils/accessibility';
import { cn } from '@/lib/utils';

interface SwipeActionProps {
  children: React.ReactNode;
  onDelete: () => void;
  confirmMessage?: string;
  confirmTitle?: string;
  disabled?: boolean;
  className?: string;
}

export function SwipeAction({
  children,
  onDelete,
  confirmMessage = 'Esta ação não pode ser desfeita.',
  confirmTitle = 'Confirmar exclusão',
  disabled = false,
  className,
}: SwipeActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const reducedMotion = typeof window !== 'undefined' && prefersReducedMotion();

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      swipingRef.current = false;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const deltaX = e.touches[0].clientX - startXRef.current;
      const deltaY = e.touches[0].clientY - startYRef.current;
      if (!swipingRef.current && Math.abs(deltaY) > Math.abs(deltaX)) return;
      swipingRef.current = true;
      if (!reducedMotion) setOffset(Math.min(0, deltaX));
    },
    [disabled, reducedMotion]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled || !swipingRef.current) return;
    const width = containerRef.current?.offsetWidth || 300;
    if (Math.abs(offset) > width * 0.3) setShowConfirm(true);
    setOffset(0);
    swipingRef.current = false;
  }, [disabled, offset]);

  return (
    <>
      <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
        <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground">
          <Trash2 className="size-5" aria-hidden="true" />
        </div>
        <div
          className={cn(
            'relative z-10 bg-background',
            !reducedMotion && offset === 0 && 'transition-transform duration-200'
          )}
          style={{ transform: `translateX(${offset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
