'use client';

import { useEffect } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/errors/logger';

/**
 * Error page for trip-related errors
 * Provides context-specific error handling for trip pages
 */
export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logError(error, { action: 'trip-error', digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Erro ao carregar viagem</CardTitle>
          </div>
          <CardDescription>
            Não foi possível carregar os dados da viagem. Por favor, tente novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium text-destructive">Erro:</p>
              <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
              {error.digest && (
                <p className="mt-1 text-xs text-muted-foreground">Digest: {error.digest}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
            <Button onClick={() => router.push('/trips')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para viagens
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
