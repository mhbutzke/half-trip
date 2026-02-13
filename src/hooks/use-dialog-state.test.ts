import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialogState } from './use-dialog-state';

describe('useDialogState', () => {
  // ---------------------------------------------------------------------------
  // Uncontrolled mode (no props)
  // ---------------------------------------------------------------------------
  describe('uncontrolled mode', () => {
    it('defaults to closed (open = false)', () => {
      const { result } = renderHook(() => useDialogState());

      expect(result.current.open).toBe(false);
    });

    it('opens when setOpen(true) is called', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setOpen(true);
      });

      expect(result.current.open).toBe(true);
    });

    it('closes when setOpen(false) is called', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setOpen(true);
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.setOpen(false);
      });
      expect(result.current.open).toBe(false);
    });

    it('opens when handleOpenChange(true) is called', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.handleOpenChange(true);
      });

      expect(result.current.open).toBe(true);
    });

    it('closes when handleOpenChange(false) is called', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.handleOpenChange(true);
      });

      act(() => {
        result.current.handleOpenChange(false);
      });

      expect(result.current.open).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Controlled mode
  // ---------------------------------------------------------------------------
  describe('controlled mode', () => {
    it('uses controlledOpen as the open value', () => {
      const { result } = renderHook(() =>
        useDialogState({
          controlledOpen: true,
          controlledOnOpenChange: vi.fn(),
        })
      );

      expect(result.current.open).toBe(true);
    });

    it('reflects changes to controlledOpen prop', () => {
      const onOpenChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ open }: { open: boolean }) =>
          useDialogState({
            controlledOpen: open,
            controlledOnOpenChange: onOpenChange,
          }),
        { initialProps: { open: false } }
      );

      expect(result.current.open).toBe(false);

      rerender({ open: true });
      expect(result.current.open).toBe(true);

      rerender({ open: false });
      expect(result.current.open).toBe(false);
    });

    it('calls controlledOnOpenChange when setOpen is called', () => {
      const onOpenChange = vi.fn();
      const { result } = renderHook(() =>
        useDialogState({
          controlledOpen: false,
          controlledOnOpenChange: onOpenChange,
        })
      );

      act(() => {
        result.current.setOpen(true);
      });

      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('calls controlledOnOpenChange when handleOpenChange is called', () => {
      const onOpenChange = vi.fn();
      const { result } = renderHook(() =>
        useDialogState({
          controlledOpen: true,
          controlledOnOpenChange: onOpenChange,
        })
      );

      act(() => {
        result.current.handleOpenChange(false);
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not use internal state when controlled', () => {
      const onOpenChange = vi.fn();
      const { result } = renderHook(() =>
        useDialogState({
          controlledOpen: false,
          controlledOnOpenChange: onOpenChange,
        })
      );

      // Even after calling setOpen, the open value should still reflect controlledOpen
      act(() => {
        result.current.setOpen(true);
      });

      // controlledOpen is still false, so open stays false
      expect(result.current.open).toBe(false);
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  // ---------------------------------------------------------------------------
  // onClose callback
  // ---------------------------------------------------------------------------
  describe('onClose callback', () => {
    it('calls onClose when handleOpenChange(false) is called (uncontrolled)', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useDialogState({ onClose }));

      act(() => {
        result.current.handleOpenChange(true);
      });

      act(() => {
        result.current.handleOpenChange(false);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClose when handleOpenChange(true) is called', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useDialogState({ onClose }));

      act(() => {
        result.current.handleOpenChange(true);
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when handleOpenChange(false) is called (controlled)', () => {
      const onClose = vi.fn();
      const onOpenChange = vi.fn();
      const { result } = renderHook(() =>
        useDialogState({
          controlledOpen: true,
          controlledOnOpenChange: onOpenChange,
          onClose,
        })
      );

      act(() => {
        result.current.handleOpenChange(false);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not call onClose when setOpen(false) is used directly', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useDialogState({ onClose }));

      act(() => {
        result.current.setOpen(true);
      });

      act(() => {
        result.current.setOpen(false);
      });

      // setOpen bypasses onClose; only handleOpenChange triggers it
      expect(onClose).not.toHaveBeenCalled();
    });

    it('works without onClose callback provided', () => {
      const { result } = renderHook(() => useDialogState());

      // Should not throw when closing without onClose
      act(() => {
        result.current.handleOpenChange(true);
      });

      act(() => {
        result.current.handleOpenChange(false);
      });

      expect(result.current.open).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('defaults to empty options when called with no arguments', () => {
      const { result } = renderHook(() => useDialogState());

      expect(result.current.open).toBe(false);
      expect(typeof result.current.setOpen).toBe('function');
      expect(typeof result.current.handleOpenChange).toBe('function');
    });

    it('treats controlledOpen=false as controlled (not undefined)', () => {
      const onOpenChange = vi.fn();
      const { result } = renderHook(() =>
        useDialogState({
          controlledOpen: false,
          controlledOnOpenChange: onOpenChange,
        })
      );

      act(() => {
        result.current.setOpen(true);
      });

      // Should call the controlled handler, not internal state
      expect(onOpenChange).toHaveBeenCalledWith(true);
      // open should still be false because controlledOpen hasn't changed
      expect(result.current.open).toBe(false);
    });

    it('calls onClose on every close via handleOpenChange', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useDialogState({ onClose }));

      // Open and close multiple times
      act(() => result.current.handleOpenChange(true));
      act(() => result.current.handleOpenChange(false));
      act(() => result.current.handleOpenChange(true));
      act(() => result.current.handleOpenChange(false));

      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});
