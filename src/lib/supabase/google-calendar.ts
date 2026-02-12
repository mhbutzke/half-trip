'use server';

import { createClient } from './server';

export type GoogleCalendarConnectionStatus = {
  connected: boolean;
  googleEmail: string | null;
};

export async function getGoogleCalendarConnectionStatus(): Promise<GoogleCalendarConnectionStatus> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      connected: false,
      googleEmail: null,
    };
  }

  const { data } = await supabase
    .from('google_calendar_connections')
    .select('google_email')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    connected: !!data,
    googleEmail: data?.google_email || null,
  };
}
