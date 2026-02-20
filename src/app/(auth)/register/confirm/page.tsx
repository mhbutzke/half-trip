'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';

import { resendConfirmation } from '@/lib/supabase/auth';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function ConfirmSkeleton() {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-sm">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-[var(--brand-sunset-coral)]"
        aria-hidden="true"
      />
      <CardHeader className="text-center">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-8 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    const result = await resendConfirmation(email);

    if (result.error) {
      setResendError(result.error);
    } else {
      setResendSuccess(true);
    }
    setIsResending(false);
  }

  const maskedEmail = email
    ? email.replace(
        /^(.{1,2})(.*)(@.*)$/,
        (_, start: string, middle: string, domain: string) =>
          start + '*'.repeat(Math.min(middle.length, 5)) + domain
      )
    : '';

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-sm">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-[var(--brand-sunset-coral)]"
        aria-hidden="true"
      />
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-in zoom-in duration-300">
          <Mail className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">Verifique seu email</CardTitle>
        <CardDescription className="mt-2">
          Enviamos um link de confirmação para{' '}
          {maskedEmail ? <strong>{maskedEmail}</strong> : 'seu email'}.
          <br />
          Clique no link para ativar sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>Não recebeu o email? Verifique sua pasta de spam ou clique abaixo para reenviar.</p>
        </div>

        {resendSuccess && (
          <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
            Email reenviado! Verifique sua caixa de entrada.
          </div>
        )}

        {resendError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {resendError}
          </div>
        )}

        {email && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isResending || resendSuccess}
            loading={isResending}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {resendSuccess ? 'Email reenviado' : 'Reenviar email de confirmação'}
          </Button>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href={routes.login()}
          className="flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function RegisterConfirmPage() {
  return (
    <Suspense fallback={<ConfirmSkeleton />}>
      <ConfirmContent />
    </Suspense>
  );
}
