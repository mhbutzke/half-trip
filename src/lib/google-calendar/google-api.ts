const GOOGLE_OAUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth environment variables. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.'
    );
  }

  return { clientId, clientSecret };
}

async function parseGoogleError(response: Response): Promise<string> {
  try {
    const errorPayload = (await response.json()) as {
      error?: string | { message?: string };
      error_description?: string;
      message?: string;
    };

    if (typeof errorPayload.error === 'string') {
      return errorPayload.error_description || errorPayload.error;
    }

    if (typeof errorPayload.error === 'object' && errorPayload.error?.message) {
      return errorPayload.error.message;
    }

    return errorPayload.message || 'Unknown Google API error';
  } catch {
    return `Google API request failed with status ${response.status}`;
  }
}

export function buildGoogleOAuthUrl(params: { redirectUri: string; state: string }): string {
  const { clientId } = getGoogleOAuthConfig();

  const url = new URL(GOOGLE_OAUTH_BASE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES.join(' '));
  url.searchParams.set('state', params.state);

  return url.toString();
}

export async function exchangeGoogleCodeForTokens(params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const body = new URLSearchParams();
  body.set('code', params.code);
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('redirect_uri', params.redirectUri);
  body.set('grant_type', 'authorization_code');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorMessage = await parseGoogleError(response);
    throw new Error(`Failed to exchange Google authorization code: ${errorMessage}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const body = new URLSearchParams();
  body.set('refresh_token', refreshToken);
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'refresh_token');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorMessage = await parseGoogleError(response);
    throw new Error(`Failed to refresh Google access token: ${errorMessage}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { email?: string };
  return payload.email || null;
}

export async function googleCalendarRequest<T>(params: {
  accessToken: string;
  method: 'POST' | 'PATCH';
  path: string;
  body: unknown;
}): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${params.path}`, {
    method: params.method,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.body),
  });

  if (!response.ok) {
    const message = await parseGoogleError(response);
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as T;
  return { ok: true, data };
}
