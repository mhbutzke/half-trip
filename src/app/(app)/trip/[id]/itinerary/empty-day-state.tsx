'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyDayStateProps {
  dayNumber: number;
  onAddActivity: () => void;
}

export function EmptyDayState({ dayNumber, onAddActivity }: EmptyDayStateProps) {
  const messages = [
    { title: 'Comece a aventura!', subtitle: 'Adicione a primeira atividade deste dia.' },
    { title: 'Dia livre?', subtitle: 'Que tal planejar algo especial?' },
    { title: 'Ainda sem planos', subtitle: 'Adicione atividades para aproveitar o dia.' },
  ];
  const message = messages[(dayNumber - 1) % messages.length] || messages[0];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Illustration */}
      <div className="relative mb-4">
        <svg
          width="120"
          height="100"
          viewBox="0 0 120 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground/30"
          aria-hidden="true"
        >
          {/* Map/compass illustration */}
          <rect
            x="20"
            y="15"
            width="80"
            height="60"
            rx="8"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="60" cy="45" r="15" stroke="currentColor" strokeWidth="2" />
          <path d="M60 30L60 60" stroke="currentColor" strokeWidth="1.5" />
          <path d="M45 45L75 45" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="60" cy="45" r="3" fill="currentColor" opacity="0.5" />
          {/* Pin markers */}
          <circle cx="35" cy="30" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="85" cy="55" r="4" fill="currentColor" opacity="0.3" />
          <path d="M35 30L35 24" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          <path d="M85 55L85 49" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          {/* Dotted path between pins */}
          <path
            d="M39 28Q60 20 81 53"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.2"
          />
        </svg>
      </div>

      <h3 className="text-sm font-medium">{message.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{message.subtitle}</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={onAddActivity}>
        <Plus className="mr-1.5 h-4 w-4" />
        Adicionar atividade
      </Button>
    </div>
  );
}
