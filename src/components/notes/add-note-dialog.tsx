'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createNoteSchema, type CreateNoteInput } from '@/lib/validation/note-schemas';
import { createNote, getNoteById, type NoteWithCreator } from '@/lib/supabase/notes';

interface AddNoteDialogProps {
  tripId: string;
  trigger?: React.ReactNode;
  onNoteCreated?: (note: NoteWithCreator) => void;
}

export function AddNoteDialog({ tripId, trigger, onNoteCreated }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      trip_id: tripId,
      content: '',
    },
  });

  const onSubmit = async (data: CreateNoteInput) => {
    setIsSubmitting(true);

    try {
      const result = await createNote(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Nota adicionada!');

      // Fetch the created note with user info
      if (result.noteId && onNoteCreated) {
        const note = await getNoteById(result.noteId);
        if (note) {
          onNoteCreated(note);
        }
      }

      setOpen(false);
      form.reset({
        trip_id: tripId,
        content: '',
      });
    } catch {
      toast.error('Erro ao adicionar nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        form.reset({
          trip_id: tripId,
          content: '',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar nota
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar nota</DialogTitle>
          <DialogDescription>
            Adicione informações importantes para todos os participantes.
          </DialogDescription>
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
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
