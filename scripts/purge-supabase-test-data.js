#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Purge test data in Supabase while keeping:
 * - users: mhbutzke@gmail.com, jessicafbutzke@gmail.com
 * - trips: "Carnaval em Gramado", "Colombia"
 *
 * Default is dry-run. Use --apply to execute.
 *
 * Usage:
 *   node --env-file=.env scripts/purge-supabase-test-data.js
 *   node --env-file=.env scripts/purge-supabase-test-data.js --apply
 */

const { createClient } = require('@supabase/supabase-js');

const KEEP_EMAILS = ['mhbutzke@gmail.com', 'jessicafbutzke@gmail.com'].map((e) => e.toLowerCase());
const KEEP_TRIP_NAMES = ['Carnaval em Gramado', 'Colombia'];

const APPLY = process.argv.includes('--apply');

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function must(ok, msg) {
  if (!ok) die(msg);
}

async function listAllFilesRecursive(storage, bucket, dir) {
  const files = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    let offset = 0;
    const limit = 1000;

    // paginate at this "folder"
    for (;;) {
      const { data, error } = await storage.from(bucket).list(current, { limit, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const item of data) {
        const itemPath = current ? `${current}/${item.name}` : item.name;
        const isFile = item.metadata && typeof item.metadata.size === 'number';
        if (isFile) files.push(itemPath);
        else stack.push(itemPath);
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  return files;
}

async function removeStoragePrefix(supabase, bucket, prefix) {
  const files = await listAllFilesRecursive(supabase.storage, bucket, prefix);
  if (files.length === 0) return { removed: 0 };
  if (!APPLY) return { removed: 0, wouldRemove: files.length };

  let removed = 0;
  for (const batch of chunk(files, 100)) {
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw error;
    removed += batch.length;
  }
  return { removed };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  await must(
    supabaseUrl && serviceRoleKey,
    'Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env'
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: allUsers, error: usersErr } = await supabase.from('users').select('id,email,name');
  if (usersErr) throw usersErr;

  const keepUsers = (allUsers || []).filter((u) =>
    KEEP_EMAILS.includes((u.email || '').toLowerCase())
  );
  await must(
    keepUsers.length === KEEP_EMAILS.length,
    `Não encontrei todos os usuários para manter. Encontrados: ${keepUsers
      .map((u) => u.email)
      .join(', ')}`
  );

  const keepUserIds = uniq(keepUsers.map((u) => u.id));
  const deleteUsers = (allUsers || []).filter((u) => !keepUserIds.includes(u.id));
  const deleteUserIds = uniq(deleteUsers.map((u) => u.id));

  const { data: allTrips, error: tripsErr } = await supabase
    .from('trips')
    .select('id,name,destination,created_by');
  if (tripsErr) throw tripsErr;

  const keepTrips = (allTrips || []).filter((t) => KEEP_TRIP_NAMES.includes(t.name));
  await must(
    keepTrips.length === KEEP_TRIP_NAMES.length,
    `Não encontrei todas as viagens para manter. Encontradas: ${keepTrips.map((t) => t.name).join(', ')}`
  );

  const keepTripIds = uniq(keepTrips.map((t) => t.id));
  const deleteTrips = (allTrips || []).filter((t) => !keepTripIds.includes(t.id));
  const deleteTripIds = uniq(deleteTrips.map((t) => t.id));

  // Preflight: detect rows in KEEP trips that reference users we will delete (these can block auth user deletion).
  const preflight = {};
  async function countRows(table, buildQuery) {
    const q = buildQuery(supabase.from(table).select('id', { count: 'exact', head: true }));
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  }

  preflight.activities_nonKeepCreators = await countRows('activities', (q) =>
    q.in('trip_id', keepTripIds).not('created_by', 'in', `(${keepUserIds.join(',')})`)
  );
  preflight.expenses_nonKeepCreators = await countRows('expenses', (q) =>
    q.in('trip_id', keepTripIds).not('created_by', 'in', `(${keepUserIds.join(',')})`)
  );
  preflight.expenses_nonKeepPaidBy = await countRows('expenses', (q) =>
    q.in('trip_id', keepTripIds).not('paid_by', 'in', `(${keepUserIds.join(',')})`)
  );
  preflight.trip_notes_nonKeepCreators = await countRows('trip_notes', (q) =>
    q.in('trip_id', keepTripIds).not('created_by', 'in', `(${keepUserIds.join(',')})`)
  );
  preflight.settlements_involvingNonKeep = await countRows('settlements', (q) =>
    q
      .in('trip_id', keepTripIds)
      .or(`from_user.not.in.(${keepUserIds.join(',')}),to_user.not.in.(${keepUserIds.join(',')})`)
  );

  // Budgets/checklists/polls require IDs.
  const { data: keepBudgets } = await supabase
    .from('trip_budgets')
    .select('id,created_by')
    .in('trip_id', keepTripIds);
  preflight.trip_budgets_nonKeepCreators = (keepBudgets || []).filter(
    (b) => !keepUserIds.includes(b.created_by)
  ).length;

  const { data: keepChecklists } = await supabase
    .from('trip_checklists')
    .select('id,created_by')
    .in('trip_id', keepTripIds);
  const keepChecklistIds = (keepChecklists || []).map((c) => c.id);
  preflight.trip_checklists_nonKeepCreators = (keepChecklists || []).filter(
    (c) => !keepUserIds.includes(c.created_by)
  ).length;

  const { data: keepChecklistItems } = keepChecklistIds.length
    ? await supabase
        .from('checklist_items')
        .select('id,created_by,assigned_to,completed_by')
        .in('checklist_id', keepChecklistIds)
    : { data: [] };
  preflight.checklist_items_nonKeepCreators = (keepChecklistItems || []).filter(
    (i) => !keepUserIds.includes(i.created_by)
  ).length;
  preflight.checklist_items_assignedToNonKeep = (keepChecklistItems || []).filter(
    (i) => i.assigned_to && !keepUserIds.includes(i.assigned_to)
  ).length;
  preflight.checklist_items_completedByNonKeep = (keepChecklistItems || []).filter(
    (i) => i.completed_by && !keepUserIds.includes(i.completed_by)
  ).length;

  const { data: keepPolls } = await supabase
    .from('trip_polls')
    .select('id,created_by')
    .in('trip_id', keepTripIds);
  const keepPollIds = (keepPolls || []).map((p) => p.id);
  preflight.trip_polls_nonKeepCreators = (keepPolls || []).filter(
    (p) => !keepUserIds.includes(p.created_by)
  ).length;

  const { data: keepPollVotes } = keepPollIds.length
    ? await supabase.from('poll_votes').select('id,user_id').in('poll_id', keepPollIds)
    : { data: [] };
  preflight.poll_votes_byNonKeepUsers = (keepPollVotes || []).filter(
    (v) => !keepUserIds.includes(v.user_id)
  ).length;

  const { data: keepInvites } = await supabase
    .from('trip_invites')
    .select('id,invited_by,accepted_by')
    .in('trip_id', keepTripIds);
  preflight.trip_invites_invitedByNonKeep = (keepInvites || []).filter(
    (i) => !keepUserIds.includes(i.invited_by)
  ).length;
  preflight.trip_invites_acceptedByNonKeep = (keepInvites || []).filter(
    (i) => i.accepted_by && !keepUserIds.includes(i.accepted_by)
  ).length;

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'APPLY' : 'DRY_RUN',
        keep: {
          users: keepUsers.map((u) => ({ id: u.id, email: u.email, name: u.name })),
          trips: keepTrips.map((t) => ({ id: t.id, name: t.name, destination: t.destination })),
        },
        totals: { users: allUsers?.length || 0, trips: allTrips?.length || 0 },
        toDelete: { users: deleteUserIds.length, trips: deleteTripIds.length },
        preflightKeepTripRefs: preflight,
      },
      null,
      2
    )
  );

  if (!APPLY) return;

  // 1) Storage cleanup for trips/users being deleted (best-effort; does not block DB deletes).
  const storageSummary = { attachments: 0, receipts: 0, tripCovers: 0, avatars: 0 };
  for (const tripId of deleteTripIds) {
    storageSummary.attachments +=
      (await removeStoragePrefix(supabase, 'attachments', tripId)).removed || 0;
    storageSummary.receipts +=
      (await removeStoragePrefix(supabase, 'receipts', tripId)).removed || 0;
    storageSummary.tripCovers +=
      (await removeStoragePrefix(supabase, 'trip-covers', tripId)).removed || 0;
  }
  for (const userId of deleteUserIds) {
    storageSummary.avatars += (await removeStoragePrefix(supabase, 'avatars', userId)).removed || 0;
  }
  console.log(JSON.stringify({ storageRemoved: storageSummary }, null, 2));

  // 2) Delete trips (cascades to most trip data).
  for (const tripId of deleteTripIds) {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
  }

  // 3) Clean any remaining rows inside KEEP trips that reference users we will delete.
  // Delete rows where FK is NOT NULL and cannot be nulled safely.
  await supabase
    .from('activities')
    .delete()
    .in('trip_id', keepTripIds)
    .not('created_by', 'in', `(${keepUserIds.join(',')})`);
  await supabase
    .from('expenses')
    .delete()
    .in('trip_id', keepTripIds)
    .or(`created_by.not.in.(${keepUserIds.join(',')}),paid_by.not.in.(${keepUserIds.join(',')})`);
  await supabase
    .from('trip_notes')
    .delete()
    .in('trip_id', keepTripIds)
    .not('created_by', 'in', `(${keepUserIds.join(',')})`);
  await supabase
    .from('settlements')
    .delete()
    .in('trip_id', keepTripIds)
    .or(`from_user.not.in.(${keepUserIds.join(',')}),to_user.not.in.(${keepUserIds.join(',')})`);

  // Budgets
  await supabase
    .from('trip_budgets')
    .delete()
    .in('trip_id', keepTripIds)
    .not('created_by', 'in', `(${keepUserIds.join(',')})`);

  // Checklists: null out assign/completed when possible, delete items created by non-keep, delete checklists created by non-keep.
  if (keepChecklistIds.length) {
    await supabase
      .from('checklist_items')
      .update({ assigned_to: null })
      .in('checklist_id', keepChecklistIds)
      .not('assigned_to', 'is', null)
      .not('assigned_to', 'in', `(${keepUserIds.join(',')})`);
    await supabase
      .from('checklist_items')
      .update({ completed_by: null })
      .in('checklist_id', keepChecklistIds)
      .not('completed_by', 'is', null)
      .not('completed_by', 'in', `(${keepUserIds.join(',')})`);
    await supabase
      .from('checklist_items')
      .delete()
      .in('checklist_id', keepChecklistIds)
      .not('created_by', 'in', `(${keepUserIds.join(',')})`);
  }
  await supabase
    .from('trip_checklists')
    .delete()
    .in('trip_id', keepTripIds)
    .not('created_by', 'in', `(${keepUserIds.join(',')})`);

  // Polls/votes
  if (keepPollIds.length) {
    await supabase
      .from('poll_votes')
      .delete()
      .in('poll_id', keepPollIds)
      .not('user_id', 'in', `(${keepUserIds.join(',')})`);
  }
  await supabase
    .from('trip_polls')
    .delete()
    .in('trip_id', keepTripIds)
    .not('created_by', 'in', `(${keepUserIds.join(',')})`);

  // Invites: can null accepted_by; invited_by is NOT NULL, so delete those rows if inviter is non-keep.
  await supabase
    .from('trip_invites')
    .update({ accepted_by: null, accepted_at: null })
    .in('trip_id', keepTripIds)
    .not('accepted_by', 'is', null)
    .not('accepted_by', 'in', `(${keepUserIds.join(',')})`);
  await supabase
    .from('trip_invites')
    .delete()
    .in('trip_id', keepTripIds)
    .not('invited_by', 'in', `(${keepUserIds.join(',')})`);

  // Email logs are low-value operational logs; drop all to avoid orphaned test logs.
  await supabase.from('email_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 4) Delete auth users (cascades public.users and many dependent rows).
  // Prefer deleting by auth admin API.
  for (const userId of deleteUserIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  // 5) Final verification
  const { data: usersAfter, error: usersAfterErr } = await supabase
    .from('users')
    .select('id,email');
  if (usersAfterErr) throw usersAfterErr;
  const { data: tripsAfter, error: tripsAfterErr } = await supabase.from('trips').select('id,name');
  if (tripsAfterErr) throw tripsAfterErr;

  console.log(
    JSON.stringify(
      {
        after: {
          users: usersAfter?.map((u) => u.email) || [],
          trips: tripsAfter?.map((t) => t.name) || [],
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
