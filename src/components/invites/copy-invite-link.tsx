'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CopyInviteLinkProps {
  inviteUrl: string;
  tripName?: string;
}

export function CopyInviteLink({ inviteUrl, tripName }: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false);

  // Build full URL
  const fullUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${inviteUrl}` : inviteUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tripName ? `Convite para ${tripName}` : 'Convite de viagem',
          text: tripName
            ? `Você foi convidado para participar da viagem "${tripName}" no Half Trip!`
            : 'Você foi convidado para uma viagem no Half Trip!',
          url: fullUrl,
        });
      } catch (err) {
        // User cancelled or share failed - do nothing
        if (err instanceof Error && err.name !== 'AbortError') {
          toast.error('Erro ao compartilhar');
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={fullUrl}
        className="font-mono text-sm"
        onClick={(e) => e.currentTarget.select()}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCopy}
        aria-label="Copiar link"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleShare}
          aria-label="Compartilhar link"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
