'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Command } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const APP_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Geral',
    shortcuts: [
      { key: '?', description: 'Mostrar atalhos de teclado' },
      { key: '/', modifiers: ['ctrl'], description: 'Mostrar atalhos de teclado' },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraGroups?: ShortcutGroup[];
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  extraGroups,
}: KeyboardShortcutsDialogProps) {
  const groups = extraGroups ? [...APP_SHORTCUTS, ...extraGroups] : APP_SHORTCUTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" aria-hidden="true" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Pressione <Badge variant="outline">?</Badge> para ver esta lista a qualquer momento
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-1.5">
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
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Global keyboard shortcuts listener.
 * Mount once at the app level. Opens the shortcuts dialog on ? or Ctrl+/
 */
export function useKeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore when typing in inputs/textareas
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    if (event.key === '?' || (event.ctrlKey && event.key === '/')) {
      event.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { open, setOpen };
}

function formatKey(key: string) {
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
}

function formatModifier(mod: string) {
  const modMap: Record<string, string> = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: '⇧',
    meta: '⌘',
  };
  return modMap[mod] || mod;
}
