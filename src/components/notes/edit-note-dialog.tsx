'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { updateNoteSchema, type UpdateNoteInput } from '@/lib/validation/note-schemas';
import { updateNote, getNoteById, type NoteWithCreator } from '@/lib/supabase/notes';

interface EditNoteDialogProps {
  note: NoteWithCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteUpdated?: (note: NoteWithCreator) => void;
}

export function EditNoteDialog({ note, open, onOpenChange, onNoteUpdated }: EditNoteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateNoteInput>({
    resolver: zodResolver(updateNoteSchema),
    defaultValues: {
      content: '',
    },
  });

  // Update form when note changes
  useEffect(() => {
    if (note) {
      form.reset({
        content: note.content,
      });
    }
  }, [note, form]);

  const onSubmit = async (data: UpdateNoteInput) => {
    if (!note) return;

    setIsSubmitting(true);

    try {
      const result = await updateNote(note.id, data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Nota atualizada!');

      // Fetch the updated note with user info
      if (result.noteId && onNoteUpdated) {
        const updatedNote = await getNoteById(result.noteId);
        if (updatedNote) {
          onNoteUpdated(updatedNote);
        }
      }

      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar nota</DialogTitle>
          <DialogDescription>Edite o conteúdo da nota.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Não esquecer de levar protetor solar e repelente..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
