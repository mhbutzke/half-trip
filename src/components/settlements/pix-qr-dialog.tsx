'use client';

import { useState, useEffect, useCallback } from 'react';
import { QrCode, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generatePixPayload, isValidPixKey, detectPixKeyType } from '@/lib/utils/pix';
import { MoneyDisplay } from '@/components/ui/money-display';

interface PixQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toUserName: string;
  amount: number;
  currency: string;
}

const pixKeyTypeLabels: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
};

export function PixQrDialog({
  open,
  onOpenChange,
  toUserName,
  amount,
  currency,
}: PixQrDialogProps) {
  const [pixKey, setPixKey] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isBrl = currency === 'BRL';

  const generateQr = useCallback(async () => {
    if (!isValidPixKey(pixKey)) {
      toast.error('Chave Pix inválida');
      return;
    }

    setIsGenerating(true);
    try {
      const pixPayload = generatePixPayload({
        key: pixKey.trim(),
        name: toUserName,
        city: 'Brasil',
        amount: isBrl ? amount : undefined,
        txId: `HT${Date.now().toString(36).toUpperCase()}`,
      });

      setPayload(pixPayload);

      const dataUrl = await QRCode.toDataURL(pixPayload, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);
    } catch {
      toast.error('Erro ao gerar QR Code');
    } finally {
      setIsGenerating(false);
    }
  }, [pixKey, toUserName, amount, isBrl]);

  const handleCopyPayload = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success('Código Pix copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQrDataUrl(null);
      setPayload(null);
      setCopied(false);
    }
  }, [open]);

  const keyType = pixKey ? detectPixKeyType(pixKey) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" aria-hidden="true" />
            Pagar via Pix
          </DialogTitle>
          <DialogDescription>
            Gere um QR Code Pix para pagar{' '}
            <strong>
              <MoneyDisplay amount={amount} currency={currency} size="sm" />
            </strong>{' '}
            para <strong>{toUserName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!qrDataUrl ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="pix-key">Chave Pix de {toUserName}</Label>
                <Input
                  id="pix-key"
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  autoComplete="off"
                />
                {keyType && (
                  <p className="text-xs text-muted-foreground">
                    Tipo detectado: {pixKeyTypeLabels[keyType] || keyType}
                  </p>
                )}
              </div>

              {!isBrl && (
                <p className="text-xs text-amber-600">
                  Como a moeda base não é BRL, o QR Code será gerado sem valor fixo. O pagador
                  definirá o valor manualmente.
                </p>
              )}

              <Button
                onClick={generateQr}
                disabled={!pixKey.trim() || isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR Code Pix para ${toUserName}`}
                  width={280}
                  height={280}
                />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Escaneie o QR Code com o app do seu banco
              </p>

              <div className="flex w-full gap-2">
                <Button variant="outline" onClick={handleCopyPayload} className="flex-1">
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar código'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQrDataUrl(null);
                    setPayload(null);
                  }}
                >
                  Nova chave
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
