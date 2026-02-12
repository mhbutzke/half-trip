'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResponsiveFormContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveFormContainer({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveFormContainerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        className={className}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className || 'max-h-[90vh] overflow-y-auto sm:max-w-[550px]'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
