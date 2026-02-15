import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
  variant?: 'card' | 'inline';
}

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Ocorreu um erro ao carregar os dados.',
  error,
  onRetry,
  className,
  variant = 'card',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  const content = (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {errorMessage && (
            <p className="text-xs text-destructive/80 mt-2 font-mono bg-destructive/5 p-2 rounded">
              {errorMessage}
            </p>
          )}
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </div>
    </>
  );

  if (variant === 'inline') {
    return <div className={cn('py-8', className)}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardContent className="py-8">{content}</CardContent>
    </Card>
  );
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Erro Inesperado
          </CardTitle>
          <CardDescription>
            A aplicação encontrou um erro e não pôde continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/5 p-4">
            <p className="text-sm font-mono text-destructive">{error.message}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Ir para início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
