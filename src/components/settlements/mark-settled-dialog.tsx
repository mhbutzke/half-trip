'use client';

import { useState } from 'react';
import { Check, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { markSettlementAsPaid } from '@/lib/supabase/settlements';
import { Button } from '@/components/ui/button';
import { MoneyDisplay } from '@/components/ui/money-display';
import { PixQrDialog } from './pix-qr-dialog';

interface MarkSettledDialogProps {
  settlementId: string;
  fromUserName: string;
  fromUserAvatar: string | null;
  toUserName: string;
  toUserAvatar: string | null;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MarkSettledDialog({
  settlementId,
  fromUserName,
  fromUserAvatar,
  toUserName,
  toUserAvatar,
  amount,
  open,
  onOpenChange,
  onSuccess,
}: MarkSettledDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const result = await markSettlementAsPaid(settlementId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Acerto marcado como pago!');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao marcar acerto como pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme que este pagamento foi realizado:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={fromUserAvatar || undefined} />
                <AvatarFallback>{getInitials(fromUserName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{fromUserName}</p>
                <p className="text-xs text-muted-foreground">deve pagar</p>
              </div>
            </div>

            <div className="my-3 flex items-center justify-center">
              <div className="rounded-md bg-primary/10 px-3 py-1.5">
                <MoneyDisplay amount={amount} size="lg" className="text-primary" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={toUserAvatar || undefined} />
                <AvatarFallback>{getInitials(toUserName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{toUserName}</p>
                <p className="text-xs text-muted-foreground">vai receber</p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPixDialogOpen(true);
              }}
            >
              <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
              Pagar via Pix
            </Button>
            <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marcando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Marcar como pago
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PixQrDialog
        open={pixDialogOpen}
        onOpenChange={setPixDialogOpen}
        toUserName={toUserName}
        amount={amount}
        currency="BRL"
      />
    </>
  );
}
