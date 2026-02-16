'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WelcomeSectionProps {
  userName: string;
  userAvatar?: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function WelcomeSection({ userName, userAvatar }: WelcomeSectionProps) {
  const [greeting, setGreeting] = useState('Olá');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setGreeting(getGreeting());
    });
  }, []);

  const firstName = userName.split(' ')[0];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-gradient-to-r from-primary/5 via-background to-background p-4 shadow-sm shadow-primary/5">
      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/10">
        <AvatarImage src={userAvatar || undefined} alt={userName} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold tracking-tight">
          {mounted ? greeting : 'Olá'}, {firstName}!
        </h2>
        <p className="text-sm text-muted-foreground">Pronto para planejar sua próxima aventura?</p>
      </div>
    </div>
  );
}
