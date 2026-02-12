'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, StickyNote } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyNotesIllustration } from '@/components/illustrations';
import { NoteCard } from '@/components/notes/note-card';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import type { NoteWithCreator } from '@/lib/supabase/notes';
import type { TripMemberRole } from '@/types/database';

// Lazy load note dialogs - only needed when user interacts
const AddNoteDialog = dynamic(() =>
  import('@/components/notes/add-note-dialog').then((mod) => ({ default: mod.AddNoteDialog }))
);
const EditNoteDialog = dynamic(() =>
  import('@/components/notes/edit-note-dialog').then((mod) => ({ default: mod.EditNoteDialog }))
);
const DeleteNoteDialog = dynamic(() =>
  import('@/components/notes/delete-note-dialog').then((mod) => ({ default: mod.DeleteNoteDialog }))
);

interface NotesListProps {
  tripId: string;
  initialNotes: NoteWithCreator[];
  userRole: TripMemberRole | null;
  currentUserId: string;
}

export function NotesList({ tripId, initialNotes, userRole, currentUserId }: NotesListProps) {
  const [notes, setNotes] = useState<NoteWithCreator[]>(initialNotes);
  const [editingNote, setEditingNote] = useState<NoteWithCreator | null>(null);
  const [deletingNote, setDeletingNote] = useState<NoteWithCreator | null>(null);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);

  // Enable real-time updates for this trip
  useTripRealtime({ tripId });

  // Sync notes when initialNotes changes (from real-time updates)
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleNoteCreated = (newNote: NoteWithCreator) => {
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleNoteUpdated = (updatedNote: NoteWithCreator) => {
    setNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
    setEditingNote(null);
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    setDeletingNote(null);
  };

  const canEditNote = (note: NoteWithCreator) => {
    return userRole === 'organizer' || note.created_by === currentUserId;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notes.length === 0
            ? 'Nenhuma nota adicionada ainda'
            : `${notes.length} ${notes.length === 1 ? 'nota' : 'notas'}`}
        </p>
        <AddNoteDialog tripId={tripId} onNoteCreated={handleNoteCreated} />
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Nenhuma nota"
          description="Adicione informações importantes sobre a viagem, como horários de check-in, números de emergência ou dicas úteis"
          illustration={<EmptyNotesIllustration className="size-20" />}
          action={{
            label: 'Adicionar primeira nota',
            onClick: () => setAddNoteDialogOpen(true),
          }}
          tips={[
            'Anote horários de check-in, senhas de Wi-Fi e contatos úteis',
            'Todos os membros da viagem podem visualizar as notas',
          ]}
        />
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEditNote(note)}
              onEdit={() => setEditingNote(note)}
              onDelete={() => setDeletingNote(note)}
            />
          ))}
        </div>
      )}

      <AddNoteDialog
        tripId={tripId}
        onNoteCreated={handleNoteCreated}
        open={addNoteDialogOpen}
        onOpenChange={setAddNoteDialogOpen}
      />

      <EditNoteDialog
        note={editingNote}
        open={!!editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
        onNoteUpdated={handleNoteUpdated}
      />

      <DeleteNoteDialog
        note={deletingNote}
        open={!!deletingNote}
        onOpenChange={(open) => !open && setDeletingNote(null)}
        onNoteDeleted={handleNoteDeleted}
      />

      {/* Mobile FAB */}
      <FAB icon={Plus} label="Adicionar nota" onClick={() => setAddNoteDialogOpen(true)} />
    </>
  );
}
