'use client';

import { useState } from 'react';
import { Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteCard } from '@/components/notes/note-card';
import { AddNoteDialog } from '@/components/notes/add-note-dialog';
import { EditNoteDialog } from '@/components/notes/edit-note-dialog';
import { DeleteNoteDialog } from '@/components/notes/delete-note-dialog';
import type { NoteWithCreator } from '@/lib/supabase/notes';
import type { TripMemberRole } from '@/types/database';

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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <StickyNote className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold">Nenhuma nota</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione informações importantes sobre a viagem
          </p>
          <AddNoteDialog
            tripId={tripId}
            onNoteCreated={handleNoteCreated}
            trigger={
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeira nota
              </Button>
            }
          />
        </div>
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
    </>
  );
}
