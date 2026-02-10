'use client';

import { useState } from 'react';
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
import { deleteChecklist } from '@/lib/supabase/checklists';
import { toast } from 'sonner';
import type { ChecklistWithItems } from '@/types/checklist';

interface DeleteChecklistDialogProps {
  checklist: ChecklistWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteChecklistDialog({
  checklist,
  open,
  onOpenChange,
  onSuccess,
}: DeleteChecklistDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!checklist) return null;

  async function handleDelete() {
    if (!checklist) return;
    setIsDeleting(true);
    try {
      const result = await deleteChecklist(checklist.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Checklist excluída');
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir checklist</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{checklist.name}&quot; e todos os seus{' '}
            {checklist.totalCount} itens? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
