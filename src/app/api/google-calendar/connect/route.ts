import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildGoogleOAuthUrl } from '@/lib/google-calendar/google-api';
import { routes } from '@/lib/routes';

const STATE_COOKIE_NAME = 'gcal_oauth_state';
const REDIRECT_COOKIE_NAME = 'gcal_oauth_redirect';

function sanitizeRedirectPath(path: string | null): string {
  if (!path || !path.startsWith('/')) {
    return routes.settings();
  }

  return path;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(routes.login(), request.nextUrl.origin));
  }

  const redirectPath = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'));
  const state = randomUUID();
  const redirectUri = `${request.nextUrl.origin}${routes.api.googleCalendar.callback()}`;

  try {
    const authUrl = buildGoogleOAuthUrl({
      redirectUri,
      state,
    });

    const response = NextResponse.redirect(authUrl);
    const secure = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: state,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });

    response.cookies.set({
      name: REDIRECT_COOKIE_NAME,
      value: redirectPath,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });

    return response;
  } catch {
    const fallbackUrl = new URL(routes.settings(), request.nextUrl.origin);
    fallbackUrl.searchParams.set('google_calendar', 'missing_env');
    return NextResponse.redirect(fallbackUrl);
  }
}
