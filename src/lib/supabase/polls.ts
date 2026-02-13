'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';
import type { PollWithVotes, CreatePollInput } from '@/types/poll';
import type { Json } from '@/types/database';

type PollResult = { error?: string; success?: boolean; pollId?: string };

export async function createPoll(input: CreatePollInput): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Não autorizado' };

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('user_id', user.id)
    .single();
  if (!member) return { error: 'Você não é membro desta viagem' };

  if (input.options.length < 2) return { error: 'Adicione pelo menos 2 opções' };

  const options = input.options.map((text) => ({ text }));

  const { data: poll, error } = await supabase
    .from('trip_polls')
    .insert({
      trip_id: input.trip_id,
      question: input.question,
      options: options as unknown as Json,
      allow_multiple: input.allow_multiple ?? false,
      closes_at: input.closes_at || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/trip/${input.trip_id}`);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'poll',
    entityId: poll.id,
    metadata: { question: input.question },
  });

  return { success: true, pollId: poll.id };
}

export async function getTripPolls(tripId: string): Promise<PollWithVotes[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return [];

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();
  if (!member) return [];

  const { data: polls } = await supabase
    .from('trip_polls')
    .select(
      `
      *,
      users!trip_polls_created_by_fkey (id, name, avatar_url),
      poll_votes (id, user_id, option_index, created_at)
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (!polls) return [];

  const now = new Date();

  return polls.map(
    (poll: {
      options: Json;
      poll_votes: Array<{ id: string; user_id: string; option_index: number; created_at: string }>;
      closes_at: string | null;
      users: { id: string; name: string; avatar_url: string | null };
      [key: string]: unknown;
    }) => {
      const options = (poll.options as { text: string }[]) || [];
      const votes = poll.poll_votes || [];
      const voteCounts = options.map(
        (_, i: number) => votes.filter((v) => v.option_index === i).length
      );

      return {
        ...poll,
        options,
        votes,
        voteCounts,
        totalVotes: new Set(votes.map((v) => v.user_id)).size,
        userVotes: votes.filter((v) => v.user_id === user.id).map((v) => v.option_index),
        isClosed: poll.closes_at ? new Date(poll.closes_at) < now : false,
      } as unknown as PollWithVotes;
    }
  );
}

export async function votePoll(pollId: string, optionIndex: number): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Não autorizado' };

  // Verify poll exists and user is trip member
  const { data: poll } = await supabase
    .from('trip_polls')
    .select('id, trip_id, options, allow_multiple, closes_at')
    .eq('id', pollId)
    .single();

  if (!poll) return { error: 'Votação não encontrada' };

  // Check if closed
  if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
    return { error: 'Votação encerrada' };
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', poll.trip_id)
    .eq('user_id', user.id)
    .single();
  if (!member) return { error: 'Você não é membro desta viagem' };

  const options = poll.options as { text: string }[];
  if (optionIndex < 0 || optionIndex >= options.length) {
    return { error: 'Opção inválida' };
  }

  // If single-choice, remove existing votes first
  if (!poll.allow_multiple) {
    await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', user.id);
  }

  // Check if already voted for this option
  const { data: existingVote } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', user.id)
    .eq('option_index', optionIndex)
    .single();

  if (existingVote) {
    // Toggle: remove vote
    await supabase.from('poll_votes').delete().eq('id', existingVote.id);
  } else {
    // Add vote
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/trip/${poll.trip_id}`);
  return { success: true };
}

export async function deletePoll(pollId: string): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Não autorizado' };

  const { error } = await supabase.from('trip_polls').delete().eq('id', pollId);

  if (error) return { error: error.message };
  return { success: true };
}
