'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/utils/accessibility';

interface FABProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

export function FAB({ icon: Icon, label, onClick, className }: FABProps) {
  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed right-4 z-40 md:hidden',
        'bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]',
        'flex size-14 items-center justify-center rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'active:scale-95 transition-transform',
        !reduced && 'animate-in fade-in zoom-in-75 duration-200',
        className
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}
