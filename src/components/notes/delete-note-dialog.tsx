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
import { deleteNote, type NoteWithCreator } from '@/lib/supabase/notes';

interface DeleteNoteDialogProps {
  note: NoteWithCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteDeleted?: (noteId: string) => void;
}

export function DeleteNoteDialog({
  note,
  open,
  onOpenChange,
  onNoteDeleted,
}: DeleteNoteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!note) return;

    setIsDeleting(true);

    try {
      const result = await deleteNote(note.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Nota excluída!');
      onOpenChange(false);
      onNoteDeleted?.(note.id);
    } catch {
      toast.error('Erro ao excluir nota');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  // Truncate note content for display
  const truncatedContent =
    note?.content && note.content.length > 100
      ? note.content.substring(0, 100) + '...'
      : note?.content;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Excluir nota</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Tem certeza que deseja excluir esta nota?
            {truncatedContent && (
              <span className="mt-2 block rounded-md bg-muted p-3 text-sm italic text-foreground">
                &quot;{truncatedContent}&quot;
              </span>
            )}
            <span className="mt-3 block">
              Esta ação é <strong>irreversível</strong>.
            </span>
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
