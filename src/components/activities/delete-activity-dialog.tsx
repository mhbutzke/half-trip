'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteActivity } from '@/lib/supabase/activities';
import type { Activity } from '@/types/database';

interface DeleteActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteActivityDialog({
  activity,
  open,
  onOpenChange,
  onSuccess,
}: DeleteActivityDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!activity) return;

    setIsDeleting(true);

    try {
      const result = await deleteActivity(activity.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Atividade excluída!');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao excluir atividade');
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
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Excluir atividade</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Tem certeza que deseja excluir{' '}
            {activity?.title ? (
              <>
                a atividade <strong>&quot;{activity.title}&quot;</strong>
              </>
            ) : (
              'esta atividade'
            )}
            ?
            <br />
            <br />
            Esta ação é <strong>irreversível</strong> e também irá excluir todos os anexos
            associados a esta atividade.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
