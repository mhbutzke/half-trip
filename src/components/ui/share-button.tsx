'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareButtonProps {
  title: string;
  text: string;
  path: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function ShareButton({
  title,
  text,
  path,
  variant = 'ghost',
  size = 'icon',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getFullUrl = () => {
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  };

  const handleShare = async () => {
    const url = getFullUrl();

    // Try native Web Share API first (mobile-first)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled or API failed - fall through to clipboard
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      aria-label={`Compartilhar: ${title}`}
      className={className}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      {size !== 'icon' && <span className="ml-2">{copied ? 'Copiado!' : 'Compartilhar'}</span>}
    </Button>
  );
}
