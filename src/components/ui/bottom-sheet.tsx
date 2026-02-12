'use client';

import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: (string | number)[];
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  snapPoints,
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[96vh] flex-col rounded-t-2xl bg-background',
            className
          )}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
          {(title || description) && (
            <div className="px-4 pb-2 pt-4">
              {title && <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>}
              {description && (
                <Drawer.Description className="text-sm text-muted-foreground">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 pb-8">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
