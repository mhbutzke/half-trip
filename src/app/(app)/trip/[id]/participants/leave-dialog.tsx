'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
import { leaveTrip } from '@/lib/supabase/trips';

interface LeaveDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveDialog({ tripId, open, onOpenChange }: LeaveDialogProps) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      const result = await leaveTrip(tripId);
      if (result.error) {
        toast.error(result.error);
        onOpenChange(false);
      } else {
        toast.success('Você saiu da viagem');
        router.push('/trips');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sair da viagem</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja sair desta viagem? Você perderá acesso a todas as informações,
            incluindo roteiro, despesas e participantes. Suas despesas registradas serão mantidas
            para os outros participantes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isLeaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sair da viagem
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
