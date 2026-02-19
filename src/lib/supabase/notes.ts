'use server';

import { requireAuth, requireTripMember } from './auth-helpers';
import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';
import { canOnOwn } from '@/lib/permissions/trip-permissions';
import type { TripNote } from '@/types/database';

export type NoteResult = {
  error?: string;
  success?: boolean;
  noteId?: string;
};

export type NoteWithCreator = TripNote & {
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
};

export type CreateNoteInput = {
  trip_id: string;
  content: string;
};

export type UpdateNoteInput = {
  content: string;
};

/**
 * Creates a new note for a trip
 */
export async function createNote(input: CreateNoteInput): Promise<NoteResult> {
  const auth = await requireTripMember(input.trip_id);
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

  const { data: note, error } = await supabase
    .from('trip_notes')
    .insert({
      trip_id: input.trip_id,
      content: input.content,
      created_by: authUser.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidate.tripNotes(input.trip_id);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'note',
    entityId: note.id,
    metadata: { description: input.content.slice(0, 50) },
  });

  return { success: true, noteId: note.id };
}

/**
 * Updates an existing note
 */
export async function updateNote(noteId: string, input: UpdateNoteInput): Promise<NoteResult> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

  // Get the note to check trip membership and ownership
  const { data: note } = await supabase
    .from('trip_notes')
    .select('trip_id, created_by')
    .eq('id', noteId)
    .single();

  if (!note) {
    return { error: 'Nota não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', note.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Only the creator or organizers can edit a note
  if (!canOnOwn('EDIT', member.role, note.created_by === authUser.id)) {
    return { error: 'Você não tem permissão para editar esta nota' };
  }

  const { error } = await supabase
    .from('trip_notes')
    .update({
      content: input.content,
    })
    .eq('id', noteId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripNotes(note.trip_id);

  logActivity({
    tripId: note.trip_id,
    action: 'updated',
    entityType: 'note',
    entityId: noteId,
    metadata: { description: input.content.slice(0, 50) },
  });

  return { success: true, noteId };
}

/**
 * Deletes a note
 */
export async function deleteNote(noteId: string): Promise<NoteResult> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

  // Get the note to check trip membership and ownership
  const { data: note } = await supabase
    .from('trip_notes')
    .select('trip_id, created_by')
    .eq('id', noteId)
    .single();

  if (!note) {
    return { error: 'Nota não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', note.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Only the creator or organizers can delete a note
  if (!canOnOwn('DELETE', member.role, note.created_by === authUser.id)) {
    return { error: 'Você não tem permissão para excluir esta nota' };
  }

  const { error } = await supabase.from('trip_notes').delete().eq('id', noteId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripNotes(note.trip_id);

  logActivity({
    tripId: note.trip_id,
    action: 'deleted',
    entityType: 'note',
    entityId: noteId,
  });

  return { success: true };
}

/**
 * Gets all notes for a trip, ordered by creation date (newest first)
 */
export async function getTripNotes(tripId: string): Promise<NoteWithCreator[]> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return [];
  }
  const { supabase } = auth;

  const { data: notes } = await supabase
    .from('trip_notes')
    .select(
      `
      *,
      users!trip_notes_created_by_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (notes as NoteWithCreator[]) || [];
}

/**
 * Gets a single note by ID
 */
export async function getNoteById(noteId: string): Promise<NoteWithCreator | null> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return null;
  }
  const { supabase, user: authUser } = auth;

  // Get note with creator info
  const { data: note } = await supabase
    .from('trip_notes')
    .select(
      `
      *,
      users!trip_notes_created_by_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('id', noteId)
    .single();

  if (!note) {
    return null;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', note.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return null;
  }

  return note as NoteWithCreator;
}

/**
 * Gets notes count for a trip
 */
export async function getNotesCount(tripId: string): Promise<number> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return 0;
  }
  const { supabase } = auth;

  const { count } = await supabase
    .from('trip_notes')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}
