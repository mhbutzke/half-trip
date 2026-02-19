'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FAB } from '@/components/ui/fab';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyNotesIllustration } from '@/components/illustrations';
import { NoteCard } from '@/components/notes/note-card';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import { getTripNotesPaginated } from '@/lib/supabase/notes';
import type { NoteWithCreator } from '@/lib/supabase/notes';
import type { TripMemberRole } from '@/types/database';
import { usePermissions } from '@/hooks/use-permissions';

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
  initialHasMore: boolean;
  totalNotes: number;
  userRole: TripMemberRole | null;
  currentUserId: string;
}

export function NotesList({
  tripId,
  initialNotes,
  initialHasMore,
  totalNotes,
  userRole,
  currentUserId,
}: NotesListProps) {
  const permissions = usePermissions({ userRole, currentUserId });
  const [notes, setNotes] = useState<NoteWithCreator[]>(initialNotes);
  const [editingNote, setEditingNote] = useState<NoteWithCreator | null>(null);
  const [deletingNote, setDeletingNote] = useState<NoteWithCreator | null>(null);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(totalNotes);
  const [loading, setLoading] = useState(false);

  // Enable real-time updates for this trip
  useTripRealtime({ tripId });

  // Sync notes when initialNotes changes (from real-time updates)
  useEffect(() => {
    setNotes(initialNotes);
    setPage(0);
    setHasMore(initialHasMore);
    setTotal(totalNotes);
  }, [initialNotes, initialHasMore, totalNotes]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTripNotesPaginated(tripId, page + 1);
      setNotes((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setPage((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [tripId, page]);

  const handleNoteCreated = (newNote: NoteWithCreator) => {
    setNotes((prev) => [newNote, ...prev]);
    setTotal((prev) => prev + 1);
    // Reset pagination since a new note was added at the top
    setPage(0);
    setHasMore(initialHasMore);
  };

  const handleNoteUpdated = (updatedNote: NoteWithCreator) => {
    setNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
    setEditingNote(null);
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    setTotal((prev) => Math.max(0, prev - 1));
    setDeletingNote(null);
  };

  const canEditNote = (note: NoteWithCreator) => {
    return permissions.canOnOwn('EDIT', note.created_by);
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
        <>
          <div className="space-y-4 animate-in fade-in duration-200">
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
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Carregando...
                  </>
                ) : (
                  `Carregar mais (${notes.length} de ${total})`
                )}
              </Button>
            </div>
          )}
        </>
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
