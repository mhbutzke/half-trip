'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { unsubscribeFromEmail } from '@/lib/supabase/email-preferences';
import type { UnsubscribeTokenPayload } from '@/lib/email/unsubscribe-token';

interface UnsubscribeFormProps {
  payload: UnsubscribeTokenPayload;
}

export function UnsubscribeForm({ payload }: UnsubscribeFormProps) {
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleUnsubscribe = () => {
    startTransition(async () => {
      const result = await unsubscribeFromEmail(payload);

      if (result.success) {
        setIsUnsubscribed(true);
        toast.success('Inscrição cancelada com sucesso');
      } else {
        toast.error(result.error || 'Erro ao cancelar inscrição');
      }
    });
  };

  if (isUnsubscribed) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inscrição Cancelada</CardTitle>
          <CardDescription>Você não receberá mais este tipo de email.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Você pode reativar esta preferência a qualquer momento nas configurações.
          </p>
          <Button asChild>
            <Link href="/settings">Ir para Configurações</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Confirmar Cancelamento</CardTitle>
        <CardDescription>Tem certeza que deseja parar de receber estes emails?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleUnsubscribe}
          disabled={isPending}
          variant="destructive"
          className="w-full"
        >
          {isPending ? 'Cancelando...' : 'Sim, cancelar inscrição'}
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Não, manter inscrição</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
