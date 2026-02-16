'use client';

import { useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AvatarSelectorProps {
  participants: Participant[];
  selected: string;
  onSelect: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: { avatar: 'size-8', text: 'text-xs' },
  md: { avatar: 'size-10', text: 'text-sm' },
};

export function AvatarSelector({
  participants,
  selected,
  onSelect,
  size = 'md',
  className,
}: AvatarSelectorProps) {
  const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const s = sizeClasses[size];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentId: string) => {
      const idx = participants.findIndex((p) => p.id === currentId);
      let next = idx;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = (idx + 1) % participants.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = (idx - 1 + participants.length) % participants.length;
      } else return;

      const nextId = participants[next].id;
      onSelect(nextId);
      itemsRef.current.get(nextId)?.focus();
    },
    [participants, onSelect]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Selecionar participante"
      className={cn('flex gap-3 overflow-x-auto pb-1 scrollbar-none', className)}
    >
      {participants.map((p) => {
        const isSelected = p.id === selected;
        return (
          <button
            key={p.id}
            ref={(el) => {
              if (el) itemsRef.current.set(p.id, el);
              else itemsRef.current.delete(p.id);
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={p.name}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => handleKeyDown(e, p.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all min-w-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-75'
            )}
          >
            <Avatar
              className={cn(
                s.avatar,
                'transition-all shrink-0',
                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              {p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}
              <AvatarFallback className={s.text}>{getInitials(p.name)}</AvatarFallback>
            </Avatar>
            <span className={cn('max-w-20 truncate text-center', s.text)} title={p.name}>
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
