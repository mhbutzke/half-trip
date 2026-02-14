'use client';

import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <WifiOff className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold leading-none">Você está offline</h1>
          <CardDescription className="text-base">
            Parece que você perdeu a conexão com a internet. Algumas funcionalidades podem estar
            limitadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">O que você pode fazer:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Visualizar viagens já carregadas</li>
              <li>Ver despesas e balanços salvos</li>
              <li>Criar novas despesas (serão sincronizadas depois)</li>
            </ul>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
