import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { error: deleteMappingsError } = await supabase
    .from('google_calendar_activity_syncs')
    .delete()
    .eq('user_id', user.id);

  if (deleteMappingsError) {
    return NextResponse.json({ error: deleteMappingsError.message }, { status: 500 });
  }

  const { error: deleteConnectionError } = await supabase
    .from('google_calendar_connections')
    .delete()
    .eq('user_id', user.id);

  if (deleteConnectionError) {
    return NextResponse.json({ error: deleteConnectionError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
