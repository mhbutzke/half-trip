'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarSync, Link2, Unlink2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface GoogleCalendarSettingsProps {
  connected: boolean;
  googleEmail: string | null;
}

export function GoogleCalendarSettings({ connected, googleEmail }: GoogleCalendarSettingsProps) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        toast.error(payload?.error || 'Erro ao desconectar Google Agenda');
        return;
      }

      toast.success('Google Agenda desconectado');
      router.refresh();
    } catch {
      toast.error('Erro ao desconectar Google Agenda');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <CalendarSync className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Google Agenda</p>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta para sincronizar atividades do roteiro com seu calendário.
          </p>
          {connected && (
            <p className="text-xs text-muted-foreground">
              Conectado como {googleEmail || 'conta Google'}
            </p>
          )}
        </div>
      </div>

      {connected ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          loading={isDisconnecting}
        >
          <Unlink2 className="h-4 w-4" />
          Desconectar Google Agenda
        </Button>
      ) : (
        <Button type="button" variant="default" size="sm" asChild>
          <Link href="/api/google-calendar/connect?redirect=%2Fsettings">
            <Link2 className="h-4 w-4" />
            Conectar Google Agenda
          </Link>
        </Button>
      )}
    </div>
  );
}
