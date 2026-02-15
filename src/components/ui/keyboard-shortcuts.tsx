'use client';

import { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Command } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

export function KeyboardShortcuts({ shortcuts, enabled = true }: KeyboardShortcutsProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Show shortcuts dialog with ? or Ctrl+/
      if (event.key === '?' || (event.ctrlKey && event.key === '/')) {
        event.preventDefault();
        setShowDialog(true);
        return;
      }

      if (!enabled) return;

      shortcuts.forEach((shortcut) => {
        const hasModifiers = shortcut.modifiers && shortcut.modifiers.length > 0;

        // Check if no modifiers are required and none are pressed
        const noModifiersMatch =
          !hasModifiers && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;

        // Check if all required modifiers are pressed (and no extra ones)
        const hasRequiredModifiers = hasModifiers
          ? shortcut.modifiers!.every((mod) => {
              if (mod === 'ctrl') return event.ctrlKey;
              if (mod === 'alt') return event.altKey;
              if (mod === 'shift') return event.shiftKey;
              if (mod === 'meta') return event.metaKey;
              return false;
            }) &&
            // Ensure no extra modifiers are pressed
            shortcut.modifiers!.includes('ctrl') === event.ctrlKey &&
            shortcut.modifiers!.includes('alt') === event.altKey &&
            shortcut.modifiers!.includes('shift') === event.shiftKey &&
            shortcut.modifiers!.includes('meta') === event.metaKey
          : false;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (noModifiersMatch || hasRequiredModifiers)
        ) {
          event.preventDefault();
          // Dispatch custom event for the shortcut
          window.dispatchEvent(
            new CustomEvent('keyboard-shortcut', {
              detail: { key: shortcut.key, modifiers: shortcut.modifiers },
            })
          );
        }
      });
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress, enabled]);

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      arrowup: '↑',
      arrowdown: '↓',
      arrowleft: '←',
      arrowright: '→',
      enter: '↵',
      escape: 'Esc',
      backspace: '⌫',
    };

    return keyMap[key.toLowerCase()] || key.toUpperCase();
  };

  const formatModifier = (mod: string) => {
    const modMap: Record<string, string> = {
      ctrl: 'Ctrl',
      alt: 'Alt',
      shift: '⇧',
      meta: '⌘',
    };

    return modMap[mod] || mod;
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Atalhos de teclado
            </DialogTitle>
            <DialogDescription>
              Pressione <Badge variant="outline">?</Badge> ou{' '}
              <Badge variant="outline">Ctrl + /</Badge> para ver esta lista novamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.modifiers?.map((mod, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                      {formatModifier(mod)}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formatKey(shortcut.key)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to listen for keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
) {
  useEffect(() => {
    const handleShortcut = (event: Event) => {
      const customEvent = event as CustomEvent<{
        key: string;
        modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
      }>;

      const modifiersMatch =
        JSON.stringify(customEvent.detail.modifiers?.sort()) === JSON.stringify(modifiers?.sort());

      if (customEvent.detail.key.toLowerCase() === key.toLowerCase() && modifiersMatch) {
        callback();
      }
    };

    window.addEventListener('keyboard-shortcut', handleShortcut);
    return () => window.removeEventListener('keyboard-shortcut', handleShortcut);
  }, [key, callback, modifiers]);
}
