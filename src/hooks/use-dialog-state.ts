'use client';

import { useState, useCallback } from 'react';

interface UseDialogStateOptions {
  controlledOpen?: boolean;
  controlledOnOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function useDialogState({
  controlledOpen,
  controlledOnOpenChange,
  onClose,
}: UseDialogStateOptions = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        onClose?.();
      }
    },
    [setOpen, onClose]
  );

  return { open, setOpen, handleOpenChange };
}
