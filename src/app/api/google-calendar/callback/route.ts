import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCodeForTokens, getGoogleUserEmail } from '@/lib/google-calendar/google-api';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/routes';
import { safeEncryptToken } from '@/lib/crypto/token-encryption';

const STATE_COOKIE_NAME = 'gcal_oauth_state';
const REDIRECT_COOKIE_NAME = 'gcal_oauth_redirect';

function sanitizeRedirectPath(path: string | null): string {
  if (!path || !path.startsWith('/')) {
    return routes.settings();
  }

  return path;
}

function redirectWithStatus(request: NextRequest, path: string, status: string): NextResponse {
  const redirectUrl = new URL(path, request.nextUrl.origin);
  redirectUrl.searchParams.set('google_calendar', status);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(STATE_COOKIE_NAME);
  response.cookies.delete(REDIRECT_COOKIE_NAME);

  return response;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(routes.login(), request.nextUrl.origin));
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(STATE_COOKIE_NAME)?.value;
  const redirectPath = sanitizeRedirectPath(
    request.cookies.get(REDIRECT_COOKIE_NAME)?.value || null
  );

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithStatus(request, redirectPath, 'error');
  }

  try {
    const redirectUri = `${request.nextUrl.origin}${routes.api.googleCalendar.callback()}`;
    const tokens = await exchangeGoogleCodeForTokens({
      code,
      redirectUri,
    });

    const { data: existingConnection } = await supabase
      .from('google_calendar_connections')
      .select('refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    // Use new refresh_token from Google, or keep the existing encrypted one from DB
    const plainRefreshToken = tokens.refresh_token || null;
    const existingRefreshToken = existingConnection?.refresh_token || null;

    if (!plainRefreshToken && !existingRefreshToken) {
      return redirectWithStatus(request, redirectPath, 'error');
    }

    const googleEmail = await getGoogleUserEmail(tokens.access_token);
    const accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Encrypt tokens before storing (defense in depth against DB compromise)
    // If we have a new refresh token from Google, encrypt it. Otherwise keep existing (already encrypted).
    const encryptedRefreshToken = plainRefreshToken
      ? safeEncryptToken(plainRefreshToken)
      : existingRefreshToken!;

    const { error: upsertError } = await supabase.from('google_calendar_connections').upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        refresh_token: encryptedRefreshToken,
        access_token: safeEncryptToken(tokens.access_token),
        access_token_expires_at: accessTokenExpiresAt,
        scope: tokens.scope || null,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (upsertError) {
      return redirectWithStatus(request, redirectPath, 'error');
    }

    return redirectWithStatus(request, redirectPath, 'connected');
  } catch {
    return redirectWithStatus(request, redirectPath, 'error');
  }
}
