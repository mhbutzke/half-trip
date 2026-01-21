'use client';

import { useState } from 'react';
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
import { deleteActivity } from '@/lib/supabase/activities';
import type { ActivityWithCreator } from '@/lib/supabase/activities';

interface DeleteActivityDialogProps {
  activity: ActivityWithCreator | null;
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

      toast.success('Atividade excluída');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao excluir atividade');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir atividade</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a atividade{' '}
            <span className="font-medium text-foreground">&quot;{activity?.title}&quot;</span>? Esta
            ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
