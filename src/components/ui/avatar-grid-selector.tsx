'use client';

import { Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface AvatarGridSelectorProps {
  participants: Participant[];
  selected: string[];
  onToggle: (id: string) => void;
  columns?: number;
  className?: string;
}

export function AvatarGridSelector({
  participants,
  selected,
  onToggle,
  columns = 4,
  className,
}: AvatarGridSelectorProps) {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      className={cn('grid gap-3', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="group"
      aria-label="Selecionar participantes"
    >
      {participants.map((p) => {
        const isSelected = selected.includes(p.id);

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all duration-150 active:scale-95',
              isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/50 hover:bg-muted'
            )}
            aria-pressed={isSelected}
          >
            <div className="relative">
              <Avatar className={cn('h-10 w-10', !isSelected && 'opacity-60')}>
                <AvatarImage src={p.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{getInitials(p.name)}</AvatarFallback>
              </Avatar>
              {isSelected && (
                <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            <span className="max-w-14 truncate text-xs font-medium">{p.name.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
