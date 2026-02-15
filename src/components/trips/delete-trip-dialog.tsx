'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteTrip } from '@/lib/supabase/trips';

interface DeleteTripDialogProps {
  tripId: string | null;
  tripName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteTripDialog({
  tripId,
  tripName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTripDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tripId) return;

    setIsDeleting(true);

    try {
      const result = await deleteTrip(tripId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Viagem excluída com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao excluir viagem');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Excluir viagem</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Tem certeza que deseja excluir{' '}
            {tripName ? (
              <>
                a viagem <strong>&quot;{tripName}&quot;</strong>
              </>
            ) : (
              'esta viagem'
            )}
            ?
            <br />
            <br />
            Esta ação é <strong>irreversível</strong>.
          </DialogDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Todos os itinerários e atividades</li>
            <li>Todas as despesas e divisões</li>
            <li>Todas as notas e anexos</li>
            <li>Todos os convites pendentes</li>
          </ul>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir viagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
