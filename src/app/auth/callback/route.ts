import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { routes } from '@/lib/routes';
import { sendWelcomeEmail } from '@/lib/email/send-welcome-email';
import { logError } from '@/lib/errors/logger';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const redirectTo = searchParams.get('redirect');

  const supabase = await createClient();

  // PKCE flow (password recovery, magic links via Supabase default)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}${routes.resetPassword()}`);
      }

      // If there's a redirect URL (e.g., from invite flow), use it
      if (redirectTo) {
        // Ensure the redirect is a relative path for security
        const safeRedirect = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
        return NextResponse.redirect(`${origin}${safeRedirect}`);
      }

      // Otherwise, redirect to trips page (main app)
      return NextResponse.redirect(`${origin}${routes.trips()}`);
    }
  }

  // Token hash flow (from admin.generateLink: signup confirmation, password recovery)
  if (tokenHash && type) {
    const otpType =
      type === 'signup'
        ? 'email'
        : type === 'recovery'
          ? 'recovery'
          : type === 'magiclink'
            ? 'magiclink'
            : (type as 'email');
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (!error) {
      // Fire-and-forget welcome email after successful signup/magiclink confirmation
      if ((type === 'signup' || type === 'magiclink') && data?.user) {
        const user = data.user;
        sendWelcomeEmail({
          userId: user.id,
          userName: user.user_metadata?.name || '',
          userEmail: user.email || '',
        }).catch((err) => logError(err, { action: 'send-welcome-email', userId: user.id }));
      }

      // Password recovery: redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}${routes.resetPassword()}`);
      }

      if (redirectTo) {
        const safeRedirect = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
        return NextResponse.redirect(`${origin}${safeRedirect}`);
      }
      return NextResponse.redirect(`${origin}${routes.trips()}`);
    }
  }

  // If there was an error or no code/token, redirect to login with error
  return NextResponse.redirect(`${origin}${routes.login()}?error=auth_error`);
}
