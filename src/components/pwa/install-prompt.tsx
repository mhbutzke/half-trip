'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    ) {
      return;
    }

    // Check if user dismissed prompt recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show again for 7 days
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-[45] md:bottom-4 md:left-auto md:right-4 md:w-96">
      <Card className="border-2 border-primary/20 bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Instalar Half Trip</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Instale o app para acesso rápido e use offline.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                Instalar
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
