import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarRequest, refreshGoogleAccessToken } from '@/lib/google-calendar/google-api';
import { buildGoogleCalendarEvent } from '@/lib/google-calendar/event-payload';
import { normalizeSelectedActivityIds } from '@/lib/google-calendar/sync-selection';
import { createClient } from '@/lib/supabase/server';
import { safeDecryptToken, safeEncryptToken } from '@/lib/crypto/token-encryption';
import type { Activity, Tables } from '@/types/database';

type GoogleEventResponse = {
  id: string;
};

type ConnectionRow = Tables<'google_calendar_connections'>;

const GOOGLE_CALENDAR_ID = 'primary';
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

function getExpiryDateFromSeconds(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function isAccessTokenValid(connection: ConnectionRow): boolean {
  if (!connection.access_token || !connection.access_token_expires_at) {
    return false;
  }

  const expiresAt = new Date(connection.access_token_expires_at).getTime();
  const nowWithBuffer = Date.now() + 60 * 1000;

  return expiresAt > nowWithBuffer;
}

async function getValidAccessToken(connection: ConnectionRow, userId: string): Promise<string> {
  // Decrypt stored tokens (handles both encrypted and plaintext tokens during transition)
  const decryptedAccessToken = connection.access_token
    ? safeDecryptToken(connection.access_token)
    : null;
  const decryptedRefreshToken = safeDecryptToken(connection.refresh_token);

  if (isAccessTokenValid(connection) && decryptedAccessToken) {
    return decryptedAccessToken;
  }

  const refreshed = await refreshGoogleAccessToken(decryptedRefreshToken);
  const supabase = await createClient();

  // Re-encrypt tokens before storing
  const { error } = await supabase
    .from('google_calendar_connections')
    .update({
      access_token: safeEncryptToken(refreshed.access_token),
      access_token_expires_at: getExpiryDateFromSeconds(refreshed.expires_in),
      scope: refreshed.scope || connection.scope,
      refresh_token: refreshed.refresh_token
        ? safeEncryptToken(refreshed.refresh_token)
        : connection.refresh_token,
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return refreshed.access_token;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: string } | null;
  const tripId = body?.tripId;
  const selectedActivityIds = normalizeSelectedActivityIds(
    (body as { activityIds?: unknown } | null)?.activityIds
  );

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID é obrigatório' }, { status: 400 });
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Você não é membro desta viagem' }, { status: 403 });
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', tripId)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: 'Viagem não encontrada' }, { status: 404 });
  }

  let activitiesQuery = supabase
    .from('activities')
    .select('*')
    .eq('trip_id', tripId)
    .order('date', { ascending: true })
    .order('sort_order', { ascending: true });

  if (selectedActivityIds) {
    activitiesQuery = activitiesQuery.in('id', selectedActivityIds);
  }

  const { data: activities } = await activitiesQuery;

  if (!activities || activities.length === 0) {
    return NextResponse.json({ success: true, created: 0, updated: 0, failed: 0 });
  }

  const { data: connection } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json(
      {
        error: 'Conta Google não conectada',
        reconnectRequired: true,
      },
      { status: 400 }
    );
  }

  let accessToken = '';

  try {
    accessToken = await getValidAccessToken(connection, user.id);
  } catch {
    return NextResponse.json(
      {
        error: 'Não foi possível renovar sua sessão Google. Reconecte sua conta.',
        reconnectRequired: true,
      },
      { status: 400 }
    );
  }

  const activityIds = activities.map((activity) => activity.id);

  const { data: mappings } = await supabase
    .from('google_calendar_activity_syncs')
    .select('activity_id, google_event_id, calendar_id')
    .eq('user_id', user.id)
    .in('activity_id', activityIds);

  const mappingByActivityId = new Map(
    (mappings || []).map((mapping) => [mapping.activity_id, mapping])
  );

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const activity of activities as Activity[]) {
    const payload = buildGoogleCalendarEvent(activity, {
      tripName: trip.name,
      timezone: DEFAULT_TIMEZONE,
    });

    const existingMapping = mappingByActivityId.get(activity.id);

    if (existingMapping) {
      const patchResult = await googleCalendarRequest<GoogleEventResponse>({
        accessToken,
        method: 'PATCH',
        path: `/calendars/${encodeURIComponent(existingMapping.calendar_id)}/events/${encodeURIComponent(existingMapping.google_event_id)}`,
        body: payload,
      });

      if (patchResult.ok) {
        updated += 1;
        continue;
      }

      if (patchResult.status !== 404) {
        errors.push(`${activity.title}: ${patchResult.message}`);
        continue;
      }
    }

    const createResult = await googleCalendarRequest<GoogleEventResponse>({
      accessToken,
      method: 'POST',
      path: `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
      body: payload,
    });

    if (!createResult.ok) {
      errors.push(`${activity.title}: ${createResult.message}`);
      continue;
    }

    const { error: upsertMappingError } = await supabase
      .from('google_calendar_activity_syncs')
      .upsert(
        {
          user_id: user.id,
          activity_id: activity.id,
          google_event_id: createResult.data.id,
          calendar_id: GOOGLE_CALENDAR_ID,
        },
        {
          onConflict: 'user_id,activity_id',
        }
      );

    if (upsertMappingError) {
      errors.push(`${activity.title}: ${upsertMappingError.message}`);
      continue;
    }

    created += 1;
  }

  return NextResponse.json({
    success: errors.length === 0,
    created,
    updated,
    failed: errors.length,
    errors,
  });
}
