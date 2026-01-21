import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const redirectTo = searchParams.get('redirect');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // If there's a redirect URL (e.g., from invite flow), use it
      if (redirectTo) {
        // Ensure the redirect is a relative path for security
        const safeRedirect = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
        return NextResponse.redirect(`${origin}${safeRedirect}`);
      }

      // Otherwise, redirect to trips page (main app)
      return NextResponse.redirect(`${origin}/trips`);
    }
  }

  // If there was an error or no code, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
